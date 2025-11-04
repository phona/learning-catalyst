/**
 * Test Dependency Injection Container
 *
 * Simple test to verify DI container functionality without React components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Dependency Injection Container', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Container Factory', () => {
    it('should create service container factory function', async () => {
      const { createServiceContainer } = await import('services/container');

      // This test verifies that the factory function exists
      expect(typeof createServiceContainer).toBe('function');
    });

    it('should have ServiceContainerManager class', async () => {
      const module = await import('services/container');

      // This test verifies that the manager class exists
      expect(module.ServiceContainerManager).toBeDefined();
      expect(typeof module.ServiceContainerManager).toBe('function');
    });

    it('should have proper types exported', async () => {
      const module = await import('services/container');

      // Verify key exports exist
      expect(typeof module.createServiceContainer).toBe('function');
      expect(module.ServiceContainerManager).toBeDefined();
    });
  });

  describe('Service Interface Types', () => {
    it('should export ServiceContainer type', async () => {
      const module = await import('services/container');

      // The module should have the ServiceContainer type
      expect(module).toBeDefined();
      // We can't directly test types at runtime, but we can verify the module exports
      expect(Object.keys(module).length).toBeGreaterThan(0);
    });
  });
});