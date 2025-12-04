import React from "react";
import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import type { ChatService } from "@/renderer/services/chat/chat-service";
import type { SessionService } from "@/renderer/services/session/session-service";
import { ServicesProvider } from "@/renderer/services/services-provider";
import { useChat } from "@/renderer/hooks/useChat";
import type { Message, StreamChunk } from "@/shared/types/ai";

// Minimal stub api client; not used because we override services
const dummyApi = {} as any;

const createStubChatService = () => {
  const streamChunks: StreamChunk[] = [
    { type: "content", content: "partial ", id: "c1" },
    { type: "content", content: "answer", id: "c2" },
    { type: "status", status: { type: "retry", attempt: 1, max: 2, reason: "Rate limited" } },
  ];

  const sendMessageStream = vi.fn(async (_content: string, onChunk: (c: StreamChunk) => void): Promise<Message> => {
    streamChunks.forEach(onChunk);
    return {
      id: "assistant-1",
      role: "assistant",
      content: "partial answer",
      timestamp: new Date(),
    };
  });

  const sendMessage = vi.fn();
  const checkPracticeOpportunity = vi.fn();
  const createSession = vi.fn().mockResolvedValue("session-1");

  return { sendMessageStream, sendMessage, checkPracticeOpportunity, createSession } as unknown as ChatService;
};

const stubSessionService: SessionService = {
  createSession: vi.fn().mockResolvedValue("session-1"),
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

describe("useChat streaming integration (no Electron)", () => {
  it("streams chunks and finalizes assistant message", async () => {
    const chatService = createStubChatService();

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider apiClient={dummyApi} overrides={{ chatService, sessionService: stubSessionService }}>
        {children}
      </ServicesProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessageStream("hello world");
    });

    expect(chatService.sendMessageStream).toHaveBeenCalled();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages.map((m) => m.role)).toEqual(["user", "system", "assistant"]);
    expect(result.current.messages[2]?.content).toBe("partial answer");
  });

  it("surfaces status chunks as system messages", async () => {
    const chatService = createStubChatService();

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider apiClient={dummyApi} overrides={{ chatService, sessionService: stubSessionService }}>
        {children}
      </ServicesProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessageStream("hello world");
    });

    const systemMessages = result.current.messages.filter((m) => m.role === "system");
    expect(systemMessages.length).toBeGreaterThan(0);
    expect(systemMessages[0].content).toMatch(/Retry 1\/2/i);
  });
});
