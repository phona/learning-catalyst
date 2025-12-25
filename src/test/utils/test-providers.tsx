import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ServicesProvider } from '@/renderer/services/services-provider';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import type { ElectronAPI } from '@/shared/types/electron-api';
import { ChatStoreProvider } from '@/renderer/stores/chat/ChatStoreProvider';
import { ElectronAPIProvider } from '@/renderer/hooks/useElectronAPI';
import { AssistantProvider } from '@assistant-ui/react';

// Create a minimal mock Assistant API for testing
// The assistant-ui library uses ProxiedAssistantState which calls api.threads().getState()
// and expects threads.threadIds.length and threads.archivedThreadIds.length
const createMockAssistantApi = () => {
  const listeners = new Set<() => void>();

  // State structure that matches what assistant-ui expects
  const threadsState = { threadIds: [], archivedThreadIds: [], isLoading: false };
  const emptyState = {};
  const emptyArrayState = { length: 0 };

  return {
    // Main subscription for useSyncExternalStore
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // These methods return store-like objects that ProxiedAssistantState uses
    threads: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => threadsState,
      getState: () => threadsState,
      switchToThread: vi.fn(),
      switchToNewThread: vi.fn(),
      item: vi.fn(),
      thread: vi.fn(),
    }),
    tools: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyArrayState,
      getState: () => emptyArrayState,
    }),
    modelContext: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    thread: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    threadListItem: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => ({ id: 'thread-123', remoteId: 'remote-123', externalId: 'external-123', title: 'Test Thread', status: 'regular' }),
      getState: () => ({ id: 'thread-123', remoteId: 'remote-123', externalId: 'external-123', title: 'Test Thread', status: 'regular' }),
      switchTo: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      delete: vi.fn(),
      generateTitle: vi.fn(),
      initialize: vi.fn(),
      detach: vi.fn(),
    }),
    composer: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    message: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    part: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
    attachment: () => ({
      subscribe: (l: () => void) => ({ unsubscribe: () => {} }),
      getSnapshot: () => emptyState,
      getState: () => emptyState,
    }),
  };
};

const queryClient = new QueryClient();
const defaultElectronClient: ElectronAPI = createMockElectronAPIClient();

export const QueryLayer = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export const Providers = ({
  children,
  routerProps,
  electronAPI,
  serviceOverrides,
}: {
  children: React.ReactNode;
  routerProps?: React.ComponentProps<typeof MemoryRouter>;
  electronAPI?: ElectronAPI;
  serviceOverrides?: React.ComponentProps<typeof ServicesProvider>['overrides'];
}): React.ReactElement => (
  <QueryLayer>
    <ElectronAPIProvider api={electronAPI ?? defaultElectronClient}>
      <AssistantProvider api={createMockAssistantApi()}>
        <MemoryRouter {...routerProps}>
          <ServicesProvider
            apiClient={electronAPI ?? defaultElectronClient}
            overrides={serviceOverrides}
          >
            <ChatStoreProvider>{children}</ChatStoreProvider>
          </ServicesProvider>
        </MemoryRouter>
      </AssistantProvider>
    </ElectronAPIProvider>
  </QueryLayer>
);
