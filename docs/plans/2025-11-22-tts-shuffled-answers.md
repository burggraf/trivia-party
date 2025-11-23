# TTS Audio with Shuffled Answers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modify TTS audio generation to include question text followed by all 4 answers in shuffled order matching the /game page display.

**Architecture:** Port the seeded shuffle algorithm from `src/lib/answerShuffler.ts` into `pb_hooks/audio_generation.pb.js`. Use the `game_questions.key` field as seed to ensure identical shuffle order between frontend display and backend audio generation.

**Tech Stack:** PocketBase JSVM hooks, Google Cloud Text-to-Speech API, deterministic Fisher-Yates shuffle with xorshift PRNG.

---

## Task 1: Add Shuffle Helper Functions

**Files:**
- Modify: `pb_hooks/audio_generation.pb.js:93-99` (before cronAdd)

**Step 1: Add seededRandom function**

Insert at line 93 (before the `cronAdd` call):

```javascript
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
```

**Step 2: Verify syntax**

Run: `cd pb_hooks && node -c audio_generation.pb.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add pb_hooks/audio_generation.pb.js
git commit -m "feat(audio): add seededRandom function for deterministic shuffle"
```

---

## Task 2: Add Shuffle Function

**Files:**
- Modify: `pb_hooks/audio_generation.pb.js:118` (after seededRandom)

**Step 1: Add seededShuffle function**

Insert after the `seededRandom` function:

```javascript
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
```

**Step 2: Verify syntax**

Run: `cd pb_hooks && node -c audio_generation.pb.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add pb_hooks/audio_generation.pb.js
git commit -m "feat(audio): add seededShuffle function for deterministic answer ordering"
```

---

## Task 3: Add Audio Text Builder Function

**Files:**
- Modify: `pb_hooks/audio_generation.pb.js:135` (after seededShuffle)

**Step 1: Add buildAudioText function**

Insert after the `seededShuffle` function:

```javascript
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
```

**Step 2: Verify syntax**

Run: `cd pb_hooks && node -c audio_generation.pb.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add pb_hooks/audio_generation.pb.js
git commit -m "feat(audio): add buildAudioText function for question+answer formatting"
```

---

## Task 4: Update Worker to Fetch All Answer Fields

**Files:**
- Modify: `pb_hooks/audio_generation.pb.js:286-290` (question fetching in worker loop)

**Step 1: Modify question fetching code**

Find this block around line 286-290:

```javascript
// Get question text
const questionId = gameQuestion.getString("question");
console.log(`[AudioGen] Fetching question text for question ID: ${questionId}`);
const question = $app.findRecordById("questions", questionId);
const questionText = question.getString("question");
console.log(`[AudioGen] Question text (first 50 chars): ${questionText.substring(0, 50)}...`);
```

Replace with:

```javascript
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
```

**Step 2: Verify syntax**

Run: `cd pb_hooks && node -c audio_generation.pb.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add pb_hooks/audio_generation.pb.js
git commit -m "feat(audio): fetch all answer fields and shuffle key from database"
```

---

## Task 5: Update Audio Generation to Use Full Text

**Files:**
- Modify: `pb_hooks/audio_generation.pb.js:301` (generateAudio call in retry loop)

**Step 1: Build and use full audio text**

Find this line around line 301 inside the retry loop:

```javascript
audioContent = await generateAudio(questionText, apiKey);
```

Replace the entire retry loop section (lines 293-308) with:

```javascript
// Build full audio text with shuffled answers
const fullAudioText = buildAudioText(questionText, answerA, answerB, answerC, answerD, key);
console.log(`[AudioGen] Full audio text (first 150 chars): ${fullAudioText.substring(0, 150)}...`);
console.log(`[AudioGen] Full audio text length: ${fullAudioText.length} chars`);

// Try to generate audio with retry logic
let audioContent = null;
let attempts = 0;
let lastError = null;

console.log(`[AudioGen] Starting audio generation attempts for question ${gameQuestion.id}`);
while (attempts < 3 && audioContent === null) {
  try {
    console.log(`[AudioGen] Attempt ${attempts + 1}/3`);
    audioContent = await generateAudio(fullAudioText, apiKey);
    console.log(`[AudioGen] Successfully generated audio (${audioContent.length} bytes)`);
  } catch (err) {
    lastError = err;
    attempts++;
    console.error(`[AudioGen] Attempt ${attempts} failed:`, err.message);
  }
}
```

