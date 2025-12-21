import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithServices, screen, fireEvent, waitFor } from '@/test/utils/renderWithServices';
import { createMockElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

vi.mock('@/renderer/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

const getToast = async () => {
  const toast = await import('@/renderer/utils/toast');
  return toast as unknown as { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };
};

describe('SetupScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds provider and persists configuration', async () => {
    const electronAPI = createMockElectronAPIClient();
    const spyConfigure = vi
      .spyOn(electronAPI.settings, 'configureProvider')
      .mockResolvedValue({ success: true, data: { providerId: 'openai', status: 'configured' } } as any);

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI });

    await screen.findByText('Configure AI Providers');

    const providerSelect = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');

    const addButton = screen.getByRole('button', { name: /Add Provider/i });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(spyConfigure).toHaveBeenCalled();
    });

    expect(screen.getByText(/Configured Providers \(1\)/i)).toBeInTheDocument();
  });

  it('preloads persisted providers on mount', async () => {
    const electronAPI = createMockElectronAPIClient();
    vi.spyOn(electronAPI.settings, 'getConfig').mockResolvedValue({
      success: true,
      data: {
        ai: {
          providers: {
            openai: { baseUrl: 'https://api.openai.com/v1', models: ['gpt-4'] },
          },
        },
      },
    } as any);

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI });

    await screen.findByText('Configure AI Providers');
    await waitFor(() => {
      expect(screen.getByText(/Configured Providers \(1\)/i)).toBeInTheDocument();
    });
  });

  it('shows error when provider persistence fails', async () => {
    const electronAPI = createMockElectronAPIClient();
    vi.spyOn(electronAPI.settings, 'configureProvider').mockRejectedValue(new Error('configure failed'));

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI });

    await screen.findByText('Configure AI Providers');

    const providerSelect = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');

    const addButton = screen.getByRole('button', { name: /Add Provider/i });
    await userEvent.click(addButton);

    const { showError } = await getToast();
    await waitFor(() => {
      expect(showError).toHaveBeenCalled();
    });
    expect(vi.mocked(showError)).toHaveBeenCalledWith(expect.stringMatching(/configure failed/i));
  });

  it('shows error when persisting draft fails', async () => {
    const electronAPI = createMockElectronAPIClient();
    vi.spyOn(electronAPI.settings, 'setConfig').mockRejectedValue(new Error('persist failed'));
    const configService = {
      getAvailableProviders: async () => {
        const resp = await electronAPI.settings.getAvailableProviders();
        return { success: !!resp.success, ...resp.data };
      },
      configureProvider: async (params: any) => {
        const resp = await electronAPI.settings.configureProvider(params);
        if (!resp.success || !resp.data) {
          throw new Error('Failed to configure provider');
        }
        return { success: true, providerId: resp.data.providerId, status: resp.data.status };
      },
      getConfig: async () => (await electronAPI.settings.getConfig()).data as any,
      setConfig: vi.fn().mockRejectedValue(new Error('persist failed')),
      saveConfig: async (config: unknown) => {
        await electronAPI.settings.setConfig(config);
      },
      validateProvider: vi.fn(),
      getProviderModels: vi.fn(),
    } as ConfigurationService;

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI, serviceOverrides: { configService } });

    await screen.findByText('Configure AI Providers');

    const providerSelect = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');

    const addButton = screen.getByRole('button', { name: /Add Provider/i });
    await userEvent.click(addButton);

    const { showError } = await getToast();
    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(expect.stringMatching(/Failed to persist setup draft/i));
    });
  });

  it('persists setup draft on provider add', async () => {
    const electronAPI = createMockElectronAPIClient();
    const setConfigSpy = vi.spyOn(electronAPI.settings, 'setConfig').mockResolvedValue({ success: true } as any);

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI });

    await screen.findByText('Configure AI Providers');

    const providerSelect = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');

    const addButton = screen.getByRole('button', { name: /Add Provider/i });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(setConfigSpy).toHaveBeenCalled();
      const args = setConfigSpy.mock.calls.map((c) => c[0]);
      expect(args.some((update) => update?.ai?.providers?.openai?.apiKey === 'sk-test')).toBe(
        true,
      );
    });
  });

  it('removes provider and persists updated providers', async () => {
    const electronAPI = createMockElectronAPIClient();
    const setConfigSpy = vi.spyOn(electronAPI.settings, 'setConfig').mockResolvedValue({ success: true } as any);

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI });

    await screen.findByText('Configure AI Providers');

    const providerSelect = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: /Add Provider/i }));

    await screen.findByText(/Configured Providers \(1\)/i);

    const removeBtn = screen.getByText('Remove');
    await userEvent.click(removeBtn);

    await waitFor(() => {
      expect(setConfigSpy).toHaveBeenCalled();
      const last = setConfigSpy.mock.calls.pop()?.[0];
      expect(last?.ai?.providers?.openai).toBeUndefined();
    });
  });

  it('persists chat assignment in step 2', async () => {
    const electronAPI = createMockElectronAPIClient();
    const setConfigSpy = vi.spyOn(electronAPI.settings, 'setConfig').mockResolvedValue({ success: true } as any);

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI });

    await screen.findByText('Configure AI Providers');

    const providerSelect = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: /Add Provider/i }));

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Configure Model Usages');

    const chatProviderSelect = screen.getByLabelText(/^Provider$/i);
    fireEvent.change(chatProviderSelect, { target: { value: 'openai' } });

    await waitFor(() => {
      expect(setConfigSpy).toHaveBeenCalled();
      const args = setConfigSpy.mock.calls.map((c) => c[0]);
      expect(
        args.some((update) => update?.ai?.modelTypes?.chat?.provider === 'openai'),
      ).toBe(true);
    });
  });

  it('save persists final config and shows success', async () => {
    const electronAPI = createMockElectronAPIClient();
    const setConfigSpy = vi.spyOn(electronAPI.settings, 'setConfig').mockResolvedValue({ success: true } as any);
    const configService = {
      getAvailableProviders: async () => {
        const resp = await electronAPI.settings.getAvailableProviders();
        return { success: !!resp.success, ...resp.data };
      },
      configureProvider: async (params: any) => {
        const resp = await electronAPI.settings.configureProvider(params);
        if (!resp.success || !resp.data) {
          throw new Error('Failed to configure provider');
        }
        return { success: true, providerId: resp.data.providerId, status: resp.data.status };
      },
      getConfig: async () => (await electronAPI.settings.getConfig()).data as any,
      saveConfig: async (config: unknown) => {
        await electronAPI.settings.setConfig(config);
      },
      setConfig: vi.fn(),
      validateProvider: vi.fn(),
      getProviderModels: vi.fn(),
    } as ConfigurationService;
    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI, serviceOverrides: { configService } });

    await screen.findByText('Configure AI Providers');

    const providerSelect1 = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect1, { target: { value: 'openai' } });
    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: /Add Provider/i }));

    await screen.findByText(/Configured Providers \(1\)/i);

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Configure Model Usages');

    const chatProviderSelect = screen.getByLabelText(/^Provider$/i);
    fireEvent.change(chatProviderSelect, { target: { value: 'openai' } });

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Review Configuration');

    const saveButton = await screen.findByRole('button', { name: /Save & Finish/i });
    await userEvent.click(saveButton);

    const { showSuccess } = await getToast();
    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalled();
      expect(
        setConfigSpy.mock.calls.some((args) => {
          const update = args[0];
          return update?.ai?.modelTypes?.chat?.provider === 'openai';
        }),
      ).toBe(true);
    });
  });

  it('shows error when saving configuration fails', async () => {
    const electronAPI = createMockElectronAPIClient();
    vi.spyOn(electronAPI.settings, 'setConfig').mockRejectedValue(new Error('save failed'));
    const configService = {
      getAvailableProviders: async () => {
        const resp = await electronAPI.settings.getAvailableProviders();
        return { success: !!resp.success, ...resp.data };
      },
      configureProvider: async (params: any) => {
        const resp = await electronAPI.settings.configureProvider(params);
        if (!resp.success || !resp.data) {
          throw new Error('Failed to configure provider');
        }
        return { success: true, providerId: resp.data.providerId, status: resp.data.status };
      },
      getConfig: async () => (await electronAPI.settings.getConfig()).data as any,
      setConfig: vi.fn(),
      saveConfig: async (config: unknown) => {
        await electronAPI.settings.setConfig(config);
      },
      validateProvider: vi.fn(),
      getProviderModels: vi.fn(),
    } as ConfigurationService;

    const { default: SetupScreen } = await import('../SetupScreen');
    renderWithServices(<SetupScreen />, { electronAPI, serviceOverrides: { configService } });

    await screen.findByText('Configure AI Providers');

    const providerSelect1 = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect1, { target: { value: 'openai' } });
    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: /Add Provider/i }));
    await screen.findByText(/Configured Providers \(1\)/i);

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Configure Model Usages');

    const chatProviderSelect = screen.getByLabelText(/^Provider$/i);
    fireEvent.change(chatProviderSelect, { target: { value: 'openai' } });

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Review Configuration');

    const saveButton = await screen.findByRole('button', { name: /Save & Finish/i });
    await userEvent.click(saveButton);

    const { showError } = await getToast();
    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(expect.stringMatching(/save failed/i));
    });
  });

  it('navigates to chat after Save & Finish when ready resolves', async () => {
    const electronAPI = createMockElectronAPIClient();
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

    const { default: SetupScreen } = await import('../SetupScreen');
    const { render } = await import('@testing-library/react');
    const { Routes, Route } = await import('react-router-dom');
    const { Providers } = await import('@/test/utils/renderWithServices');

    render(
      <Providers routerProps={{ initialEntries: ['/setup'] }} electronAPI={electronAPI}>
        <Routes>
          <Route path="/setup" element={<SetupScreen />} />
          <Route path="/" element={<div data-testid="chat-home">CHAT_HOME</div>} />
        </Routes>
      </Providers>,
    );

    await screen.findByText('Configure AI Providers');

    const providerSelect1 = screen.getByLabelText(/Provider/i);
    fireEvent.change(providerSelect1, { target: { value: 'openai' } });
    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await userEvent.type(apiKeyInput, 'sk-test');
    await userEvent.click(screen.getByRole('button', { name: /Add Provider/i }));

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Configure Model Usages');

    const chatProviderSelect = screen.getByLabelText(/^Provider$/i);
    fireEvent.change(chatProviderSelect, { target: { value: 'openai' } });

    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));
    await screen.findByText('Review Configuration');

    const saveButton = await screen.findByRole('button', { name: /Save & Finish/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByTestId('chat-home')).toBeInTheDocument();
    });
  });

  it('awaits config change + ready before navigating to chat after Save & Finish', async () => {
    const electronAPI = createMockElectronAPIClient();
    const awaitConfigSpy = vi
      .spyOn(electronAPI, 'awaitConfigChange')
      .mockResolvedValue({ changedKeys: ['ai'], config: {}, timestamp: Date.now() });
    const awaitReadySpy = vi
      .spyOn(electronAPI, 'awaitReady')
      .mockResolvedValue({ status: 'ready', ready: { ipcHandlersRegistered: true } });
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

    const { default: SetupScreen } = await import('../SetupScreen');
    const { render } = await import('@testing-library/react');
    const { Routes, Route } = await import('react-router-dom');
    const { Providers } = await import('@/test/utils/renderWithServices');

    render(
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

    await waitFor(() => {
      expect(screen.getByTestId('chat-home')).toBeInTheDocument();
    });
    expect(awaitConfigSpy).toHaveBeenCalledTimes(1);
    expect(awaitReadySpy).toHaveBeenCalledTimes(1);
  });
});
