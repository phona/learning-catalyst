import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import { useAppStore } from '@/stores/useAppStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { chatService } from '@/services/ai/chatService';
import { configService } from '@/services/configService';

// Mock all the services and stores
jest.mock('@/stores/useAppStore');
jest.mock('@/stores/useConfigStore');
jest.mock('@/services/ai/chatService');
jest.mock('@/services/appService');
jest.mock('@/services/configService');

// Mock Electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    getConfig: jest.fn().mockResolvedValue({}),
    setConfig: jest.fn().mockResolvedValue(undefined),
    showOpenDialog: jest.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    readFile: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;
const mockUseConfigStore = useConfigStore as jest.MockedFunction<typeof useConfigStore>;
const mockChatService = chatService as jest.Mocked<typeof chatService>;
const mockConfigService = configService as jest.Mocked<typeof configService>;

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderApp = (initialEntries = ['/']) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('App Integration Tests', () => {
  beforeEach(() => {
    // Setup default mock implementations
    mockUseAppStore.mockReturnValue({
      sidebar_open: true,
      settings_panel_open: false,
      theme: 'dark',
      current_view: 'chat',
      loading: false,
      error_message: undefined,
      success_message: undefined,
      setCurrentView: jest.fn(),
      setSidebarOpen: jest.fn(),
      setSettingsPanelOpen: jest.fn(),
      setTheme: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      setSuccess: jest.fn(),
      clearMessages: jest.fn(),
    });

    mockUseConfigStore.mockReturnValue({
      config: {
        ai: {
          default_provider: 'openai',
          default_model: 'gpt-3.5-turbo',
          providers: {
            openai: {
              name: 'OpenAI',
              api_key: 'test-key',
              base_url: 'https://api.openai.com/v1',
              models: ['gpt-3.5-turbo', 'gpt-4'],
            },
          },
          temperature: 0.7,
          max_tokens: 4096,
          streaming: true,
          enable_thinking: true,
        },
        ui: {
          theme: 'dark',
          show_token_usage: false,
        },
      },
      setConfig: jest.fn(),
      loadConfig: jest.fn().mockResolvedValue({}),
      saveConfig: jest.fn().mockResolvedValue(undefined),
      resetConfig: jest.fn(),
    });

    mockConfigService.loadConfig = jest.fn().mockResolvedValue({
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        providers: {},
        streaming: true,
        enable_thinking: true,
      },
      ui: {
        theme: 'dark',
        show_token_usage: false,
      },
    });

    jest.clearAllMocks();
  });

  describe('App Initialization', () => {
    it('renders loading screen initially', () => {
      // Mock the stores to indicate loading state
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        current_view: 'chat',
      });

      renderApp();

      // Should show loading screen while initializing
      expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      expect(screen.getByText('Initializing your AI learning companion...')).toBeInTheDocument();
    });

    it('renders main app after initialization', async () => {
      renderApp();

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText('Initializing your AI learning companion...')).not.toBeInTheDocument();
      });

      // Should show main app components
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('handles initialization errors', async () => {
      mockConfigService.loadConfig.mockRejectedValue(new Error('Failed to load config'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Initialization Error')).toBeInTheDocument();
        expect(screen.getByText('Learning Catalyst failed to start properly. Please restart the application.')).toBeInTheDocument();
      });
    });

    it('shows error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockConfigService.loadConfig.mockRejectedValue(new Error('Detailed error message'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Error details')).toBeInTheDocument();
      });

      // Expand error details
      fireEvent.click(screen.getByText('Error details'));

      expect(screen.getByText(/Detailed error message/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('reloads application when restart button is clicked', async () => {
      const reloadSpy = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: reloadSpy,
        writable: true,
      });

      mockConfigService.loadConfig.mockRejectedValue(new Error('Error'));

      renderApp();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Restart Application' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Restart Application' }));

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('renders chat interface on default route', async () => {
      renderApp(['/']);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
      });
    });

    it('renders chat interface on chat route', async () => {
      renderApp(['/chat']);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
      });
    });

    it('renders settings panel on settings route', async () => {
      renderApp(['/settings']);

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('renders session manager on sessions route', async () => {
      renderApp(['/sessions']);

      await waitFor(() => {
        expect(screen.getByText('Sessions')).toBeInTheDocument();
      });
    });

    it('renders learning dashboard on progress route', async () => {
      renderApp(['/progress']);

      await waitFor(() => {
        expect(screen.getByText('Learning Dashboard')).toBeInTheDocument();
      });
    });

    it('renders knowledge map on knowledge-map route', async () => {
      renderApp(['/knowledge-map']);

      await waitFor(() => {
        expect(screen.getByText('Knowledge Map')).toBeInTheDocument();
      });
    });
  });

  describe('Theme Management', () => {
    it('applies dark theme on initialization', async () => {
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        theme: 'dark',
      });

      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.classList.toggle).toHaveBeenCalledWith('dark', true);
      });
    });

    it('applies light theme when configured', async () => {
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        theme: 'light',
      });

      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.classList.toggle).toHaveBeenCalledWith('dark', false);
      });
    });

    it('applies auto theme based on system preference', async () => {
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        theme: 'auto',
      });

      // Mock system prefers dark theme
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderApp();

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.classList.toggle).toHaveBeenCalledWith('dark', true);
      });
    });
  });

  describe('Configuration Integration', () => {
    it('loads and applies configuration on startup', async () => {
      const mockConfig = {
        ai: {
          default_provider: 'chatglm',
          default_model: 'chatglm-pro',
          temperature: 0.8,
          enable_thinking: false,
        },
        ui: {
          theme: 'light',
          show_token_usage: true,
        },
      };

      mockConfigService.loadConfig.mockResolvedValue(mockConfig);

      renderApp();

      await waitFor(() => {
        expect(mockUseConfigStore().setConfig).toHaveBeenCalledWith(mockConfig);
        expect(mockUseAppStore().setTheme).toHaveBeenCalledWith('light');
      });
    });

    it('sets up menu handlers after initialization', async () => {
      const setupMenuHandlers = require('@/services/appService').setupMenuHandlers;
      const mockSetupMenuHandlers = jest.fn();

      require('@/services/appService').setupMenuHandlers = mockSetupMenuHandlers;

      renderApp();

      await waitFor(() => {
        expect(mockSetupMenuHandlers).toHaveBeenCalledWith(
          expect.objectContaining({
            'new-chat': expect.any(Function),
            'open-settings': expect.any(Function),
            'view-progress': expect.any(Function),
            'view-knowledge-map': expect.any(Function),
            'toggle-theme': expect.any(Function),
          })
        );
      });
    });
  });

  describe('Error Boundaries', () => {
    it('catches and displays component errors', async () => {
      // Create a component that throws an error
      const ThrowErrorComponent = () => {
        throw new Error('Component error');
      };

      // Mock one of the routes to use the throwing component
      jest.doMock('@/components/Chat/ChatInterface', () => ThrowErrorComponent);

      renderApp(['/chat']);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout', () => {
    it('adjusts sidebar state based on configuration', async () => {
      mockUseAppStore.mockReturnValue({
        ...mockUseAppStore(),
        sidebar_open: false,
      });

      renderApp();

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar).toHaveAttribute('data-open', 'false');
      });
    });

    it('shows status bar when token usage is enabled', async () => {
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
            providers: {},
          },
          ui: {
            show_token_usage: true,
          },
        },
        setConfig: jest.fn(),
        loadConfig: jest.fn(),
        saveConfig: jest.fn(),
        resetConfig: jest.fn(),
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText(/Provider:/)).toBeInTheDocument();
        expect(screen.getByText(/Model:/)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders without excessive re-renders', async () => {
      const { rerender } = renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      // Re-render shouldn't cause issues
      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });
    });

    it('handles configuration updates efficiently', async () => {
      const { rerender } = renderApp();

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });

      // Update configuration
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            default_provider: 'chatglm',
            default_model: 'chatglm-pro',
            providers: {},
          },
          ui: {
            theme: 'light',
            show_token_usage: false,
          },
        },
        setConfig: jest.fn(),
        loadConfig: jest.fn(),
        saveConfig: jest.fn(),
        resetConfig: jest.fn(),
      });

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <MemoryRouter initialEntries={['/']}>
            <App />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
      });
    });
  });
});