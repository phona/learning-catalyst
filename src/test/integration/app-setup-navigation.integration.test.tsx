import { describe, it, expect, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { Providers, renderWithServices, screen, waitFor, fireEvent } from '@/test/utils/renderWithServices';
import { App } from '@/renderer/app';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import SetupPage from '@/renderer/pages/setup/SetupPage';
import { ConfigChangedPayload, SystemReadyPayload } from '@/shared/types/electron-api';

describe('Integration: setup + loading to chat navigation', () => {
  it('SetupScreen completes setup workflow and navigates', async () => {
    const electronAPI = createMockElectronAPIClient();

    // Mock the async methods to resolve immediately
    electronAPI.awaitConfigChange = vi.fn().mockResolvedValue({
      changedKeys: ['ai'],
      config: {},
      timestamp: Date.now(),
    });
    electronAPI.awaitReady = vi.fn().mockResolvedValue({
      status: 'ready',
      ready: { ipcHandlersRegistered: true },
    });

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

    // Create a simple test component that simulates the chat interface
    const ChatHome = () => <div data-testid="chat-home">CHAT_HOME</div>;

    renderWithServices(
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<ChatHome />} />
      </Routes>,
      { routerProps: { initialEntries: ['/setup'] }, electronAPI },
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

    // Wait for navigation to complete (setup saves and redirects)
    await waitFor(() => {
      expect(screen.getByTestId('chat-home')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(electronAPI.settings.setConfig).toHaveBeenCalled();
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
      // After loading completes, we should see the Thread component or at least the chat interface container
      expect(screen.queryByText(/Checking workspace configuration/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
    expect(electronAPI.awaitReady).toHaveBeenCalled();
  });
});
