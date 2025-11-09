/**
 * useChatStore Error Scenarios Test
 *
 * Specifically tests the error conditions that would cause useChatStore to fail.
 * This test focuses on the exact production error without requiring UI startup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock useAppServices before importing useChatStore
vi.mock('@/renderer/hooks/useAppServices', () => ({
  useAppServices: vi.fn(),
}));

// Import the hook we're testing (after mocking its dependency)
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useAppServices } from '@/renderer/hooks/useAppServices';

describe('useChatStore Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Missing SessionService Error', () => {
    it('should throw error when sessionService is null', () => {
      // Mock useAppServices to return the exact production scenario
      (useAppServices as any).mockReturnValue({
        services: {
          sessionService: null, // This is the production bug
          analytics: { trackEvent: vi.fn() },
          configService: null,
          agentManager: null,
          conceptParsing: null,
          contentDiscovery: null,
          database: null,
          knowledgeGraph: null,
          vectorDatabase: null,
        },
        ready: true,
        error: null,
      });

      // This should throw the exact error seen in production
      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow('SessionService is required but not available. Make sure ServiceProvider is properly configured.');
    });

    it('should throw error when services is null', () => {
      (useAppServices as any).mockReturnValue({
        services: null,
        ready: false,
        error: 'Services not initialized',
      });

      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow('SessionService is required but not available. Make sure ServiceProvider is properly configured.');
    });

    it('should throw error when services is undefined', () => {
      (useAppServices as any).mockReturnValue({
        services: undefined,
        ready: false,
        error: null,
      });

      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow('SessionService is required but not available. Make sure ServiceProvider is properly configured.');
    });
  });

  describe('Valid SessionService Scenarios', () => {
    it('should work when sessionService is provided', () => {
      const mockSessionService = {
        saveSession: vi.fn(),
        getSession: vi.fn(),
        deleteSession: vi.fn(),
        generateAITitle: vi.fn(),
        saveSessionWithMessages: vi.fn(),
        updateSessionTitle: vi.fn(),
        saveMessage: vi.fn(),
      };

      (useAppServices as any).mockReturnValue({
        services: {
          sessionService: mockSessionService,
          analytics: { trackEvent: vi.fn() },
          configService: null,
          agentManager: null,
          conceptParsing: null,
          contentDiscovery: null,
          database: null,
          knowledgeGraph: null,
          vectorDatabase: null,
        },
        ready: true,
        error: null,
      });

      expect(() => {
        const { result } = renderHook(() => useChatStore());
        expect(result.current).toBeDefined();

        // Verify the store has expected methods
        expect(typeof result.current.setCurrentSession).toBe('function');
        expect(typeof result.current.sendMessage).toBe('function');
        expect(typeof result.current.createNewSession).toBe('function');
      }).not.toThrow();
    });

    it('should work with minimal sessionService implementation', () => {
      const minimalSessionService = {
        // Only the methods that are actually required by the store
        saveSession: vi.fn(),
        getSession: vi.fn(),
        generateAITitle: vi.fn(),
        saveSessionWithMessages: vi.fn(),
        updateSessionTitle: vi.fn(),
        saveMessage: vi.fn(),
      };

      (useAppServices as any).mockReturnValue({
        services: {
          sessionService: minimalSessionService,
          analytics: { trackEvent: vi.fn() },
          configService: null,
          agentManager: null,
          conceptParsing: null,
          contentDiscovery: null,
          database: null,
          knowledgeGraph: null,
          vectorDatabase: null,
        },
        ready: true,
        error: null,
      });

      expect(() => {
        const { result } = renderHook(() => useChatStore());
        expect(result.current).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Error Message Validation', () => {
    it('should have specific error message mentioning ServiceProvider', () => {
      (useAppServices as any).mockReturnValue({
        services: { sessionService: null },
        ready: true,
        error: null,
      });

      try {
        renderHook(() => useChatStore());
        fail('Expected useChatStore to throw an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('SessionService is required');
        expect((error as Error).message).toContain('ServiceProvider');
        expect((error as Error).message).toContain('properly configured');
      }
    });
  });

  describe('Service Caching Behavior', () => {
    it('should handle service changes correctly', () => {
      let servicesData = {
        sessionService: null as any,
        analytics: { trackEvent: vi.fn() },
        configService: null,
        agentManager: null,
        conceptParsing: null,
        contentDiscovery: null,
        database: null,
        knowledgeGraph: null,
        vectorDatabase: null,
      };

      (useAppServices as any).mockImplementation(() => ({
        services: servicesData,
        ready: true,
        error: null,
      }));

      // First call - should throw because sessionService is null
      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow();

      // Update servicesData to have a sessionService
      servicesData.sessionService = {
        saveSession: vi.fn(),
        getSession: vi.fn(),
        generateAITitle: vi.fn(),
      };

      // Second call - should work
      expect(() => {
        const { result } = renderHook(() => useChatStore());
        expect(result.current).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Production Scenario Reproduction', () => {
    it('should reproduce the exact production state', () => {
      // This reproduces the exact error you see in the browser console
      const productionState = {
        services: {
          sessionService: null, // This is the issue in useAppServices.ts:52
          analytics: expect.any(Object), // Only analytics is initialized
          configService: null,
          agentManager: null,
          conceptParsing: null,
          contentDiscovery: null,
          database: null,
          knowledgeGraph: null,
          vectorDatabase: null,
        },
        ready: true,
        error: null,
      };

      (useAppServices as any).mockReturnValue(productionState);

      // This should throw the exact same error that appears in the browser
      expect(() => {
        renderHook(() => useChatStore());
      }).toThrow('SessionService is required but not available. Make sure ServiceProvider is properly configured.');
    });
  });
});