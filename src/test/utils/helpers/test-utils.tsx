import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

// Local default query client for this provider-only module.
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // TanStack Query v4 uses `cacheTime` (v5 renamed it to `gcTime`).
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const AllTheProviders: React.FC<AllTheProvidersProps> = ({
  children,
  queryClient = createTestQueryClient(),
  initialEntries = ['/'],
}) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  </QueryClientProvider>
);
