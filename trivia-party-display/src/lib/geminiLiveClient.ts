/**
 * WebSocket client for Google Gemini Live API
 *
 * Handles:
 * - Session token fetching from PocketBase
 * - WebSocket connection to Gemini Live API
 * - Audio streaming (24kHz PCM output)
 * - Connection state management
 * - Automatic reconnection
 */

import pb from './pocketbase';
import type {
  GeminiSessionToken,
  GeminiSetupMessage,
  GeminiClientContentMessage,
  GeminiServerMessage,
  ConnectionState
} from '@/types/gemini';

// Personality trait definitions - kept minimal and extreme for clear differentiation
const PERSONALITY_TRAITS: Record<string, string> = {
  classic: `YOUR PERSONALITY: Classic Game Show Host
- Warm, professional energy
- Build tension before reveals with phrases like "and the answer is..."
- Genuine reactions - celebrate wins, encourage after losses
- Keep a balanced, welcoming tone throughout`,

  hype: `YOUR PERSONALITY: MAXIMUM HYPE
- You are INCREDIBLY excited about EVERYTHING
- Every correct answer deserves phrases like "OH YES!" "INCREDIBLE!" "WHAT A PLAY!"
- Wrong answers? "SO CLOSE! But that's okay because THIS GAME IS AMAZING!"
- Your energy should be almost overwhelming - like a sports commentator in overtime
- Use lots of emphasis and exclamation
- Never be calm - even reading the question should sound thrilling`,

  dry: `YOUR PERSONALITY: Bone Dry Delivery
- Speak in a flat, almost bored tone
- NEVER sound excited, even for correct answers
- React to correct answers with: "yep" "that's the one" "mm-hmm, correct"
- React to wrong answers with: "nope" "not quite" "that's incorrect"
- When reading questions, sound like you're reading a grocery list
- If something exciting happens, underreact dramatically: "oh. a tie. how about that."
- Your lack of enthusiasm IS the humor - commit to it fully`,

  roast: `YOUR PERSONALITY: Playful Roaster
- Tease teams (gently) when they get answers wrong
- Use phrases like: "Really? That's what you went with?" "Ooh, swing and a miss there"
- Mock disappointment: "I had such high hopes for you" "And here I thought we had trivia champions"
- When they get it right, act surprised: "Wait, you actually got that one?" "Well well well, look who's been studying"
- Keep it fun and friendly - think Comedy Central roast, not mean-spirited
- The teams should laugh, not feel bad`,
};

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying: boolean = false;
  private nextPlayTime: number = 0; // Scheduled playback time
  private activeSources: AudioBufferSourceNode[] = []; // Track for interruption
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private ignoreAudioUntilNewTurn: boolean = false; // Ignore old audio after interrupt
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  // Callbacks
  onStateChange: ((state: ConnectionState) => void) | null = null;
  onError: ((error: Error) => void) | null = null;

  constructor(
    private gameId: string,
    private voiceName: string = 'Kore',
    private personality: string = 'classic',
    private hostName: string = 'Ava'
  ) {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  private buildSystemInstruction(): string {
    const personalityTraits = PERSONALITY_TRAITS[this.personality] || PERSONALITY_TRAITS.classic;

    return `You are ${this.hostName}, the host of a trivia game.

CORE RESPONSIBILITIES:
- Present trivia questions clearly
- React to team answers with appropriate emotion
- Share interesting facts when relevant
- Maintain game energy and pace
- Congratulate winners, encourage others
- Keep responses concise (under 15 seconds unless reading questions)

NEVER SAY THESE THINGS:
- Stage directions like "pause for dramatic effect" or "emphasize with hand motion"
- Labels like "Fun fact:" or "Here's a fun fact" - just share the fact directly
- Meta-commentary about your delivery or performance
- Reading instructions or describing actions - only speak naturally

${personalityTraits}

Remember: Family-friendly language, respectful to all teams. Speak naturally - never read stage directions or announce what you're about to say.`;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[GeminiLive] Already connected');
      return;
    }

    try {
      this.setState('connecting');

      // Step 1: Request session token from PocketBase
      console.log('[GeminiLive] Requesting session token...');
      const tokenResponse = await fetch(`${pb.baseUrl}/api/gemini/session-token`, {
        method: 'POST',
        headers: {
          'Authorization': pb.authStore.token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ game_id: this.gameId })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.message || 'Failed to get session token');
      }

      const tokenData: GeminiSessionToken = await tokenResponse.json();
      console.log('[GeminiLive] Token received, connecting to Gemini...');

      // Step 2: Connect to Gemini Live API with API key in URL
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${tokenData.access_token}`;

      // Wait for WebSocket to actually open before resolving
      await new Promise<void>((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[GeminiLive] WebSocket opened');

          // Pre-warm AudioContext so it's ready for instant playback
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }

          // Setup session (no auth token needed, it's in URL)
          this.setupSession();

          // Mark as connected immediately - Gemini may not send setupComplete
          this.setState('connected');
          this.reconnectAttempts = 0;

          resolve();
        };

        this.ws.onmessage = async (event) => {
          let data = event.data;

          // Handle different data types
          if (data instanceof Blob) {
            data = await data.text();
          } else if (data instanceof ArrayBuffer) {
            data = new TextDecoder().decode(data);
          } else if (typeof data !== 'string') {
            data = String(data);
          }

          this.handleMessage(data);
        };

        this.ws.onerror = (event) => {
          console.error('[GeminiLive] WebSocket error:', event);
          this.setState('error');
          this.onError?.(new Error('WebSocket error'));
          reject(new Error('WebSocket error'));
        };

        this.ws.onclose = (event) => {
          console.log('[GeminiLive] WebSocket closed:', event.code, event.reason);
          this.setState('disconnected');

          // Only attempt auto-reconnection if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[GeminiLive] Reconnecting (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => this.connect(), 2000);
          }
        };
      });

    } catch (error) {
      console.error('[GeminiLive] Connection error:', error);
      this.setState('error');
      this.onError?.(error as Error);
      throw error;
    }
  }

  private setupSession(): void {
    const setupMessage: GeminiSetupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generation_config: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.voiceName
              }
            }
          }
        },
        system_instruction: {
          parts: [{
            text: this.buildSystemInstruction()
          }]
        }
      }
    };

    console.log('[GeminiLive] Sending setup message');
    this.ws?.send(JSON.stringify(setupMessage));
  }

  private handleMessage(data: string): void {
    try {
      const message: GeminiServerMessage = JSON.parse(data);

      // Setup complete
      if (message.setupComplete) {
        console.log('[GeminiLive] Setup complete, ready for messages');
        this.setState('connected');
        this.reconnectAttempts = 0; // Reset on successful connection
        return;
      }

      // Handle audio chunks
      if (message.serverContent?.modelTurn?.parts) {
        // Skip old audio if we interrupted and are waiting for new turn
        if (this.ignoreAudioUntilNewTurn) {
          console.log('[GeminiLive] Ignoring audio from interrupted turn');
          return;
        }

        let hasAudio = false;

        message.serverContent.modelTurn.parts.forEach((part) => {
          // Check for audio/pcm with optional rate parameter (e.g., "audio/pcm; rate=24000")
          if (part.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData.data) {
            hasAudio = true;
            this.queueAudioChunk(part.inlineData.data);
          }

          if (part.text) {
            console.log('[GeminiLive] Text response:', part.text);
          }
        });

        if (hasAudio) {
          this.setState('speaking');
        }
      }

      // Turn complete
      if (message.serverContent?.turnComplete) {
        console.log('[GeminiLive] Turn complete');

        // If we were ignoring audio from an interrupted turn, we're now ready for new audio
        if (this.ignoreAudioUntilNewTurn) {
          console.log('[GeminiLive] Old turn finished, ready for new audio');
          this.ignoreAudioUntilNewTurn = false;
          return;
        }

        // Wait for audio queue to finish, then return to connected state
        setTimeout(() => {
          if (!this.isPlaying) {
            this.setState('connected');
          }
        }, 500);
      }

    } catch (error) {
      console.error('[GeminiLive] Error parsing message:', error);
    }
  }

  private async queueAudioChunk(base64Audio: string): Promise<void> {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM to Float32Array
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0; // Normalize to [-1, 1]
      }

      // Create AudioBuffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        float32Array.length,
        24000 // 24kHz sample rate
      );
      audioBuffer.getChannelData(0).set(float32Array);

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playQueue();
      }

    } catch (error) {
      console.error('[GeminiLive] Error processing audio chunk:', error);
    }
  }

  private playQueue(): void {
    if (this.isPlaying || this.audioQueue.length === 0) {
      return;
    }

    // Resume AudioContext if suspended (don't await - let it happen in background)
    if (this.audioContext.state === 'suspended') {
      console.log('[GeminiLive] Resuming suspended AudioContext...');
      this.audioContext.resume();
    }

    this.isPlaying = true;

    // Use scheduled playback for gapless audio
    // Start immediately - use current time
    this.nextPlayTime = this.audioContext.currentTime;

    while (this.audioQueue.length > 0) {
      const buffer = this.audioQueue.shift()!;
      this.scheduleBuffer(buffer);
    }

    // Keep checking if more buffers arrive or playback is done
    this.monitorPlayback();
  }

  private scheduleBuffer(buffer: AudioBuffer): void {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // Track source for potential interruption
    this.activeSources.push(source);
    source.onended = () => {
      const index = this.activeSources.indexOf(source);
      if (index > -1) {
        this.activeSources.splice(index, 1);
      }
    };

    // Schedule at exact time for gapless playback
    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
  }

  /**
   * Stop all current audio playback immediately
   */
  private stopPlayback(): void {
    // Stop all active audio sources
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Source may have already ended
      }
    }
    this.activeSources = [];

    // Clear the queue and monitoring
    this.audioQueue = [];
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // Reset state
    this.isPlaying = false;
    this.nextPlayTime = 0;
    // Note: don't reset ignoreAudioUntilNewTurn here - it's managed by sendMessage/handleMessage
  }

  private monitorPlayback(): void {
    // Clear any existing monitor
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // Check periodically if playback is complete and no new buffers
    this.monitorInterval = setInterval(() => {
      // Process any new buffers that arrived
      while (this.audioQueue.length > 0) {
        const buffer = this.audioQueue.shift()!;
        this.scheduleBuffer(buffer);
      }

      // Check if all scheduled audio has finished
      const now = this.audioContext.currentTime;
      if (now >= this.nextPlayTime && this.audioQueue.length === 0) {
        if (this.monitorInterval) {
          clearInterval(this.monitorInterval);
          this.monitorInterval = null;
        }
        this.isPlaying = false;
        this.setState('connected');
      }
    }, 100);
  }

  sendMessage(text: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[GeminiLive] Cannot send message, not connected');
      return;
    }

    // Stop any current playback before sending new message
    if (this.isPlaying || this.state === 'speaking') {
      console.log('[GeminiLive] Interrupting - reconnecting for immediate response');
      this.stopPlayback();
      this.ignoreAudioUntilNewTurn = false;

      // Queue the message and reconnect to force Gemini to start fresh
      this.reconnectWithMessage(text);
      return;
    }

    this.sendMessageInternal(text);
  }

  private sendMessageInternal(text: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[GeminiLive] Cannot send message, not connected');
      return;
    }

    const message: GeminiClientContentMessage = {
      client_content: {
        turns: [{
          role: 'user',
          parts: [{ text }]
        }],
        turn_complete: true
      }
    };

    console.log('[GeminiLive] Sending message:', text.substring(0, 100) + '...');
    this.ws.send(JSON.stringify(message));
  }

  private async reconnectWithMessage(text: string): Promise<void> {
    // Close current connection
    this.ws?.close();
    this.ws = null;

    // Reconnect
    try {
      await this.connect();
      // Send the message after reconnecting
      this.sendMessageInternal(text);
    } catch (error) {
      console.error('[GeminiLive] Failed to reconnect:', error);
      this.onError?.(error as Error);
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      console.log('[GeminiLive] State:', newState);
      this.onStateChange?.(newState);
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  disconnect(): void {
    console.log('[GeminiLive] Disconnecting...');
    this.stopPlayback();
    this.ignoreAudioUntilNewTurn = false;
    this.ws?.close();
    this.ws = null;
    this.setState('disconnected');
  }
}
