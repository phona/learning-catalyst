import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLoggerService } from '../logger-service';

describe('Logger Service - Interface Tests', () => {
  let loggerService: ReturnType<typeof createLoggerService>;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerService = createLoggerService();
  });

  describe('Service Creation', () => {
    it('should create logger service with required methods', () => {
      expect(loggerService).toHaveProperty('child');
      expect(typeof loggerService.child).toBe('function');
    });
  });

  describe('Child Logger Creation', () => {
    it('should create child logger with metadata', () => {
      const childLogger = loggerService.child({ service: 'test-service' });

      expect(childLogger).toHaveProperty('info');
      expect(childLogger).toHaveProperty('debug');
      expect(childLogger).toHaveProperty('warn');
      expect(childLogger).toHaveProperty('error');
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.error).toBe('function');
    });

    it('should create child logger with multiple metadata fields', () => {
      const childLogger = loggerService.child({
        service: 'test-service',
        component: 'test-component',
        userId: 'user-123'
      });

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should create child logger without metadata', () => {
      const childLogger = loggerService.child();

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('Logger Methods', () => {
    it('should log info messages', () => {
      const childLogger = loggerService.child({ service: 'test' });

      expect(() => childLogger.info('Test message')).not.toThrow();
      expect(() => childLogger.info('Test message', { key: 'value' })).not.toThrow();
    });

    it('should log debug messages', () => {
      const childLogger = loggerService.child({ service: 'test' });

      expect(() => childLogger.debug('Debug message')).not.toThrow();
      expect(() => childLogger.debug('Debug message', { debug: true })).not.toThrow();
    });

    it('should log warning messages', () => {
      const childLogger = loggerService.child({ service: 'test' });

      expect(() => childLogger.warn('Warning message')).not.toThrow();
      expect(() => childLogger.warn('Warning message', { warning: true })).not.toThrow();
    });

    it('should log error messages', () => {
      const childLogger = loggerService.child({ service: 'test' });

      expect(() => childLogger.error('Error message')).not.toThrow();
      expect(() => childLogger.error('Error message', new Error('Test error'))).not.toThrow();
    });

    it('should handle complex metadata objects', () => {
      const childLogger = loggerService.child({ service: 'test' });

      const complexMetadata = {
        user: { id: '123', name: 'Test' },
        actions: ['action1', 'action2'],
        timestamp: new Date(),
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      expect(() => childLogger.info('Complex metadata', complexMetadata)).not.toThrow();
    });
  });

  describe('Multiple Child Loggers', () => {
    it('should create multiple independent child loggers', () => {
      const child1 = loggerService.child({ service: 'service1' });
      const child2 = loggerService.child({ service: 'service2' });

      expect(child1).toBeDefined();
      expect(child2).toBeDefined();
      expect(child1).not.toBe(child2);

      expect(() => child1.info('Message from service 1')).not.toThrow();
      expect(() => child2.info('Message from service 2')).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references in metadata', () => {
      const childLogger = loggerService.child({ service: 'test' });

      const circularMetadata: any = { prop: 'value' };
      circularMetadata.self = circularMetadata;

      expect(() => childLogger.info('Circular reference', circularMetadata)).not.toThrow();
    });

    it('should handle undefined metadata', () => {
      const childLogger = loggerService.child({ service: 'test' });

      expect(() => childLogger.info('Message', undefined as any)).not.toThrow();
    });

    it('should handle null metadata', () => {
      const childLogger = loggerService.child({ service: 'test' });

      expect(() => childLogger.info('Message', null as any)).not.toThrow();
    });
  });
});