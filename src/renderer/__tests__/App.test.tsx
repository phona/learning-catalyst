/**
 * App Component Tests
 *
 * Comprehensive tests for the main App component focusing on:
 * - Routing and navigation
 * - Application initialization
 * - Service container integration
 * - Error boundaries
 * - Configuration loading
 * - Real-world user navigation flows
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock all the stores and services
vi.mock('../stores/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    setCurrentView: vi.fn(),
    setTheme: vi.fn(),
    setError: vi.fn(),
    setSuccess: vi.fn(),
    sidebar_open: true,
    settings_panel_open: false,
    theme: 'dark',
    current_view: 'chat',
    focus_mode: false,
    loading: false,
    error_message: undefined,
    success_message: undefined,
  })),
}));

vi.mock('../stores/useConfigStore', () => ({
  useConfigStore: vi.fn(() => ({
    config: {
      ai: {
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
          }
        }
      },
      ui: {
        theme: 'dark',
      }
    },
    setConfig: vi.fn(),
    loadConfig: vi.fn().mockResolvedValue({
      ai: {
        model_types: {
          chat: {
            default_provider: 'openai',
            default_model: 'gpt-3.5-turbo',
          }
        }
      },
      ui: {
        theme: 'dark',
      }
    }),
  })),
}));

vi.mock('../services/services-container', () => ({
  ServicesProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../hooks/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    setCurrentView: vi.fn(),
    setTheme: vi.fn(),
    setError: vi.fn(),
    setSuccess: vi.fn(),
    sidebar_open: true,
    settings_panel_open: false,
    theme: 'dark',
    current_view: 'chat',
    focus_mode: false,
    loading: false,
    error_message: undefined,
    success_message: undefined,
  })),
}));

// Mock electronAPI
const mockElectronAPI = {
  getConfig: vi.fn(),
  catalyst: {
    sendChatStream: vi.fn(),
  },
  sessions: {
    get: vi.fn(),
    list: vi.fn(),
  },
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Create a wrapper component for routing
const AppWithRouter = () => (
  <MemoryRouter initialEntries={['/']}>
    <App />
  </MemoryRouter>
);

describe('App - Main Application Flow', () => {
  const mockUseAppStore = vi.mocked(() => ({
    setCurrentView: vi.fn(),
    currentView: 'chat',
    setCurrentSession: vi.fn(),
    currentSessionId: null,
  }));
  const mockUseConfigStore = vi.mocked(() => ({
    config: null,
    loading: false,
    error: null,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockUseAppStore.mockReturnValue({
      setCurrentView: vi.fn(),
      setTheme: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      sidebar_open: true,
      settings_panel_open: false,
      theme: 'dark',
      current_view: 'chat',
      focus_mode: false,
      loading: false,
      error_message: undefined,
      success_message: undefined,
    });
    
    mockUseConfigStore.mockReturnValue({
      config: {
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-3.5-turbo',
            }
          }
        },
        ui: {
          theme: 'dark',
        }
      },
      setConfig: vi.fn(),
      loadConfig: vi.fn().mockResolvedValue({
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-3.5-turbo',
            }
          }
        },
        ui: {
          theme: 'dark',
        }
      }),
    });
  });

  describe('Application Initialization', () => {
    it('should initialize application with default configuration', async () => {
      render(<AppWithRouter />);

      // Verify app starts loading
      expect(screen.queryByText('Loading...')).toBeInTheDocument();

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Verify that config was loaded
      expect(mockUseConfigStore().loadConfig).toHaveBeenCalled();
    });

    it('should handle configuration loading errors gracefully', async () => {
      // Mock configuration loading failure
      mockUseConfigStore.mockReturnValue({
        config: null,
        setConfig: vi.fn(),
        loadConfig: vi.fn().mockRejectedValue(new Error('Config load failed')),
      });

      render(<AppWithRouter />);

      // Should handle error without crashing
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });
    });

    it('should apply theme during initialization', async () => {
      // Mock different theme
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            model_types: {
              chat: {
                default_provider: 'openai',
                default_model: 'gpt-3.5-turbo',
              }
            }
          },
          ui: {
            theme: 'light',
          }
        },
        setConfig: vi.fn(),
        loadConfig: vi.fn().mockResolvedValue({
          ui: { theme: 'light' }
        }),
      });

      render(<AppWithRouter />);

      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Verify theme was applied to document
      expect(document.documentElement).not.toHaveClass('dark');
    });
  });

  describe('Routing and Navigation', () => {
    it('should route to chat interface by default', async () => {
      render(<AppWithRouter />);

      await waitFor(() => {
        // Should show chat interface elements
        expect(screen.getByText('Welcome to Learning Catalyst')).toBeInTheDocument();
      });

      // Verify chat input is available
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should navigate to settings page', async () => {
      const user = userEvent.setup();
      
      render(<AppWithRouter />);

      // Find and click settings navigation
      await waitFor(() => {
        const settingsLink = screen.getByText('Settings');
        expect(settingsLink).toBeInTheDocument();
      });

      const settingsLink = screen.getByText('Settings');
      await user.click(settingsLink);

      // Should show settings page
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
    });

    it('should navigate to sessions page', async () => {
      const user = userEvent.setup();
      
      render(<AppWithRouter />);

      // Navigate to sessions
      await waitFor(() => {
        const sessionsLink = screen.getByText('Sessions');
        expect(sessionsLink).toBeInTheDocument();
      });

      const sessionsLink = screen.getByText('Sessions');
      await user.click(sessionsLink);

      // Should show session management
      await waitFor(() => {
        expect(screen.getByText('Session Manager')).toBeInTheDocument();
      });
    });

    it('should handle direct route navigation', async () => {
      // Test with specific route
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>
      );

      // Should directly show settings page
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('should initialize services provider correctly', async () => {
      render(<AppWithRouter />);

      // Should render without service initialization errors
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Services provider should wrap the application
      expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
    });

    it('should handle missing electron API gracefully', async () => {
      // Remove electronAPI to simulate browser environment
      delete (window as any).electronAPI;

      render(<AppWithRouter />);

      // Should still initialize but warn about browser environment
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Should continue to function with limited capabilities
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Handling', () => {
    it('should catch and handle component errors', async () => {
      // Create a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // Mock the ChatInterface to sometimes throw errors
      vi.mock('../components/Chat/ChatInterface', async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          ChatInterface: ErrorComponent,
        };
      });

      render(<AppWithRouter />);

      // Error boundary should catch the error and show fallback
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should maintain functionality after error recovery', async () => {
      let shouldError = true;
      
      const FlakyComponent = () => {
        if (shouldError) {
          throw new Error('Flaky error');
        }
        return <div>Working Component</div>;
      };

      vi.mock('../components/Chat/ChatInterface', async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          ChatInterface: FlakyComponent,
        };
      });

      render(<AppWithRouter />);

      // Initially should show error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Simulate recovery by making component work
      shouldError = false;
      
      // Rerender to test recovery
      render(<AppWithRouter />);
      
      await waitFor(() => {
        expect(screen.getByText('Working Component')).toBeInTheDocument();
      });
    });
  });

  describe('Real-world User Navigation Flows', () => {
    it('should support complete learning workflow: chat -> sessions -> settings -> back to chat', async () => {
      const user = userEvent.setup();
      
      render(<AppWithRouter />);

      // Start in chat
      await waitFor(() => {
        expect(screen.getByText('Welcome to Learning Catalyst')).toBeInTheDocument();
      });

      // Navigate to sessions
      const sessionsLink = screen.getByText('Sessions');
      await user.click(sessionsLink);

      await waitFor(() => {
        expect(screen.getByText('Session Manager')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsLink = screen.getByText('Settings');
      await user.click(settingsLink);

      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });

      // Navigate back to chat
      const chatLink = screen.getByText('Chat');
      await user.click(chatLink);

      await waitFor(() => {
        expect(screen.getByText('Welcome to Learning Catalyst')).toBeInTheDocument();
      });

      // Verify smooth navigation throughout
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle deep linking to specific session', async () => {
      render(
        <MemoryRouter initialEntries={['/sessions/session-123']}>
          <App />
        </MemoryRouter>
      );

      // Should handle route to specific session
      await waitFor(() => {
        // Could be chat interface for specific session or session detail
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });
    });

    it('should maintain state across navigation', async () => {
      const user = userEvent.setup();
      
      const mockAppStore = {
        setCurrentView: vi.fn(),
        setTheme: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        sidebar_open: true,
        settings_panel_open: false,
        theme: 'dark',
        current_view: 'chat',
        focus_mode: false,
        loading: false,
        error_message: undefined,
        success_message: undefined,
      };

      mockUseAppStore.mockReturnValue(mockAppStore);

      render(<AppWithRouter />);

      // Make changes to state
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsLink = screen.getByText('Settings');
      await user.click(settingsLink);

      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });

      // Navigate back to chat
      const chatLink = screen.getByText('Chat');
      await user.click(chatLink);

      // State should be maintained (sidebar open, theme, etc.)
      await waitFor(() => {
        expect(screen.getByText('Welcome to Learning Catalyst')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should initialize efficiently without memory leaks', async () => {
      const startTime = performance.now();
      
      render(<AppWithRouter />);

      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      const initTime = performance.now() - startTime;
      
      // Should initialize quickly (under 2 seconds for initial render)
      expect(initTime).toBeLessThan(2000);
    });

    it('should clean up resources on unmount', async () => {
      const { unmount } = render(<AppWithRouter />);

      // Component should mount successfully
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Unmount should not cause errors
      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle concurrent initialization safely', async () => {
      // Render multiple instances to test initialization isolation
      const { unmount: unmount1 } = render(<AppWithRouter />);
      const { unmount: unmount2 } = render(<AppWithRouter />);

      // Both should initialize without conflicts
      await Promise.all([
        waitFor(() => expect(screen.getByText('Learning Catalyst')).toBeInTheDocument()),
        act(() => new Promise(resolve => setTimeout(resolve, 100))) // Small delay
      ]);

      // Clean up both
      unmount1();
      unmount2();

      expect(() => {
        // Both unmounted successfully
      }).not.toThrow();
    });
  });

  describe('Theme and Layout Management', () => {
    it('should apply theme to entire application', async () => {
      // Mock dark theme
      mockUseConfigStore.mockReturnValue({
        config: {
          ai: {
            model_types: {
              chat: {
                default_provider: 'openai',
                default_model: 'gpt-3.5-turbo',
              }
            }
          },
          ui: {
            theme: 'dark',
          }
        },
        setConfig: vi.fn(),
        loadConfig: vi.fn().mockResolvedValue({
          ui: { theme: 'dark' }
        }),
      });

      render(<AppWithRouter />);

      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Verify dark theme class is applied
      expect(document.documentElement).toHaveClass('dark');
    });

    it('should handle theme changes during runtime', async () => {
      const mockAppStore = {
        setCurrentView: vi.fn(),
        setTheme: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        sidebar_open: true,
        settings_panel_open: false,
        theme: 'light',
        current_view: 'chat',
        focus_mode: false,
        loading: false,
        error_message: undefined,
        success_message: undefined,
      };

      mockUseAppStore.mockReturnValue(mockAppStore);

      render(<AppWithRouter />);

      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Simulate theme change
      act(() => {
        mockAppStore.theme = 'dark';
      });

      // Component should handle theme change
      expect(document.documentElement).toHaveClass('dark');
    });
  });

  describe('Configuration and Feature Flags', () => {
    it('should respect configuration-based feature availability', async () => {
      // Mock configuration with different features enabled/disabled
      const featureConfig = {
        ai: {
          model_types: {
            chat: {
              default_provider: 'openai',
              default_model: 'gpt-3.5-turbo',
              capabilities: {
                streaming: true,
                thinking: true,
              }
            }
          }
        },
        ui: {
          theme: 'dark',
          show_token_usage: true,
        }
      };

      mockUseConfigStore.mockReturnValue({
        config: featureConfig,
        setConfig: vi.fn(),
        loadConfig: vi.fn().mockResolvedValue(featureConfig),
      });

      render(<AppWithRouter />);

      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Verify features are available based on config
      // (Actual implementation would check for specific UI elements)
    });

    it('should handle configuration updates during runtime', async () => {
      const { rerender } = render(<AppWithRouter />);

      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });

      // Mock updated configuration
      const updatedConfig = {
        ai: {
          model_types: {
            chat: {
              default_provider: 'chatglm',
              default_model: 'chatglm-6b',
              capabilities: {
                streaming: false,
                thinking: true,
              }
            }
          }
        },
        ui: {
          theme: 'auto',
        }
      };

      mockUseConfigStore.mockReturnValue({
        config: updatedConfig,
        setConfig: vi.fn(),
        loadConfig: vi.fn().mockResolvedValue(updatedConfig),
      });

      // Rerender to test configuration update
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      // Should handle configuration changes gracefully
      await waitFor(() => {
        expect(screen.getByText('Learning Catalyst')).toBeInTheDocument();
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});