/**
 * Service Dependency Integration Tests
 *
 * Tests service dependencies and initialization order without UI startup.
 * Catches missing service dependencies that cause runtime errors.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Import the actual hooks we want to test
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useAppServices, ServiceProvider, ServiceContainerManager } from '@/renderer/hooks/useAppServices';

// Mock the ServiceContainer
vi.mock('@/renderer/services/ServiceContainer', () => ({
  rendererServiceContainer: {
    get: vi.fn((serviceName: string) => {
      // Simulate the current production container state
      const availableServices = {
        'analyticsService': {
          trackEvent: vi.fn(),
          trackPageView: vi.fn(),
          identifyUser: vi.fn(),
        },
      };
      return availableServices[serviceName as keyof typeof availableServices] || null;
    })
  }
}));

// Mock window.electronAPI
const mockElectronAPI = {
  getConfig: vi.fn().mockResolvedValue({
    openai: {
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo',
      temperature: 0.7
    }
  }),
  onMenuAction: vi.fn(),
  catalyst: {
    sendChat: vi.fn(),
    sendChatStream: vi.fn(),
    cancelExecution: vi.fn(),
  }
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('Service Dependency Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service container manager state
    const manager = new ServiceContainerManager();
    // Force fresh initialization
    (manager as any).container = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Production Service Container State', () => {
    it('should reproduce the exact production error scenario', async () => {
      // Test the exact sequence that fails in production

      // Step 1: Create service container (simulating production)
      const manager = new ServiceContainerManager();
      const container = await manager.getContainer();

      // Step 2: Verify this matches production state
      expect(container.sessionService).toBeNull();
      expect(container.analytics).toBeDefined();
      expect(container.configService).toBeNull();

      // Step 3: Try to use services that depend on sessionService
      const mockUseAppServices = vi.fn().mockReturnValue({
        services: container,
        ready: true,
        error: null
      });

      // Step 4: This should throw the exact same error as production
      vi.doMock('@/renderer/hooks/useAppServices', () => ({
        useAppServices: mockUseAppServices,
        ServiceProvider: ({ children }: { children: React.ReactNode }) => (
          React.createElement('div', {}, children)
        )
      }));

      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow('SessionService is required but not available');
    });

    it('should show which services are missing in production', async () => {
      const manager = new ServiceContainerManager();
      const container = await manager.getContainer();

      const allRequiredServices = [
        'sessionService',
        'configService',
        'agentManager',
        'conceptParsing',
        'contentDiscovery',
        'database',
        'knowledgeGraph',
        'vectorDatabase'
      ];

      const missingServices = allRequiredServices.filter(service =>
        !container[service as keyof typeof container]
      );

      expect(missingServices.length).toBeGreaterThan(0);
      expect(missingServices).toContain('sessionService');
      expect(missingServices).toContain('configService');
    });

    it('should verify analytics service is the only one available', async () => {
      const manager = new ServiceContainerManager();
      const container = await manager.getContainer();

      const availableServices = Object.entries(container)
        .filter(([_, service]) => service !== null)
        .map(([name]) => name);

      expect(availableServices).toEqual(['analytics']);
      expect(availableServices).not.toContain('sessionService');
    });
  });

  describe('Service Provider Error Cases', () => {
    it('should handle missing electronAPI gracefully', async () => {
      const originalAPI = window.electronAPI;
      delete (window as any).electronAPI;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const { services, ready, error } = useAppServices();

        if (error) {
          return React.createElement('div', { 'data-testid': 'error' }, error);
        }

        if (!ready) {
          return React.createElement('div', { 'data-testid': 'loading' }, 'Loading...');
        }

        return React.createElement('div', { 'data-testid': 'ready' }, 'Ready');
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(ServiceProvider, { children })
      );

      const { result } = renderHook(() => React.createElement(TestComponent), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      window.electronAPI = originalAPI;
      consoleSpy.mockRestore();
    });

    it('should handle config loading failures', async () => {
      mockElectronAPI.getConfig.mockRejectedValueOnce(new Error('Configuration not found'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        const { services, ready, error } = useAppServices();
        return React.createElement('div', {
          'data-testid': error ? 'error' : ready ? 'ready' : 'loading'
        });
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        React.createElement(ServiceProvider, { children })
      );

      renderHook(() => React.createElement(TestComponent), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.stringContaining('Configuration')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Service Dependency Chain', () => {
    it('should verify useChatStore dependency chain', () => {
      // Test the dependency chain: useChatStore -> useAppServices -> ServiceContainerManager

      const dependencyChain = [
        {
          name: 'useChatStore',
          required: ['sessionService'],
          test: () => {
            const mockAppServices = {
              services: { sessionService: null },
              ready: true,
              error: null
            };
            vi.doMock('@/renderer/hooks/useAppServices', () => ({
              useAppServices: () => mockAppServices
            }));
            expect(() => renderHook(() => useChatStore())).toThrow();
          }
        },
        {
          name: 'useAppServices',
          required: ['ServiceContainerManager'],
          test: () => {
            expect(() => {
              const manager = new ServiceContainerManager();
              manager.getContainer();
            }).not.toThrow();
          }
        }
      ];

      dependencyChain.forEach(({ name, test }) => {
        expect(() => test()).not.toThrow();
      });
    });

    it('should identify components that would fail in production', () => {
      // Components that use useChatStore would fail
      const componentsUsingChatStore = [
        'Header',
        'Sidebar',
        'ChatInterface'
      ];

      componentsUsingChatStore.forEach(componentName => {
        const mockHook = vi.fn().mockReturnValue({
          services: { sessionService: null },
          ready: true,
          error: null
        });

        vi.doMock('@/renderer/hooks/useAppServices', () => ({
          useAppServices: mockHook
        }));

        // These components would throw when mounted
        expect(() => {
          renderHook(() => useChatStore());
        }).toThrow('SessionService is required but not available');
      });
    });
  });

  describe('Mock vs Production Validation', () => {
    it('should show how tests hide the production error', () => {
      // This is how current tests "work" - they mock the dependency
      const mockSessionService = {
        saveSession: vi.fn(),
        getSession: vi.fn(),
        generateAITitle: vi.fn()
      };

      const mockAppServices = {
        services: {
          sessionService: mockSessionService, // Mock provides this
          analytics: { trackEvent: vi.fn() }
        },
        ready: true,
        error: null
      };

      vi.doMock('@/renderer/hooks/useAppServices', () => ({
        useAppServices: () => mockAppServices
      }));

      // With mock, no error occurs
      expect(() => {
        const { result } = renderHook(() => useChatStore());
        expect(result.current).toBeDefined();
      }).not.toThrow();

      // Without mock (production scenario), error occurs
      const productionAppServices = {
        services: {
          sessionService: null, // Production has null
          analytics: { trackEvent: vi.fn() }
        },
        ready: true,
        error: null
      };

      vi.doMock('@/renderer/hooks/useAppServices', () => ({
        useAppServices: () => productionAppServices
      }));

      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow('SessionService is required but not available');
    });
  });
});
