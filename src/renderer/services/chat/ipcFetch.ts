import type { FetchFunction } from '@ai-sdk/provider-utils';

export const createIpcFetch = (): FetchFunction => async (_input, init) => {
  const payload = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

  let cancelStream: () => void;
  const textEncoder = new TextEncoder();

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
            console.log('ipcFetch: Stream chunk:', stream);
 
            // Format for assistant-ui AI SDK
            if (isFirstChunk) {
              // Send text-start with id
              controller.enqueue(
                textEncoder.encode('data: ' + JSON.stringify({ id: messageId, type: 'text-start' }) + '\n\n')
              );
              isFirstChunk = false;
            }

            // Send text-delta with content in delta field
            if (stream.content) {
              controller.enqueue(
                textEncoder.encode('data: ' + JSON.stringify({ id: messageId, type: 'text-delta', delta: stream.content }) + '\n\n')
              );
            }
          },
          () => {
            // Stream completed callback - send text-end
            if (!isFirstChunk) {
              controller.enqueue(
                textEncoder.encode('data: ' + JSON.stringify({ id: messageId, type: 'text-end' }) + '\n\n')
              );
            }
            // Delay closing to ensure text-end is received
            setTimeout(() => controller.close(), 100);
          }
        );
      },

      cancel() {
        if (cancelStream) {
          console.log('ipcFetch: Stream cancelled.');
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