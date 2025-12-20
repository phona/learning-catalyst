/**
 * @fileoverview Unit tests for app-init module
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the toast module before importing app-init
vi.mock('@/renderer/utils/toast', () => ({
  showError: vi.fn()
}));

import { validateConfig, handleInitError } from '../app-init';

describe('app-init module', () => {
  describe('validateConfig', () => {
    it('should return needsSetup=true when config is null', () => {
      const result = validateConfig(null);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('Electron API is unavailable.');
    });

    it('should return needsSetup=true when config is undefined', () => {
      const result = validateConfig(undefined);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('Electron API is unavailable.');
    });

    it('should return needsSetup=true when chat config is missing', () => {
      const config = {};
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('AI provider is not configured yet.');
    });

    it('should return needsSetup=true when provider is missing', () => {
      const config = {
        ai: {
          modelTypes: {
            chat: {
              model: 'gpt-4'
            }
          }
        }
      };
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('AI provider is not configured yet.');
    });

    it('should return needsSetup=true when model is missing', () => {
      const config = {
        ai: {
          modelTypes: {
            chat: {
              provider: 'openai'
            }
          }
        }
      };
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('AI provider is not configured yet.');
    });

    it('should return needsSetup=true when both provider and model are empty', () => {
      const config = {
        ai: {
          modelTypes: {
            chat: {
              provider: '',
              model: ''
            }
          }
        }
      };
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('AI provider is not configured yet.');
    });

    it('should return needsSetup=false when config is valid', () => {
      const config = {
        ai: {
          modelTypes: {
            chat: {
              provider: 'openai',
              model: 'gpt-4'
            }
          }
        }
      };
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(false);
      expect(result.message).toBeUndefined();
    });

    it('should handle nested ai config with empty modelTypes', () => {
      const config = {
        ai: {
          modelTypes: {}
        }
      };
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('AI provider is not configured yet.');
    });

    it('should handle partial config structure', () => {
      const config = {
        ai: {}
      };
      const result = validateConfig(config);
      expect(result.needsSetup).toBe(true);
      expect(result.message).toBe('AI provider is not configured yet.');
    });
  });

  describe('handleInitError', () => {
    it('should set init error for await-ready timeout', () => {
      const setInitError = vi.fn();
      const setStatus = vi.fn();
      const setStatusMessage = vi.fn();

      handleInitError(new Error('timeout'), 'await-ready', setInitError, setStatus, setStatusMessage);

      expect(setInitError).toHaveBeenCalledWith('System initialization timed out. Please restart the application.');
      expect(setStatus).not.toHaveBeenCalled();
      expect(setStatusMessage).not.toHaveBeenCalled();
    });

    it('should handle config load errors with Error instance', () => {
      const setInitError = vi.fn();
      const setStatus = vi.fn();
      const setStatusMessage = vi.fn();

      const error = new Error('Config not found');
      handleInitError(error, 'load-config', setInitError, setStatus, setStatusMessage);

      expect(setInitError).not.toHaveBeenCalled();
      expect(setStatus).toHaveBeenCalledWith('setup');
      expect(setStatusMessage).toHaveBeenCalledWith('Unable to load workspace configuration.');
    });

    it('should handle config load errors with non-Error instance (string)', () => {
      const setInitError = vi.fn();
      const setStatus = vi.fn();
      const setStatusMessage = vi.fn();

      handleInitError('Unknown error string', 'load-config', setInitError, setStatus, setStatusMessage);

      expect(setInitError).not.toHaveBeenCalled();
      expect(setStatus).toHaveBeenCalledWith('setup');
      expect(setStatusMessage).toHaveBeenCalledWith('Unable to load workspace configuration.');
    });

    it('should handle config load errors with non-Error instance (object)', () => {
      const setInitError = vi.fn();
      const setStatus = vi.fn();
      const setStatusMessage = vi.fn();

      handleInitError({ message: 'Object error' }, 'load-config', setInitError, setStatus, setStatusMessage);

      expect(setInitError).not.toHaveBeenCalled();
      expect(setStatus).toHaveBeenCalledWith('setup');
      expect(setStatusMessage).toHaveBeenCalledWith('Unable to load workspace configuration.');
    });

    it('should handle config load errors with null', () => {
      const setInitError = vi.fn();
      const setStatus = vi.fn();
      const setStatusMessage = vi.fn();

      handleInitError(null, 'load-config', setInitError, setStatus, setStatusMessage);

      expect(setInitError).not.toHaveBeenCalled();
      expect(setStatus).toHaveBeenCalledWith('setup');
      expect(setStatusMessage).toHaveBeenCalledWith('Unable to load workspace configuration.');
    });

    it('should handle config load errors with undefined', () => {
      const setInitError = vi.fn();
      const setStatus = vi.fn();
      const setStatusMessage = vi.fn();

      handleInitError(undefined, 'load-config', setInitError, setStatus, setStatusMessage);

      expect(setInitError).not.toHaveBeenCalled();
      expect(setStatus).toHaveBeenCalledWith('setup');
      expect(setStatusMessage).toHaveBeenCalledWith('Unable to load workspace configuration.');
    });
  });
});
