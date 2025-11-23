/// <reference path="../pb_data/types.d.ts" />

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

// ===== SHUFFLE HELPERS (ported from src/lib/answerShuffler.ts) =====

/**
 * A simple seeded random number generator (xorshift)
 * This ensures the same seed always produces the same sequence of "random" numbers
 * Ported from src/lib/answerShuffler.ts to maintain shuffle consistency
 */
function seededRandom(seed) {
  // Convert string seed to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use xorshift algorithm for deterministic randomness
  let x = hash || 1; // Ensure non-zero seed

  return function() {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xFFFFFFFF; // Convert to [0, 1) float
  };
}

/**
 * Fisher-Yates shuffle using seeded random number generator
 * Ported from src/lib/answerShuffler.ts
 */
function seededShuffle(array, seed) {
  const shuffled = [...array];
  const random = seededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Build audio text with question and shuffled answers
 * Format: "Question? A. Answer. B. Answer. C. Answer. D. Answer."
 *
 * @param questionText - The question text
 * @param answerA - Answer A (always correct in original order)
 * @param answerB - Answer B
 * @param answerC - Answer C
 * @param answerD - Answer D
 * @param key - Secure shuffle key from game_questions.key field
 * @returns Formatted text for TTS with shuffled answers
 */
function buildAudioText(questionText, answerA, answerB, answerC, answerD, key) {
  // Validate inputs
  if (!key) {
    console.warn('[AudioGen] Missing shuffle key, using original order');
    // Fall back to original order if no key
    const labels = ['A', 'B', 'C', 'D'];
    const answers = [
      answerA || "No answer provided",
      answerB || "No answer provided",
      answerC || "No answer provided",
      answerD || "No answer provided"
    ];
    let text = questionText.trim();
    if (!text.endsWith('?')) {
      text += '?';
    }
    for (let i = 0; i < 4; i++) {
      text += ` ${labels[i]}. ${answers[i]}.`;
    }
    return text;
  }

  // Original answers array (answer_a is always correct)
  const originalAnswers = [
    answerA || "No answer provided",
    answerB || "No answer provided",
    answerC || "No answer provided",
    answerD || "No answer provided"
  ];

  // Shuffle indices using secure key as seed
  const shuffledIndices = seededShuffle([0, 1, 2, 3], key);
  const labels = ['A', 'B', 'C', 'D'];

  // Add question mark if not present
  let text = questionText.trim();
  if (!text.endsWith('?')) {
    text += '?';
  }

  // Append shuffled answers with labels
  for (let i = 0; i < shuffledIndices.length; i++) {
    const answerText = originalAnswers[shuffledIndices[i]];
    text += ` ${labels[i]}. ${answerText}.`;
  }

  return text;
}

// ===== END SHUFFLE HELPERS =====

// Start worker on app initialization
onBootstrap((e) => {
  console.log('[AudioGen] Starting background worker');

  // NOTE: PocketBase JSVM does not support setTimeout/setInterval (no event loop)
  // cronAdd is the only way to schedule recurring tasks, but has 1-minute minimum
  // For sub-minute scheduling, would need to implement in Go
  // See: https://pocketbase.io/docs/js-overview/ and https://github.com/pocketbase/pocketbase/discussions/3535
  cronAdd("audioGenerationWorker", "* * * * *", async () => {
    console.log('[AudioGen] ===== CRON CALLBACK STARTED =====');
    console.log('[AudioGen] About to check stuck jobs');

    // Helper: Get Google Cloud API key from settings (accessing at runtime when cron executes)
    function getGoogleCloudApiKey() {
      // Access directly from process environment using $app
      const apiKey = $app.settings().meta.google_cloud_api_key || process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        console.error('[AudioGen] No Google Cloud API key configured in settings or environment');
        return null;
      }

      console.log('[AudioGen] Loaded Google Cloud API key');
      return apiKey;
    }

    // Helper: Decode base64 string to byte array (server-side compatible)
    function base64ToBytes(base64) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

      // Remove padding and whitespace
      base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');

      const bytes = [];
      let i = 0;
      while (i < base64.length) {
        const enc1 = chars.indexOf(base64[i++]);
        const enc2 = chars.indexOf(base64[i++]);
        const enc3 = chars.indexOf(base64[i++]);
        const enc4 = chars.indexOf(base64[i++]);

        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;

        bytes.push(chr1);
        if (enc3 !== -1) bytes.push(chr2);
        if (enc4 !== -1) bytes.push(chr3);
      }

      return new Uint8Array(bytes);
    }


    // Helper: Call Google Cloud TTS API using PocketBase HTTP client
    async function generateAudio(text, apiKey) {
      const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

      // Use PocketBase's $http.send() with Google Cloud TTS API
      const response = $http.send({
        url: url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text: text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Standard-J'  // Standard voice (lower cost)
          },
          audioConfig: {
            audioEncoding: 'MP3'
          }
        })
      });

      if (response.statusCode !== 200) {
        throw new Error(`Google Cloud TTS API error ${response.statusCode}: ${response.raw}`);
      }

      const data = JSON.parse(response.raw);

      // Extract audio from Google Cloud TTS response format
      if (data.audioContent) {
        return data.audioContent; // base64 encoded MP3
      }
      throw new Error('No audio data in Google Cloud TTS response');
    }

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
          form.load({
            status: "pending",
            progress: 0,
            processed_questions: 0
          });
          form.submit();
          console.log(`[AudioGen] Reset stuck job ${job.id} to pending with cleared progress`);
        }
      }
    } catch (err) {
      // Silently ignore stuck job recovery errors
      console.log('[AudioGen] Stuck job recovery error (ignored)');
    }

    console.log('[AudioGen] Stuck job recovery complete');

    // Process pending jobs - inline implementation
    console.log('[AudioGen] Starting pending job processing...');

    try {
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

      // Get API key (loaded dynamically when job runs)
      const apiKey = getGoogleCloudApiKey();
      if (!apiKey) {
        throw new Error("No Google Cloud API key available");
      }

      const failedQuestions = [];

      // Get all game_questions for this game
      const gameQuestions = $app.findRecordsByFilter(
        "game_questions",
        `game = {:gameId}`,
        "sequence",
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

          // Get question with all answers
          const questionId = gameQuestion.getString("question");
          console.log(`[AudioGen] Fetching question data for question ID: ${questionId}`);
          const question = $app.findRecordById("questions", questionId);
          const questionText = question.getString("question");
          const answerA = question.getString("answer_a");
          const answerB = question.getString("answer_b");
          const answerC = question.getString("answer_c");
          const answerD = question.getString("answer_d");
          const key = gameQuestion.getString("key");

          console.log(`[AudioGen] Question text (first 50 chars): ${questionText.substring(0, 50)}...`);
          console.log(`[AudioGen] Shuffle key: ${key}`);

          // Try to generate audio with retry logic
          let audioContent = null;
          let attempts = 0;
          let lastError = null;

          console.log(`[AudioGen] Starting audio generation attempts for question ${gameQuestion.id}`);
          while (attempts < 3 && audioContent === null) {
            try {
              console.log(`[AudioGen] Attempt ${attempts + 1}/3`);
              audioContent = await generateAudio(questionText, apiKey);
              console.log(`[AudioGen] Successfully generated audio (${audioContent.length} bytes)`);
            } catch (err) {
              lastError = err;
              attempts++;
              console.error(`[AudioGen] Attempt ${attempts} failed:`, err.message);
            }
          }

          if (audioContent) {
            console.log(`[AudioGen] Decoding and saving audio file for question ${gameQuestion.id}`);
            // Decode base64 MP3 data
            const mp3Data = base64ToBytes(audioContent);
            console.log(`[AudioGen] Decoded MP3 data: ${mp3Data.length} bytes`);
            const filename = `${gameQuestion.id}.mp3`;
            console.log(`[AudioGen] MP3 file: ${filename} (${mp3Data.length} bytes)`);

            // Write MP3 file to temporary location
            const tempPath = `/tmp/audio_gen_${filename}`;
            $os.writeFile(tempPath, mp3Data, 0o644);

            // Use newer PocketBase v0.23+ API - files are set directly on the record
            gameQuestion.set('audio_file', $filesystem.fileFromPath(tempPath));
            gameQuestion.set('audio_status', 'available');
            $app.save(gameQuestion);

            // Clean up temp file
            $os.remove(tempPath);

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

          // Update job progress (cap at 99 to avoid validation errors)
          const currentProgress = Math.min(99, Math.floor((processedCount / gameQuestions.length) * 100));
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
            progress: Math.min(99, Math.floor((processedCount / gameQuestions.length) * 100)),
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
      console.log('[AudioGen] Worker finished processing');
    }
  });

  // Continue bootstrap process
  e.next();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getGoogleCloudApiKey, generateAudio };
}
