import type { FetchFunction } from '@ai-sdk/provider-utils';

export const createIpcFetch = (): FetchFunction => async (_input, init) => {
  const payload = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

  let cancelStream: () => void;
  const textEncoder = new TextEncoder();

  // Use a stable message id for the assistant response
  const messageId = `msg-${Date.now()}`;
  let isFirstChunk = true;

  // Extract conversationId from payload or generate one
  // This ensures the same conversationId is used for resume
  const conversationId = payload.conversationId || `thread_${Date.now()}`;
  const messages = payload.messages || [];

  return new Response(
    new ReadableStream({
      start(controller) {
        cancelStream = window.electronAPI.aiSDK.stream(
          { messages, conversationId },
          (stream) => {
            console.log(JSON.stringify(stream));
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
