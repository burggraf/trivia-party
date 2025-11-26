/**
 * Generate voice sample audio files for all Gemini voices
 *
 * Usage: node scripts/generate-voice-samples.js
 *
 * Requires GEMINI_API_KEY environment variable
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const VOICES = [
  { id: 'Puck', name: 'ethan' },
  { id: 'Charon', name: 'logan' },
  { id: 'Kore', name: 'ava' },
  { id: 'Fenrir', name: 'noah' },
  { id: 'Aoede', name: 'olivia' },
  { id: 'Leda', name: 'sophia' },
  { id: 'Orus', name: 'liam' },
  { id: 'Zephyr', name: 'mia' },
];

const SAMPLE_TEXT = "Welcome to Trivia Party! I'm your host, and I'm excited to get this game started!";

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'voices');

async function generateVoiceSample(voiceId, fileName, apiKey) {
  // Use the TTS-enabled model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{
      parts: [{ text: SAMPLE_TEXT }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceId
          }
        }
      }
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error) {
            reject(new Error(`API error: ${response.error.message}`));
            return;
          }

          // Extract audio data from response
          const parts = response.candidates?.[0]?.content?.parts || [];
          const audioPart = parts.find(p => p.inlineData?.mimeType?.startsWith('audio/'));

          if (!audioPart) {
            reject(new Error('No audio data in response'));
            return;
          }

          // Decode base64 audio (raw PCM 24kHz mono 16-bit signed LE)
          const audioData = Buffer.from(audioPart.inlineData.data, 'base64');
          const rawPath = path.join(OUTPUT_DIR, `${fileName}.raw`);
          const outputPath = path.join(OUTPUT_DIR, `${fileName}.mp3`);

          // Save raw PCM first
          fs.writeFileSync(rawPath, audioData);

          // Convert to MP3 using ffmpeg
          try {
            execSync(`ffmpeg -y -f s16le -ar 24000 -ac 1 -i "${rawPath}" -codec:a libmp3lame -qscale:a 2 "${outputPath}"`, { stdio: 'pipe' });
            fs.unlinkSync(rawPath); // Remove raw file
            console.log(`✓ Generated ${fileName}.mp3 (${voiceId})`);
          } catch (ffmpegErr) {
            console.error(`✗ ffmpeg conversion failed for ${fileName}: ${ffmpegErr.message}`);
            fs.unlinkSync(rawPath);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is required');
    console.error('Usage: GEMINI_API_KEY=your-key node scripts/generate-voice-samples.js');
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Generating voice samples...\n');
  console.log(`Sample text: "${SAMPLE_TEXT}"\n`);

  for (const voice of VOICES) {
    try {
      await generateVoiceSample(voice.id, voice.name, apiKey);
      // Longer delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (err) {
      console.error(`✗ Failed to generate ${voice.name}.mp3 (${voice.id}): ${err.message}`);
    }
  }

  console.log('\nDone!');
}

main();
