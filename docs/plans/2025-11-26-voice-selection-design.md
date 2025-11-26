# Voice Selection Feature Design

**Date:** 2025-11-26
**Status:** Approved

## Overview

Allow hosts to select the AI voice used during games. The selected voice is stored in `games.metadata` and read by the display app when initializing the Gemini Live API connection.

## Voice Options

| Voice | Description |
|-------|-------------|
| Puck | Friendly, conversational |
| Charon | Deep, authoritative |
| Kore | Neutral, professional (current default) |
| Fenrir | Warm, approachable |
| Aoede | Bright, energetic |
| Leda | Calm, measured |
| Orus | Bold, commanding |
| Zephyr | Light, airy |

## UI Design

### Voice Accordion Component

New `VoiceAccordion.tsx` component following `TimersAccordion` pattern:
- Accordion section labeled "Voice" with speaker icon
- Placed after Timers section in Create Game dialog
- Radio button or card-based selection for 8 voices
- Each voice shows: name, description, play button for preview
- Default: "Kore"

### Audio Preview

- Play button next to each voice option
- Click to play sample, click again or select another to stop
- HTML5 Audio API for playback
- Visual indicator for currently playing voice

## Data Model

### GameMetadata Extension

```typescript
export interface GameMetadata {
  // ... existing timer fields ...
  ai_voice?: string;  // Voice name for AI host (default: 'Kore')
}
```

### Storage

- Field: `games.metadata.ai_voice`
- Type: string (voice name)
- Default: 'Kore' if not specified

## Data Flow

### Save Flow
1. `GameEditModal` includes `ai_voice` in form state (default: 'Kore')
2. On save, `ai_voice` added to metadata object
3. Stored in games.metadata JSON field

### Read Flow
1. Display app subscribes to game record via `DisplayContext`
2. `AIHostController` reads `gameRecord.metadata.ai_voice`
3. Passes voice name to `GeminiLiveClient` constructor
4. `setupSession()` uses dynamic voice instead of hardcoded "Kore"

## Audio Samples

### Location
`public/voices/` directory:
- `puck.mp3`
- `charon.mp3`
- `kore.mp3`
- `fenrir.mp3`
- `aoede.mp3`
- `leda.mp3`
- `orus.mp3`
- `zephyr.mp3`

### Content
Short samples (~3-5 seconds) generated via Gemini API with sample phrase:
"Welcome to Trivia Party! I'm your host, and I'm excited to get started!"

## Files to Modify

### Main App (trivia-party)
1. `src/types/games.ts` - Add `ai_voice` to GameMetadata
2. `src/components/games/VoiceAccordion.tsx` - New component
3. `src/components/games/GameEditModal.tsx` - Add VoiceAccordion, include ai_voice in form state
4. `public/voices/*.mp3` - 8 audio sample files

### Display App (trivia-party-display)
1. `src/lib/geminiLiveClient.ts` - Accept voice parameter, use in setupSession
2. `src/lib/aiHostController.ts` - Read voice from gameRecord.metadata, pass to GeminiLiveClient
3. `src/components/GameDisplay.tsx` - Pass gameRecord to AIHostController for metadata access
