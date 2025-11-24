/* eslint-disable @typescript-eslint/ban-ts-comment */

import { describe, it, expect, vi } from 'vitest';
import {
  createElectronAPIClient,
  createMockElectronAPIClient,
  createElectronAPIClientWith,
} from '../api/electron-api-client';
import { createSessionService } from '../session/session-service';
import { createAnalyticsService } from '../analytics/analytics-service';
import { createChatService } from '../chat/chat-service';
import type { SessionDisplay } from '@/renderer/types/session';

describe('Simplified electronAPI Abstraction', () => {
  describe('ElectronAPI client', () => {
    it('should create real electronAPI client', () => {
      // Mock window.electronAPI for testing
      const mockElectronAPI = {
        analytics: {},
        sessions: {},
        chat: {},
        agents: {},
        knowledge: {},
      };

      // @ts-ignore: Allow setting window.electronAPI for testing
      window.electronAPI = mockElectronAPI;

      const client = createElectronAPIClient();

      expect(client.analytics).toBeDefined();
      expect(client.sessions).toBeDefined();
      expect(client.chat).toBeDefined();
      expect(client.agents).toBeDefined();
      expect(client.knowledge).toBeDefined();
    });

    it('should create mock electronAPI client', () => {
      const client = createMockElectronAPIClient();

      expect(client.analytics).toBeDefined();
      expect(client.sessions).toBeDefined();
      expect(client.chat).toBeDefined();
      expect(client.agents).toBeDefined();
      expect(client.knowledge).toBeDefined();
    });

    it('falls back to mock client when window.electronAPI missing', () => {
      // @ts-ignore deliberate undefined
      window.electronAPI = undefined;
      const client = createElectronAPIClient();
      expect(client.analytics?.getDashboard).toBeDefined();
    });

    it('createElectronAPIClientWith returns provided implementation', () => {
      const marker = { foo: 'bar' } as any;
      const client = createElectronAPIClientWith(marker);
      expect(client).toBe(marker);
    });
  });

  describe('Session Service', () => {
    it('should work with new electronAPI client', async () => {
      const mockAPIClient = createMockElectronAPIClient();

      // Mock the sessions API
      mockAPIClient.sessions.getRecentSessions = vi.fn().mockResolvedValue({
        success: true,
        data: [
          { id: 'session-1', title: 'Test Session', lastActivity: '2023-01-01' } as SessionDisplay,
        ],
      });

      const sessionService = createSessionService(mockAPIClient);
      const sessions = await sessionService.getRecentSessions(5);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('session-1');
      expect(mockAPIClient.sessions.getRecentSessions).toHaveBeenCalledWith({ limit: 5 });
    });
  });

  describe('Analytics Service', () => {
    it('should work with new electronAPI client', async () => {
      const mockAPIClient = createMockElectronAPIClient();

      // Mock the analytics API
      mockAPIClient.analytics.getDashboard = vi.fn().mockResolvedValue({
        success: true,
        data: { totalSessions: 10, totalConcepts: 5 },
      });

      const analyticsService = createAnalyticsService(mockAPIClient);
      const dashboard = await analyticsService.getDashboard();

      expect(dashboard).toEqual({ totalSessions: 10, totalConcepts: 5 });
      expect(mockAPIClient.analytics.getDashboard).toHaveBeenCalled();
    });
  });
});
