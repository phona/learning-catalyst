/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/ban-ts-comment */


import { describe, it, expect, vi } from "vitest";
import { createElectronAPIClient, createMockElectronAPIClient } from "../api/electron-api-client";
import { createSessionService } from "../session/session-service";
import { createAnalyticsService } from "../analytics/analytics-service";
import { createChatService } from "../chat/chat-service";
import { SessionDisplay } from "@/shared/types/session";

describe('Simplified electronAPI Abstraction', () => {
  describe('ElectronAPIClient', () => {
    it('should create real electronAPI client', () => {
      // Mock window.electronAPI for testing
      const mockElectronAPI = {
        analytics: {},
        sessions: {},
        chat: {},
        agents: {},
        knowledge: {}
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
  });

  describe('Session Service', () => {
    it('should work with new electronAPI client', async () => {
      const mockAPIClient = createMockElectronAPIClient();

      // Mock the sessions API
      mockAPIClient.sessions.getRecentSessions = vi.fn().mockResolvedValue({
        success: true,
        sessions: [
          { id: 'session-1', title: 'Test Session', lastActivity: '2023-01-01' } as SessionDisplay
        ]
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
        data: { totalSessions: 10, totalConcepts: 5 }
      });

      const analyticsService = createAnalyticsService(mockAPIClient);
      const dashboard = await analyticsService.getDashboard();

      expect(dashboard).toEqual({ totalSessions: 10, totalConcepts: 5 });
      expect(mockAPIClient.analytics.getDashboard).toHaveBeenCalled();
    });
  });
});