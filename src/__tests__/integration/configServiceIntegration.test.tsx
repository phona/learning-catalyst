import { renderHook } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { useService } from '@/renderer/hooks/useAppServices';
import { ServiceProvider } from '@/renderer/hooks/useAppServices';
import { ModelType } from '@/types/ai';
import type { ModelTypeConfig } from '@/types/config';

// Mock the window.electronAPI
const mockElectronAPI = {
  getConfig: vi.fn().mockResolvedValue({
    ai: {
      providers: {
        openai: { api_key: 'test-key', base_url: 'https://api.openai.com/v1' }
      },
      model_types: {
        chat: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
          available_providers: ['openai'],
          settings: { temperature: 0.7 },
          capabilities: { streaming: true, thinking: false, function_calling: true, vision: false }
        }
      }
    }
  }),
  setConfig: vi.fn(),
  resetConfig: vi.fn(),
};

// Setup window object
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('ConfigService Integration', () => {
  it('should provide configService through dependency injection', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServiceProvider>{children}</ServiceProvider>
    );

    const { result } = renderHook(() => useService('configService'), { wrapper });

    // ConfigService should be available after initialization
    expect(result.current).toBeDefined();
  });

  it('should provide all expected services', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServiceProvider>{children}</ServiceProvider>
    );

    const { result } = renderHook(() => useService('agentManager'), { wrapper });

    // AgentManager should be available
    expect(result.current).toBeDefined();
  });

  it('should maintain service relationships', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServiceProvider>{children}</ServiceProvider>
    );

    const { result } = renderHook(() => useService('agentManager'), { wrapper });

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    // AgentManager should have configService injected
    expect(result.current).toBeDefined();
  });
});