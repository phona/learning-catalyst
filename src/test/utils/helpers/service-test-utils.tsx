/**
 * Service Test Utilities
 *
 * Helper functions and mocks for testing service initialization scenarios
 * without requiring full UI startup. These utilities make it easier to
 * reproduce and test the production error conditions.
 */

import { vi, ReactNode } from 'vitest';
import React from 'react';
import { renderHook, render } from '@testing-library/react';

// Mock session service for testing
export const createMockSessionService = () => ({
  saveSession: vi.fn().mockResolvedValue('session-id'),
  getSession: vi.fn().mockResolvedValue({
    id: 'test-session',
    title: 'Test Session',
    messages: []
  }),
  deleteSession: vi.fn().mockResolvedValue(true),
  generateAITitle: vi.fn().mockResolvedValue('AI Generated Title'),
  saveSessionWithMessages: vi.fn().mockResolvedValue('session-id'),
  updateSessionTitle: vi.fn().mockResolvedValue(true),
  saveMessage: vi.fn().mockResolvedValue(true),
});

// Mock service container that simulates production state
export const createProductionServiceContainer = () => ({
  database: null,
  analytics: {
    trackEvent: vi.fn(),
    trackPageView: vi.fn(),
    identifyUser: vi.fn(),
  },
  knowledgeGraph: null,
  vectorDatabase: null,
  sessionService: null, // This is the production bug
  conceptParsing: null,
  contentDiscovery: null,
  agentManager: null,
  configService: null,
});

// Mock service container with all services available
export const createCompleteServiceContainer = () => ({
  database: {
    query: vi.fn(),
    close: vi.fn(),
  },
  analytics: {
    trackEvent: vi.fn(),
    trackPageView: vi.fn(),
    identifyUser: vi.fn(),
  },
  knowledgeGraph: {
    getConcepts: vi.fn(),
    addRelationship: vi.fn(),
  },
  vectorDatabase: {
    search: vi.fn(),
    addVector: vi.fn(),
  },
  sessionService: createMockSessionService(),
  conceptParsing: {
    parseConcepts: vi.fn(),
  },
  contentDiscovery: {
    discoverContent: vi.fn(),
  },
  agentManager: {
    getAgents: vi.fn(),
    createAgent: vi.fn(),
  },
  configService: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
  },
});

// Mock window.electronAPI for testing
export const createMockElectronAPI = (config: any = {}) => ({
  getConfig: vi.fn().mockResolvedValue(config),
  onMenuAction: vi.fn(),
  catalyst: {
    sendChat: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
    sendChatStream: vi.fn().mockImplementation((messages, options, onChunk) => {
      onChunk({ type: 'content', content: 'Test response', timestamp: Date.now() });
      return Promise.resolve({ success: true, messageId: 'test-stream-id' });
    }),
    cancelExecution: vi.fn().mockResolvedValue({ success: true }),
  },
  session: {
    create: vi.fn().mockResolvedValue({ success: true, session: { id: 'new-session' } }),
    get: vi.fn().mockResolvedValue({ success: true, session: { id: 'test-session' } }),
    list: vi.fn().mockResolvedValue({ success: true, sessions: [] }),
    update: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
});

/**
 * Test helper to setup window.electronAPI
 */
export const setupMockElectronAPI = (config?: any) => {
  const mockAPI = createMockElectronAPI(config);
  Object.defineProperty(window, 'electronAPI', {
    value: mockAPI,
    writable: true,
  });
  return mockAPI;
};

/**
 * Test helper to cleanup window.electronAPI
 */
export const cleanupMockElectronAPI = () => {
  delete (window as any).electronAPI;
};

/**
 * Test helper to mock useAppServices hook
 */
export const mockUseAppServices = (services: any, ready = true, error: string | null = null) => {
  vi.doMock('@/renderer/hooks/useAppServices', () => ({
    useAppServices: () => ({
      services,
      ready,
      error,
    }),
  }));
};

/**
 * Test helper to render a hook with mocked services
 */
export const renderHookWithServices = (hook: () => any, services: any) => {
  mockUseAppServices(services);
  return renderHook(hook);
};

/**
 * Test helper to test service-dependent components
 */
export const testServiceDependency = (
  hookName: string,
  hookFactory: () => any,
  requiredServices: string[]
) => {
  describe(`${hookName} Service Dependencies`, () => {
    it('should throw when required services are missing', () => {
      const incompleteServices = createProductionServiceContainer();

      // Remove required services one by one
      requiredServices.forEach(requiredService => {
        const services = { ...incompleteServices };
        services[requiredService as keyof typeof services] = null;

        mockUseAppServices(services);

        expect(() => {
          renderHook(hookFactory());
        }).toThrow();
      });
    });

    it('should work when all required services are available', () => {
      const completeServices = createCompleteServiceContainer();
      mockUseAppServices(completeServices);

      expect(() => {
        const { result } = renderHook(hookFactory());
        expect(result.current).toBeDefined();
      }).not.toThrow();
    });
  });
};

/**
 * Test helper to create a test component that uses services
 */
export const createTestComponent = (Component: React.ComponentType<any>, props?: any) => {
  return () => React.createElement(Component, props);
};

/**
 * Test helper to verify service initialization order
 */
export const testServiceInitializationOrder = async (
  serviceOrder: string[],
  initializationFunction: () => Promise<any>
) => {
  const initOrder: string[] = [];

  const mockServices = serviceOrder.reduce((acc, serviceName) => {
    acc[serviceName] = {
      init: vi.fn().mockImplementation(() => {
        initOrder.push(serviceName);
        return Promise.resolve();
      }),
    };
    return acc;
  }, {} as any);

  await initializationFunction();

  // Verify the initialization order
  serviceOrder.forEach((serviceName, index) => {
    expect(initOrder[index]).toBe(serviceName);
  });
};

/**
 * Test helper to simulate production error scenarios
 */
export const simulateProductionError = (errorType: 'missing_service' | 'null_service' | 'undefined_service') => {
  const baseServices = createProductionServiceContainer();

  switch (errorType) {
  case 'missing_service':
    // Remove sessionService key entirely
    const { sessionService, ...servicesWithoutSession } = baseServices;
    return servicesWithoutSession;

  case 'null_service':
    // Explicitly set sessionService to null (this is the production bug)
    return baseServices;

  case 'undefined_service':
    // Set sessionService to undefined
    return { ...baseServices, sessionService: undefined };

  default:
    return baseServices;
  }
};

/**
 * Test helper to validate error messages
 */
export const expectSpecificError = (error: any, expectedMessage: string) => {
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain(expectedMessage);
};

/**
 * Test helper to count available services
 */
export const countAvailableServices = (services: any) => {
  return Object.values(services).filter(service => service !== null && service !== undefined).length;
};

/**
 * Test helper to get missing service names
 */
export const getMissingServices = (services: any, requiredServices: string[]) => {
  return requiredServices.filter(serviceName =>
    services[serviceName] === null || services[serviceName] === undefined
  );
};

export default {
  createMockSessionService,
  createProductionServiceContainer,
  createCompleteServiceContainer,
  createMockElectronAPI,
  setupMockElectronAPI,
  cleanupMockElectronAPI,
  mockUseAppServices,
  renderHookWithServices,
  testServiceDependency,
  createTestComponent,
  testServiceInitializationOrder,
  simulateProductionError,
  expectSpecificError,
  countAvailableServices,
  getMissingServices,
};