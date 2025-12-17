import type { FetchFunction } from '@ai-sdk/provider-utils';

// Global storage for the current thread's remoteId
// Set by the ThreadHistoryProvider when a thread is loaded
let currentThreadRemoteId: string | null = null;

/**
 * Set the current thread's remoteId for use in IPC fetch
 */
export const setCurrentThreadRemoteId = (remoteId: string | null) => {
  console.log('[ipcFetch] Setting currentThreadRemoteId:', remoteId);
  currentThreadRemoteId = remoteId;
};

export const createIpcFetch = (): FetchFunction => async (_input, init) => {
  const payload = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

  let cancelStream: () => void;
  const textEncoder = new TextEncoder();

  // Use the current thread's remoteId if available, otherwise fall back to payload
  // This ensures we use the correct session ID for checkpointing
  const conversationId = currentThreadRemoteId || payload?.id || payload?.conversationId || `thread_${Date.now()}`;
  const messages = payload?.messages || [];

  console.log('[ipcFetch] DEBUG - payload:', JSON.stringify(payload, null, 2));
  console.log('[ipcFetch] DEBUG - currentThreadRemoteId:', currentThreadRemoteId);
  console.log('[ipcFetch] DEBUG - conversationId:', conversationId);
  console.log('[ipcFetch] DEBUG - messages:', messages);

  return new Response(
    new ReadableStream({
      start(controller) {
        cancelStream = window.electronAPI.aiSDK.stream(
          { messages, conversationId },
          (stream) => {
            console.log('[ipcFetch] Stream data:', stream);
            controller.enqueue(textEncoder.encode(stream));
          },
          () => {
            setTimeout(() => controller.close(), 100);
          },
        );
      },

      cancel() {
        if (cancelStream) {
          cancelStream();
        }
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    },
  );
};
