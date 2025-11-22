/// <reference path="../pb_data/types.d.ts" />

// Track worker state
let isProcessing = false;

// Helper: Get Gemini API keys from environment
function getGeminiApiKeys() {
  const keysJson = __env.get('GEMINI_API_KEYS') || '[]';
  try {
    const keys = JSON.parse(keysJson);
    if (!Array.isArray(keys) || keys.length === 0) {
      console.error('[AudioGen] No Gemini API keys configured');
      return [];
    }
    return keys;
  } catch (e) {
    console.error('[AudioGen] Failed to parse GEMINI_API_KEYS:', e);
    return [];
  }
}

// Helper: Call Gemini TTS API with 30-second timeout
async function generateAudio(text, apiKey) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('API request timeout after 30 seconds')), 30000);
  });

  // Create fetch promise
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: { text: text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-C'
      },
      audioConfig: {
        audioEncoding: 'MP3'
      }
    })
  });

  // Race between fetch and timeout
  const response = await Promise.race([fetchPromise, timeoutPromise]);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.audioContent; // base64 encoded MP3
}

// API endpoint: POST /api/games/:id/generate-audio
routerAdd("POST", "/api/games/{id}/generate-audio", (e) => {
  const gameId = e.request.pathValue("id");

  // Get auth record from request (PocketBase automatically parses Authorization header)
  const authRecord = e.auth;

  if (!authRecord) {
    return e.json(403, { error: "Authentication required" });
  }

  try {
    // Verify game exists and user is host
    const game = e.app.findRecordById("games", gameId);
    if (!game) {
      return e.json(404, { error: "Game not found" });
    }

    if (game.getString("host") !== authRecord.id) {
      return e.json(403, { error: "Only game host can generate audio" });
    }

    // Verify game status is "setup"
    if (game.getString("status") !== "setup") {
      return e.json(400, { error: "Audio can only be generated during game setup" });
    }

    // Check for existing pending/processing job (idempotency)
    const existingJobs = e.app.findRecordsByFilter(
      "audio_generation_jobs",
      `game = {:gameId} && (status = "pending" || status = "processing")`,
      "-created",
      1,
      0,
      { gameId }
    );

    if (existingJobs.length > 0) {
      const existingJob = existingJobs[0];
      return e.json(409, {
        error: "Job already in progress",
        job_id: existingJob.id,
        status: existingJob.getString("status"),
        progress: existingJob.getInt("progress")
      });
    }

    // Count total game_questions for this game
    const gameQuestions = e.app.findRecordsByFilter(
      "game_questions",
      `game = {:gameId}`,
      "",
      -1,
      0,
      { gameId }
    );

    const totalQuestions = gameQuestions.length;

    if (totalQuestions === 0) {
      return e.json(400, { error: "No questions found for this game" });
    }

    // Create job record
    const jobsCollection = e.app.findCollectionByNameOrId("audio_generation_jobs");
    const jobRecord = new Record(jobsCollection);

    jobRecord.set("game", gameId);
    jobRecord.set("status", "pending");
    jobRecord.set("progress", 0);
    jobRecord.set("total_questions", totalQuestions);
    jobRecord.set("processed_questions", 0);
    jobRecord.set("failed_questions", []);
    jobRecord.set("current_api_key_index", 0);

    e.app.save(jobRecord);

    return e.json(202, {
      job_id: jobRecord.id,
      status: "pending",
      total_questions: totalQuestions
    });

  } catch (err) {
    console.error('[AudioGen] Error creating job:', err);
    return e.json(500, { error: "Failed to create audio generation job" });
  }
});

