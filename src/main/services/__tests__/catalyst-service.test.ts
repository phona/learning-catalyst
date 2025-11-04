/**
 * Catalyst Service Main Tests
 *
 * Unit tests for the main Catalyst service orchestrator.
 * Tests service initialization, dependency injection, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CatalystServiceMain } from '@/main/services/catalyst/catalyst-service';
import { TestUtils, mockDatabase } from '../setup';

// Mock BrowserWindow
const mockBrowserWindow = {
  webContents: {
    postMessage: () => {},
    on: () => {},
    once: () => {},
    removeAllListeners: () => {}
  }
};

// Mock the createDatabase function
jest.mock('@/main/modules/database', () => ({
  createDatabase: async () => mockDatabase,
  runMigrations: async () => {},
  Database: {}
}));

describe('CatalystServiceMain', () => {
  let catalystService: CatalystServiceMain;
  const workspacePath = './test-workspace';

  beforeEach(() => {
    catalystService = new CatalystServiceMain();
  });

  afterEach(async () => {
    if (catalystService) {
      await catalystService.dispose();
    }
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid dependencies', async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);

      expect(catalystService.getStats().initialized).toBe(true);
      expect(catalystService.getService('database')).toBeDefined();
      expect(catalystService.getService('toolExecutor')).toBeDefined();
      expect(catalystService.getService('agentManager')).toBeDefined();
    });

    it('should throw error when initializing twice', async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);

      await expect(
        catalystService.initialize(mockBrowserWindow as any, workspacePath)
      ).rejects.toThrow('already been initialized');
    });

    it('should initialize core infrastructure services', async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);

      expect(catalystService.getService('config')).toBeDefined();
      expect(catalystService.getService('loggerFactory')).toBeDefined();
      expect(catalystService.getService('logger')).toBeDefined();
      expect(catalystService.getService('als')).toBeDefined();
      expect(catalystService.getService('mainWindow')).toBeDefined();
      expect(catalystService.getService('workspacePath')).toBeDefined();
    });

    it('should register dependencies object', async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);

      const dependencies = catalystService.getService('dependencies');
      expect(dependencies).toBeDefined();
      expect(dependencies.database).toBeDefined();
      expect(dependencies.toolExecutor).toBeDefined();
      expect(dependencies.agentManager).toBeDefined();
      expect(dependencies.config).toBeDefined();
      expect(dependencies.loggerFactory).toBeDefined();
      expect(dependencies.logger).toBeDefined();
      expect(dependencies.als).toBeDefined();
      expect(dependencies.registry).toBeDefined();
    });
  });

  describe('Service Access', () => {
    beforeEach(async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);
    });

    it('should return registered services', () => {
      const database = catalystService.getService('database');
      const toolExecutor = catalystService.getService('toolExecutor');
      const agentManager = catalystService.getService('agentManager');

      expect(database).toBeDefined();
      expect(toolExecutor).toBeDefined();
      expect(agentManager).toBeDefined();
    });

    it('should return undefined for non-existent services', () => {
      const nonExistent = catalystService.getService('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should throw error when accessing services before initialization', async () => {
      const uninitializedService = new CatalystServiceMain();

      expect(() => uninitializedService.getService('database')).toThrow('not been initialized');
    });
  });

  describe('Context Management', () => {
    beforeEach(async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);
    });

    it('should run functions within execution context', async () => {
      const result = await catalystService.runWithContext(
        'test-session',
        'test-operation',
        async () => {
          return 'test-result';
        },
        { test: 'metadata' }
      );

      expect(result).toBe('test-result');
    });

    it('should propagate context through async operations', async () => {
      const contextData: any[] = [];

      await catalystService.runWithContext(
        'test-session',
        'context-test',
        async () => {
          // Simulate nested async operation
          await new Promise(resolve => setTimeout(resolve, 10));

          // Get current context from logger factory
          const loggerFactory = catalystService.getService('loggerFactory');
          const currentContext = loggerFactory.getCurrentContext();

          if (currentContext) {
            contextData.push(currentContext);
          }
        }
      );

      expect(contextData).toHaveLength(1);
      expect(contextData[0].sessionId).toBe('test-session');
      expect(contextData[0].operation).toBe('context-test');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);
    });

    it('should provide comprehensive health status', async () => {
      const health = await catalystService.getHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');

      expect(health.services).toHaveProperty('catalystService');
      expect(health.services).toHaveProperty('database');
      expect(health.services).toHaveProperty('toolExecutor');
      expect(health.services).toHaveProperty('agentManager');

      // Check catalyst service health
      expect(health.services.catalystService.status).toBe('healthy');
      expect(health.services.catalystService.metrics.initialized).toBe(true);
      expect(health.services.catalystService.metrics.disposed).toBe(false);
    });

    it('should reflect service health accurately', async () => {
      const health = await catalystService.getHealth();

      // All services should be healthy in test environment
      Object.values(health.services).forEach(service => {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status);
        expect(service.lastCheck).toBeGreaterThan(0);
        expect(service.metrics).toBeDefined();
      });
    });
  });

  describe('Service Statistics', () => {
    beforeEach(async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);
    });

    it('should provide service statistics', () => {
      const stats = catalystService.getStats();

      expect(stats).toHaveProperty('initialized', true);
      expect(stats).toHaveProperty('disposed', false);
      expect(stats).toHaveProperty('registry');
      expect(stats).toHaveProperty('config');

      expect(stats.registry).toHaveProperty('totalServices');
      expect(stats.registry).toHaveProperty('registeredServices');
      expect(stats.registry).toHaveProperty('disposed', false);

      expect(Array.isArray(stats.registry.registeredServices)).toBe(true);
      expect(stats.registry.totalServices).toBeGreaterThan(0);
    });
  });

  describe('Service Disposal', () => {
    beforeEach(async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);
    });

    it('should dispose all services properly', async () => {
      expect(catalystService.getStats().initialized).toBe(true);

      await catalystService.dispose();

      expect(catalystService.getStats().disposed).toBe(true);
      expect(catalystService.getStats().initialized).toBe(false);
    });

    it('should throw error when accessing services after disposal', async () => {
      await catalystService.dispose();

      expect(() => catalystService.getService('database')).toThrow('has been disposed');
    });

    it('should handle multiple dispose calls gracefully', async () => {
      await catalystService.dispose();
      await expect(catalystService.dispose()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock database initialization to fail
      const originalCreateDatabase = require('@/main/modules/database').createDatabase;
      require('@/main/modules/database').createDatabase = async () => {
        throw new Error('Database initialization failed');
      };

      const faultyService = new CatalystServiceMain();

      await expect(
        faultyService.initialize(mockBrowserWindow as any, workspacePath)
      ).rejects.toThrow('Database initialization failed');

      // Service should be disposed after failed initialization
      expect(faultyService.getStats().disposed).toBe(true);

      // Restore original function
      require('@/main/modules/database').createDatabase = originalCreateDatabase;
    });

    it('should handle context execution errors', async () => {
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);

      await expect(
        catalystService.runWithContext(
          'test-session',
          'error-test',
          async () => {
            throw new Error('Context execution error');
          }
        )
      ).rejects.toThrow('Context execution error');
    });
  });

  describe('Development Features', () => {
    beforeEach(async () => {
      // Set development environment
      process.env.NODE_ENV = 'development';
      await catalystService.initialize(mockBrowserWindow as any, workspacePath);
    });

    it('should support force reinitialization in development', async () => {
      expect(catalystService.getStats().initialized).toBe(true);

      await catalystService.forceReinitialize(mockBrowserWindow as any, workspacePath);

      expect(catalystService.getStats().initialized).toBe(true);
      expect(catalystService.getService('database')).toBeDefined();
    });

    it('should throw error for force reinitialization in production', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';

      await expect(
        catalystService.forceReinitialize(mockBrowserWindow as any, workspacePath)
      ).rejects.toThrow('not allowed in production');

      // Reset to development for other tests
      process.env.NODE_ENV = 'development';
    });
  });
});