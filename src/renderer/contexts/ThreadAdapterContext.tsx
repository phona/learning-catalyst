import React, { createContext, useContext, useMemo } from 'react';
import type { unstable_RemoteThreadListAdapter as RemoteThreadListAdapter } from '@assistant-ui/react';
import { createThreadListAdapter } from '@/renderer/hooks/useThreadListAdapter';

type ThreadAdapterContextType = {
  adapter: RemoteThreadListAdapter;
  unstable_Provider: React.ComponentType<{ children: React.ReactNode }>;
};

const ThreadAdapterContext = createContext<ThreadAdapterContextType | null>(null);

export const ThreadAdapterProvider: React.FC<{
  children: React.ReactNode;
  adapter?: RemoteThreadListAdapter;
}> = ({ children, adapter: adapterProp }) => {
  // Use provided adapter or create one
  const adapter = useMemo(() => adapterProp || createThreadListAdapter(), [adapterProp]);

  const contextValue = useMemo(() => ({
    adapter,
    unstable_Provider: adapter.unstable_Provider,
  }), [adapter]);

  return (
    <ThreadAdapterContext.Provider value={contextValue}>
      {children}
    </ThreadAdapterContext.Provider>
  );
};

export const useThreadAdapter = (): ThreadAdapterContextType => {
  const context = useContext(ThreadAdapterContext);
  if (!context) {
    throw new Error('useThreadAdapter must be used within a ThreadAdapterProvider');
  }
  return context;
};
