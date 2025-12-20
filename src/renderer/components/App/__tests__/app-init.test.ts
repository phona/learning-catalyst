/**
 * @fileoverview Unit tests for app-init module
 */

import { describe, it, expect, vi } from 'vitest';

import { validateConfig } from '../app-init';

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
});
