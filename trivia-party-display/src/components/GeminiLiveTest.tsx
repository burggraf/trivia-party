import { useEffect, useRef, useState } from 'react';
import { GeminiLiveClient } from '@/lib/geminiLiveClient';
import type { ConnectionState } from '@/types/gemini';

export default function GeminiLiveTest() {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  const handleConnect = async () => {
    try {
      setError(null);
      const client = new GeminiLiveClient('test-game-id');

      client.onStateChange = (newState) => {
        setState(newState);
      };

      client.onError = (err) => {
        setError(err.message);
      };

      await client.connect();
      clientRef.current = client;

    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleTestMessage = () => {
    if (clientRef.current) {
      clientRef.current.sendMessage('Say hello and introduce yourself as Terry, the trivia host!');
    }
  };

  const handleDisconnect = () => {
    clientRef.current?.disconnect();
    clientRef.current = null;
  };

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Gemini Live Client Test</h1>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          State: <span className="font-mono font-bold">{state}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleConnect}
          disabled={state !== 'disconnected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Connect
        </button>

        <button
          onClick={handleTestMessage}
          disabled={state !== 'connected'}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Test Message
        </button>

        <button
          onClick={handleDisconnect}
          disabled={state === 'disconnected'}
          className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
