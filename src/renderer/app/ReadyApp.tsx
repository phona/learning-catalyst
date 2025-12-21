import React from 'react';
import {
  AssistantRuntimeProvider,
  unstable_useRemoteThreadListRuntime as useRemoteThreadListRuntime,
} from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { useElectronAPI } from '@/renderer/hooks/useElectronAPI';
import { createThreadListAdapter } from '@/renderer/hooks/useThreadListAdapter';
import { IpcChatTransport } from '@/renderer/services/chat/IpcChatTransport';
import { AppRoutes } from './AppRoutes';

/**
 * Custom hook that creates the chat runtime with IPC transport.
 *
 * Uses our custom IpcChatTransport to send AI SDK chat requests over Electron IPC
 * (and to ensure the correct thread ID is used when sending messages).
 */
function useIpcChatRuntime(api: ReturnType<typeof useElectronAPI>) {
  // Create a stable transport instance using useMemo
  const transport = React.useMemo(() => new IpcChatTransport(api), [api]);

  return useChatRuntime({
    transport,
  });
}

export const ReadyApp: React.FC = () => {
  const api = useElectronAPI();

  // Create thread list adapter for SQLite persistence
  const threadListAdapter = React.useMemo(() => createThreadListAdapter(api), [api]);

  // Matches Assistant UI's recommended pattern: runtimeHook is a component-like function.
  function RuntimeHook() {
    return useIpcChatRuntime(api);
  }

  // Create runtime with thread list support
  // useRemoteThreadListRuntime combines chat runtime with thread persistence
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: RuntimeHook,
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AppRoutes />
    </AssistantRuntimeProvider>
  );
};
