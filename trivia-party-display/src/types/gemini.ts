/**
 * TypeScript type definitions for Google Gemini Live API
 *
 * Documentation: https://ai.google.dev/api/multimodal-live
 */

/**
 * Response from PocketBase token minting endpoint
 */
export interface GeminiSessionToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Setup message sent to Gemini Live API after connection
 */
export interface GeminiSetupMessage {
  setup: {
    auth_token?: string;
    model: string;
    generation_config: {
      response_modalities: string[];
      speech_config?: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: string;
          };
        };
      };
    };
    system_instruction?: {
      parts: Array<{ text: string }>;
    };
  };
}

/**
 * Client content message sent to Gemini (user messages)
 */
export interface GeminiClientContentMessage {
  client_content: {
    turns: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }>;
    turn_complete: boolean;
  };
}

/**
 * Server messages received from Gemini
 */
export interface GeminiServerMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // base64-encoded audio/pcm
        };
      }>;
    };
    turnComplete?: boolean;
  };
  setupComplete?: boolean;
}

/**
 * Connection state for the WebSocket client
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'error';
