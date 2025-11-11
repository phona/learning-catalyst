import { describe, it, expect } from 'vitest';
import React from 'react';
import App from '@/renderer/App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

const createClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
});

describe('App smoke', () => {
  it('renders without crashing', () => {
    const client = createClient();
    expect(() =>
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </QueryClientProvider>
      )
    ).not.toThrow();
  });
});

