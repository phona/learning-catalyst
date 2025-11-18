import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesProvider } from '@/renderer/services/services-provider';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

/* eslint-disable react-refresh/only-export-components */
// Components moved to separate file to avoid Fast Refresh warning
export const QueryLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ServicesProvider>
    <QueryLayer>{children}</QueryLayer>
  </ServicesProvider>
);