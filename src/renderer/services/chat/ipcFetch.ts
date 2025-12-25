import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { ElectronAPI } from '@/shared/types';

export const createIpcFetch = (api: ElectronAPI): FetchFunction => async (_input, init) => {
  const payload = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

  let cancelStream: () => void;
  const textEncoder = new TextEncoder();

  // The IpcChatTransport sets body.id to the correct thread localId
  const conversationId = payload?.id;
  const newUserMessage = payload?.newUserMessage;
  const messages = payload?.messages || [];

  return new Response(
    new ReadableStream({
      start(controller) {
        cancelStream = api.aiSDK.stream(
          newUserMessage !== undefined ? { conversationId, newUserMessage } : { conversationId, messages },
          (data: unknown) => {
            if (process.env.NODE_ENV !== 'production') {
              console.log(data);
            }
            const streamData = typeof data === 'string' ? data : String(data);
            controller.enqueue(textEncoder.encode(streamData));
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