// Start worker on app initialization
onBootstrap((e) => {
  console.log('[AudioGen] Starting background worker');

  // NOTE: PocketBase JSVM does not support setTimeout/setInterval (no event loop)
  // cronAdd is the only way to schedule recurring tasks, but has 1-minute minimum
  // For sub-minute scheduling, would need to implement in Go
  // See: https://pocketbase.io/docs/js-overview/ and https://github.com/pocketbase/pocketbase/discussions/3535
  cronAdd("audioGenerationWorker", "* * * * *", async () => {
    // Try to reset any stuck jobs (will be empty most of the time)
    try {
      const stuckJobs = $app.findRecordsByFilter(
        "audio_generation_jobs",
        `status = "processing"`,
        "",
        -1,
        0
      );

      if (stuckJobs && stuckJobs.length > 0) {
        for (const job of stuckJobs) {
          const form = new RecordUpsertForm($app, job);
          form.load({ status: "pending" });
          form.submit();
          console.log(`[AudioGen] Reset stuck job ${job.id} to pending`);
        }
      }
    } catch (err) {
      // Silently ignore stuck job recovery errors
    }

    // Process pending jobs - inline implementation
    if (isProcessing) {
      console.log('[AudioGen] Worker already processing, skipping this interval');
      return; // Already processing, skip this interval
    }

    try {
      isProcessing = true;
      console.log('[AudioGen] Worker checking for pending jobs...');

      // Find oldest pending job
      const pendingJobs = $app.findRecordsByFilter(
        "audio_generation_jobs",
        `status = "pending"`,
        "+created",
        1,
        0
      );

      console.log(`[AudioGen] Found ${pendingJobs.length} pending job(s)`);

      if (pendingJobs.length === 0) {
        return; // No pending jobs
      }

      const job = pendingJobs[0];
      const gameId = job.getString("game");

      console.log(`[AudioGen] Processing job ${job.id} for game ${gameId}`);

      // Update job status to processing
      const jobForm = new RecordUpsertForm($app, job);
      jobForm.load({ status: "processing" });
      jobForm.submit();

      // Get API keys
      const apiKeys = getGeminiApiKeys();
      console.log(`[AudioGen] Retrieved ${apiKeys.length} API key(s)`);
      if (apiKeys.length === 0) {
        throw new Error("No Gemini API keys available");
      }

      let currentKeyIndex = job.getInt("current_api_key_index");
      console.log(`[AudioGen] Current API key index: ${currentKeyIndex}`);
      const failedQuestions = [];

      // Get all game_questions for this game
      const gameQuestions = $app.findRecordsByFilter(
        "game_questions",
        `game = {:gameId}`,
        "round_order,order",
        -1,
        0,
        { gameId }
      );

      console.log(`[AudioGen] Found ${gameQuestions.length} game question(s) for game ${gameId}`);

      let processedCount = job.getInt("processed_questions");
      console.log(`[AudioGen] Starting from processed count: ${processedCount}`);

      // Process each question
      for (let i = 0; i < gameQuestions.length; i++) {
        const gameQuestion = gameQuestions[i];
        console.log(`[AudioGen] Processing question ${i + 1}/${gameQuestions.length} (ID: ${gameQuestion.id})`);

        // Skip if already has audio
        const audioStatus = gameQuestion.getString("audio_status");
        console.log(`[AudioGen] Question ${gameQuestion.id} audio status: ${audioStatus}`);
        if (audioStatus === "available") {
          console.log(`[AudioGen] Skipping question ${gameQuestion.id} - audio already available`);
          processedCount++;
          continue;
        }

        try {
          // Update status to generating
          console.log(`[AudioGen] Setting question ${gameQuestion.id} status to 'generating'`);
          const gqForm = new RecordUpsertForm($app, gameQuestion);
          gqForm.load({ audio_status: "generating" });
          gqForm.submit();

          // Get question text
          const questionId = gameQuestion.getString("question");
          console.log(`[AudioGen] Fetching question text for question ID: ${questionId}`);
          const question = $app.findRecordById("questions", questionId);
          const questionText = question.getString("text");
          console.log(`[AudioGen] Question text (first 50 chars): ${questionText.substring(0, 50)}...`);

          // Try to generate audio with retry logic
          let audioContent = null;
          let attempts = 0;
          let lastError = null;

          console.log(`[AudioGen] Starting audio generation attempts for question ${gameQuestion.id}`);
          while (attempts < 3 && audioContent === null) {
            try {
              const apiKey = apiKeys[currentKeyIndex % apiKeys.length];
              console.log(`[AudioGen] Attempt ${attempts + 1}/3 using API key index ${currentKeyIndex % apiKeys.length}`);
              audioContent = await generateAudio(questionText, apiKey);
              console.log(`[AudioGen] Successfully generated audio (${audioContent.length} bytes)`);
            } catch (err) {
              lastError = err;
              attempts++;
              console.error(`[AudioGen] Attempt ${attempts} failed:`, err.message);

              // If rate limit, rotate immediately
              if (err.message.includes("429")) {
                console.log(`[AudioGen] Rate limit detected, rotating API key`);
                currentKeyIndex++;
              } else {
                // For other errors, try next key
                console.log(`[AudioGen] Error detected, trying next API key`);
                currentKeyIndex++;
              }

              // Update job with new key index
              const updateForm = new RecordUpsertForm($app, job);
              updateForm.load({ current_api_key_index: currentKeyIndex });
              updateForm.submit();
              console.log(`[AudioGen] Updated job API key index to ${currentKeyIndex}`);
            }
          }

          if (audioContent) {
            console.log(`[AudioGen] Decoding and saving audio file for question ${gameQuestion.id}`);
            // Decode base64 and save as file
            const audioBytes = atob(audioContent);
            const audioArray = new Uint8Array(audioBytes.length);
            for (let i = 0; i < audioBytes.length; i++) {
              audioArray[i] = audioBytes.charCodeAt(i);
            }
            const filename = `${gameQuestion.id}.mp3`;
            console.log(`[AudioGen] Decoded audio file: ${filename} (${audioArray.length} bytes)`);

            // Create form with file
            const fileForm = new RecordUpsertForm($app, gameQuestion);
            const fileData = new FormData();
            fileData.append('audio_file', new Blob([audioArray], { type: 'audio/mpeg' }), filename);
            fileData.append('audio_status', 'available');
            fileForm.loadFormData(fileData);
            fileForm.submit();

            console.log(`[AudioGen] Successfully saved audio for question ${gameQuestion.id}`);
          } else {
            // Failed after all retries
            const errorMsg = lastError?.message || "Unknown error";
            console.error(`[AudioGen] Failed to generate audio after 3 attempts for question ${gameQuestion.id}:`, errorMsg);
            const gqErrorForm = new RecordUpsertForm($app, gameQuestion);
            gqErrorForm.load({
              audio_status: "failed",
              audio_error: errorMsg.substring(0, 255)
            });
            gqErrorForm.submit();

            failedQuestions.push({
              game_question_id: gameQuestion.id,
              error_message: errorMsg
            });

            console.error(`[AudioGen] Marked question ${gameQuestion.id} as failed`);
          }

          processedCount++;

          // Update job progress
          const currentProgress = Math.floor((processedCount / gameQuestions.length) * 100);
          console.log(`[AudioGen] Updating job progress: ${processedCount}/${gameQuestions.length} (${currentProgress}%)`);
          const progressForm = new RecordUpsertForm($app, job);
          progressForm.load({
            processed_questions: processedCount,
            progress: currentProgress,
            failed_questions: failedQuestions
          });
          progressForm.submit();
          console.log(`[AudioGen] Job progress updated successfully`);

        } catch (err) {
          console.error(`[AudioGen] Unexpected error processing question ${gameQuestion.id}:`, err);
          console.error(`[AudioGen] Error stack:`, err.stack);

          // Mark as failed and continue
          const gqErrorForm = new RecordUpsertForm($app, gameQuestion);
          gqErrorForm.load({
            audio_status: "failed",
            audio_error: err.message.substring(0, 255)
          });
          gqErrorForm.submit();

          failedQuestions.push({
            game_question_id: gameQuestion.id,
            error_message: err.message
          });

          processedCount++;

          const progressForm = new RecordUpsertForm($app, job);
          progressForm.load({
            processed_questions: processedCount,
            progress: Math.floor((processedCount / gameQuestions.length) * 100),
            failed_questions: failedQuestions
          });
          progressForm.submit();
          console.log(`[AudioGen] Marked question ${gameQuestion.id} as failed and updated progress`);
        }
      }

      // Mark job as complete or failed
      const finalStatus = failedQuestions.length > 0 ? "failed" : "completed";
      console.log(`[AudioGen] Marking job ${job.id} as ${finalStatus}`);
      const finalForm = new RecordUpsertForm($app, job);
      finalForm.load({ status: finalStatus });
      finalForm.submit();

      console.log(`[AudioGen] Job ${job.id} ${finalStatus} (${processedCount}/${gameQuestions.length} processed, ${failedQuestions.length} failed)`);

    } catch (err) {
      console.error('[AudioGen] Worker error:', err);
      console.error('[AudioGen] Worker error stack:', err.stack);
    } finally {
      console.log('[AudioGen] Worker finished processing, setting isProcessing = false');
      isProcessing = false;
    }
  });

  // Continue bootstrap process
  e.next();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getGeminiApiKeys, generateAudio };
}