**Step 2: Verify syntax**

Run: `cd pb_hooks && node -c audio_generation.pb.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add pb_hooks/audio_generation.pb.js
git commit -m "feat(audio): generate TTS audio with question and shuffled answers"
```

---

## Task 6: Test Audio Generation

**Files:**
- Test: Manual testing via PocketBase UI and game interface

**Step 1: Start PocketBase**

Run: `pocketbase serve --dev --http 0.0.0.0:8090`
Expected: Server starts on port 8090

**Step 2: Create test game with questions**

1. Navigate to web app (http://localhost:5173 or run `./dev.sh`)
2. Log in as admin@example.com / Password123
3. Create a new game
4. Add at least 2 questions to the game
5. Note the game ID from the URL

**Step 3: Trigger audio generation**

1. In the game setup page, click "Generate Audio" button
2. Wait for audio generation to complete
3. Check PocketBase logs for debug output

**Step 4: Verify debug logs**

Expected log output should include:
```
[AudioGen] Shuffle key: <15-character-key>
[AudioGen] Full audio text (first 150 chars): <question>? A. <answer>. B. <answer>. C. <answer>. D. <answer>...
[AudioGen] Full audio text length: <number> chars
```

**Step 5: Test audio playback**

1. Navigate to the game controller page
2. Start the game
3. Play the audio for a question
4. Verify the audio reads: question text followed by A, B, C, D answers

**Step 6: Verify answer order matches display**

1. On the `/game` page, note the order of answers displayed (A, B, C, D positions)
2. Listen to the audio and note the order spoken
3. Confirm they match exactly

**Step 7: Document test results**

Create a test note with:
- Game ID tested
- Question ID tested
- Shuffle key used
- Answer order on screen vs audio
- Any discrepancies found

---

## Task 7: Commit Design Document

**Files:**
- Add: `docs/plans/2025-11-22-tts-shuffled-answers-design.md` (already created)

**Step 1: Commit design document**

```bash
git add docs/plans/2025-11-22-tts-shuffled-answers-design.md
git commit -m "docs: add TTS shuffled answers design document"
```

---

## Task 8: Create Pull Request

**Files:**
- N/A (git operation)

**Step 1: Push branch**

```bash
git push -u origin feature/tts-shuffled-answers
```

**Step 2: Create PR**

Run:
```bash
gh pr create --title "feat(audio): TTS audio includes question and shuffled answers" --body "$(cat <<'EOF'
## Summary
- Modified TTS audio generation to include question text followed by all 4 multiple choice answers
- Answers are read in the same shuffled order as displayed on the /game page
- Ported shuffle algorithm from frontend to backend for consistency
- Uses game_questions.key field as shuffle seed to guarantee order matching

## Implementation Details
- Added seededRandom() and seededShuffle() functions (ported from answerShuffler.ts)
- Added buildAudioText() to format question + shuffled answers
- Modified worker to fetch all answer fields and shuffle key
- Updated generateAudio() call to use complete formatted text
- Added debug logging for shuffle key and full audio text

## Audio Format
Natural speech pattern: "Question? A. Answer. B. Answer. C. Answer. D. Answer."

## Testing
- Manual testing confirmed answer order matches between audio and display
- Debug logs verify shuffle key consistency
- Audio generation completes successfully with no errors

## Related
- Design doc: docs/plans/2025-11-22-tts-shuffled-answers-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Expected: PR created with URL returned

**Step 3: Record PR URL**

Save the PR URL for reference.

---

## Verification Checklist

After implementation, verify:

- [ ] Audio includes question text
- [ ] Audio includes all 4 answers
- [ ] Answers in audio match /game page display order
- [ ] Natural speech format with proper punctuation
- [ ] Debug logs show shuffle key
- [ ] Debug logs show full audio text
- [ ] No errors during audio generation
- [ ] Build succeeds with no new errors
- [ ] PocketBase hook syntax is valid

## Notes

- The shuffle algorithm is deterministic (xorshift PRNG with Fisher-Yates)
- Same seed (game_questions.key) always produces same shuffle order
- Frontend and backend now use identical algorithm
- No schema changes required
- No frontend changes required
- Audio format uses periods for natural TTS pauses
