import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ServicesProvider } from "@/renderer/services/services-provider";
import { useChat } from "@/renderer/hooks/useChat";
import type { ChatService } from "@/renderer/services/chat/chat-service";
import type { SessionService } from "@/renderer/services/session/session-service";

const makeFailingChatService = (): ChatService => {
  return {
    sendMessage: vi.fn(async () => {
      throw new Error("network down");
    }),
    sendMessageStream: vi.fn(),
    checkPracticeOpportunity: vi.fn(),
    getSession: vi.fn(),
    createSession: vi.fn().mockResolvedValue("session-err"),
    updateSession: vi.fn(),
    getAvailableAgents: vi.fn(),
    cancelExecution: vi.fn(),
    getProviderInfo: () => ({ name: "default" }),
  } as unknown as ChatService;
};

const makeSessionService = (): SessionService => ({
  createSession: vi.fn().mockResolvedValue("session-err"),
  saveSessionWithMessages: vi.fn(),
  getRecentSessions: vi.fn(),
  getGlobalStatistics: vi.fn(),
  listSessions: vi.fn(),
  getSession: vi.fn(),
  deleteSession: vi.fn(),
  searchSessions: vi.fn(),
  generateAITitle: vi.fn(),
  generateSessionId: vi.fn(),
  saveMessage: vi.fn(),
  updateSessionTitle: vi.fn(),
});

describe("useChat error handling", () => {
  it("sets error when sendMessage rejects", async () => {
    const chatService = makeFailingChatService();
    const sessionService = makeSessionService();

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider
        apiClient={{} as any}
        overrides={{
          chatService,
          sessionService,
          analyticsService: {} as any,
          discoveryService: {} as any,
          catalystService: {} as any,
          configService: {} as any,
          fileService: {} as any,
          conceptParsing: {} as any,
          agentService: {} as any,
        }}
      >
        {children}
      </ServicesProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    let thrown: Error | null = null;
    try {
      await act(async () => {
        await result.current.sendMessage("hi there");
      });
    } catch (err) {
      thrown = err as Error;
    }

    expect(result.current.error).toBe("network down");
    expect(chatService.sendMessage).toHaveBeenCalledTimes(1);
    // Hook handles error and sets state; it should not throw to caller
    expect(thrown).toBeNull();
  });
});
