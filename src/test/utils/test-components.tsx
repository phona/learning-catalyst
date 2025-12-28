import React from 'react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesProvider } from '@/renderer/services/services-provider';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

/* eslint-disable react-refresh/only-export-components */
// Components moved to separate file to avoid Fast Refresh warning
export const QueryLayer: React.FC<{
  children: React.ReactNode;
  routerProps?: MemoryRouterProps;
}> = ({ children, routerProps }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <MemoryRouter {...routerProps}>{children}</MemoryRouter>
  </QueryClientProvider>
);

export const Providers: React.FC<{
  children: React.ReactNode;
  routerProps?: MemoryRouterProps;
}> = ({ children, routerProps }) => (
  <ServicesProvider apiClient={createMockElectronAPIClient()}>
    <QueryLayer routerProps={routerProps}>{children}</QueryLayer>
  </ServicesProvider>
);
