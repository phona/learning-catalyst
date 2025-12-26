import type { FetchFunction } from '@ai-sdk/provider-utils';
import type { ElectronAPI } from '@/shared/types';

export const createIpcFetch = (api: ElectronAPI): FetchFunction => async (_input, init) => {
  const payload = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;

  const signal = init?.signal;
  let cancelStream: (() => void) | undefined;
  let cancelInvoked = false;
  let abortRequested = signal?.aborted ?? false;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;
  const textEncoder = new TextEncoder();

  // The IpcChatTransport sets body.id to the correct thread localId
  const conversationId = payload?.id;
  const newUserMessage = payload?.newUserMessage;
  const messages = payload?.messages || [];

  const closeController = () => {
    if (closed) return;
    if (!controllerRef) return;
    closed = true;
    try {
      controllerRef.close();
    } catch {
      // no-op: controller may already be closed/errored
    }
  };

  const invokeCancel = () => {
    if (cancelInvoked) return;
    cancelInvoked = true;
    cancelStream?.();
  };

  const handleAbort = () => {
    abortRequested = true;
    invokeCancel();
    closeController();
  };

  if (signal && !signal.aborted) {
    signal.addEventListener('abort', handleAbort, { once: true });
  }

  return new Response(
    new ReadableStream({
      start(controller) {
        controllerRef = controller;
        cancelStream = api.aiSDK.stream(
          newUserMessage !== undefined ? { conversationId, newUserMessage } : { conversationId, messages },
          (data: unknown) => {
            // if (process.env.NODE_ENV !== 'production') {
            //   console.log(data);
            // }
            if (abortRequested || closed) return;
            const streamData = typeof data === 'string' ? data : String(data);
            try {
              controller.enqueue(textEncoder.encode(streamData));
            } catch {
              // no-op: consumer already stopped reading
            }
          },
          () => {
            if (abortRequested || closed) return;
            setTimeout(() => closeController(), 100);
          },
        );

        // If the signal aborted before the stream started, ensure we still cancel.
        if (abortRequested) {
          handleAbort();
        }
      },

      cancel() {
        invokeCancel();
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
