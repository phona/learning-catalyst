/**
 * IPC Chat Transport for Assistant UI
 *
 * Custom transport that ensures the correct thread ID is used for messages.
 *
 * THE PROBLEM:
 * AssistantChatTransport calls this.runtime?.threads.mainItem.initialize()
 * but this returns DEFAULT_THREAD_ID because mainItem at that moment is not
 * the new thread. The user's new thread hasn't been set as mainItem yet.
 *
 * THE FIX:
 * Override prepareSendMessagesRequest to use options.id (which contains the
 * correct thread localId) instead of relying on mainItem.initialize().
 */

import { AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import type { AssistantRuntime } from '@assistant-ui/react';
import type { HttpChatTransportInitOptions, UIMessage } from 'ai';
import type { ElectronAPI } from '@/shared/types';
import { createIpcFetch } from './ipcFetch';

/**
 * Extended AssistantChatTransport that ensures the correct thread ID is used.
 */
export class IpcChatTransport<UI_MESSAGE extends UIMessage = UIMessage> extends AssistantChatTransport<UI_MESSAGE> {
  constructor(api: ElectronAPI) {
    super({
      fetch: createIpcFetch(api),
      // Override prepareSendMessagesRequest to ensure correct thread ID
      prepareSendMessagesRequest: async (options) => {
        // Use options.id directly - it contains the correct thread localId
        // from useChat({ id }) which gets it from threadListItem.id
        const finalId = options.id || 'DEFAULT_THREAD_ID';

        return {
          body: {
            id: finalId,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
            metadata: options.requestMetadata,
          },
        };
      },
    } as HttpChatTransportInitOptions<UI_MESSAGE>);
  }

  override setRuntime(runtime: AssistantRuntime): void {
    super.setRuntime(runtime);
  }
}
