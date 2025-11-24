import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ServicesProvider } from "@/renderer/services/services-provider";
import { useChat } from "@/renderer/hooks/useChat";
import type { ChatService } from "@/renderer/services/chat/chat-service";
import type { SessionService } from "@/renderer/services/session/session-service";

const dummyApi = {} as any;

const stubSessionService: SessionService = {
  createSession: vi.fn().mockResolvedValue("session-auto"),
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
};

describe("useChat behavior coverage", () => {
  it("auto-creates a session and forwards sessionId to sendMessage", async () => {
    const chatService: ChatService = {
      createSession: vi.fn().mockResolvedValue("session-123"),
      getSession: vi.fn().mockResolvedValue({ id: "session-123", title: "t", status: "active" }),
      sendMessage: vi.fn(async (_content: string, options?: any) => ({
        id: "assistant-1",
        role: "assistant",
        content: "ok",
        timestamp: new Date(),
        sessionId: options?.sessionId,
      })),
      sendMessageStream: vi.fn(),
      checkPracticeOpportunity: vi.fn(),
      getAvailableAgents: vi.fn(),
      cancelExecution: vi.fn(),
      getProviderInfo: () => ({ name: "mock" }),
    } as unknown as ChatService;

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider apiClient={dummyApi} overrides={{ chatService, sessionService: stubSessionService }}>
        {children}
      </ServicesProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("hello auto");
    });

    expect(chatService.createSession).toHaveBeenCalled();
    expect(chatService.sendMessage).toHaveBeenCalledWith("hello auto", expect.objectContaining({ sessionId: "session-123" }));
    const roles = result.current.messages.map((m) => m.role);
    expect(roles).toContain("assistant");
  });

  it("uses selected agent when sending messages", async () => {
    const chatService: ChatService = {
      createSession: vi.fn().mockResolvedValue("session-agent"),
      getSession: vi.fn().mockResolvedValue({ id: "session-agent", title: "t", status: "active" }),
      sendMessage: vi.fn(async (_content: string, options?: any) => ({
        id: "assistant-2",
        role: "assistant",
        content: `agent=${options?.agentId ?? "none"}`,
        timestamp: new Date(),
      })),
      sendMessageStream: vi.fn(),
      checkPracticeOpportunity: vi.fn(),
      getAvailableAgents: vi.fn(),
      cancelExecution: vi.fn(),
      getProviderInfo: () => ({ name: "mock" }),
    } as unknown as ChatService;

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider apiClient={dummyApi} overrides={{ chatService, sessionService: stubSessionService }}>
        {children}
      </ServicesProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.setSelectedAgent("agent-42");
    });

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    expect(chatService.sendMessage).toHaveBeenCalledWith("hi", expect.objectContaining({ agentId: "agent-42" }));
    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.content).toContain("agent=agent-42");
  });
});
