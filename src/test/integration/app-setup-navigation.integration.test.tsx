import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { Providers, renderWithServices, screen, waitFor, fireEvent } from '@/test/utils/renderWithServices';
import App from '@/renderer/App';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import SetupScreen from '@/renderer/components/SetupScreen';
import { ConfigChangedPayload, SystemReadyPayload } from '@/shared/types/electron-api';

describe('Integration: setup + loading to chat navigation', () => {
  it('SetupScreen waits for config change + ready before navigating to chat', async () => {
    const electronAPI = createMockElectronAPIClient();
    let resolveConfig: ((v: any) => void) | null = null;
    let resolveReady: ((v: any) => void) | null = null;

    electronAPI.awaitConfigChange = vi.fn(
      () =>
        new Promise<ConfigChangedPayload>((resolve) => {
          resolveConfig = resolve;
        }),
    );
    electronAPI.awaitReady = vi.fn(
      () =>
        new Promise<SystemReadyPayload>((resolve) => {
          resolveReady = resolve;
        }),
    );
    vi.spyOn(electronAPI.settings, 'setConfig').mockResolvedValue({ success: true } as any);
    vi.spyOn(electronAPI.settings, 'getConfig').mockResolvedValue({
      success: true,
      data: {
        ai: {
          modelTypes: { chat: { provider: 'openai', model: 'gpt-4o' } },
          providers: { openai: { providerType: 'openai', apiKey: 'sk-test' } },
        },
      },
    } as any);

    renderWithServices(
      <Providers routerProps={{ initialEntries: ['/setup'] }} electronAPI={electronAPI}>
        <Routes>
          <Route path="/setup" element={<SetupScreen />} />
          <Route path="/" element={<div data-testid="chat-home">CHAT_HOME</div>} />
        </Routes>
      </Providers>,
    );

    await screen.findByText('Configure AI Providers');
    fireEvent.change(screen.getByLabelText(/Provider/i), { target: { value: 'openai' } });
    await userEvent.type(screen.getByLabelText(/API Key/i), 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: /Add Provider/i }));

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Configure Model Usages');
    fireEvent.change(screen.getByLabelText(/^Provider$/i), { target: { value: 'openai' } });

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Review Configuration');
    await userEvent.click(await screen.findByRole('button', { name: /Save & Finish/i }));

    // Navigation should not happen until both promises resolve
    expect(screen.queryByTestId('chat-home')).not.toBeInTheDocument();

    resolveConfig?.({ changedKeys: ['ai'], config: {}, timestamp: Date.now() });
    resolveReady?.({ status: 'ready', ready: { ipcHandlersRegistered: true } });

    await waitFor(() => {
      expect(screen.getByTestId('chat-home')).toBeInTheDocument();
    });
    expect(electronAPI.awaitConfigChange).toHaveBeenCalledTimes(1);
    expect(electronAPI.awaitReady).toHaveBeenCalledTimes(1);
  });

  it('App shows loading then switches to chat after awaitReady resolves', async () => {
    const electronAPI = createMockElectronAPIClient();
    electronAPI.awaitReady = vi.fn().mockImplementation(
      () =>
        new Promise<SystemReadyPayload>((resolve) => {
          setTimeout(
            () => resolve({ status: 'ready', ready: { ipcHandlersRegistered: true } }),
            20,
          );
        }),
    );
    electronAPI.settings.getConfig = vi
      .fn()
      .mockResolvedValue({
        success: true,
        data: {
          ai: { modelTypes: { chat: { provider: 'openai', model: 'gpt-4o' } } },
        },
      } as any);

    renderWithServices(<App />, { electronAPI });

    expect(await screen.findByText(/Checking workspace configuration/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    });
    expect(electronAPI.awaitReady).toHaveBeenCalled();
  });
});
