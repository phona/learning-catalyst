import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ServicesProvider } from "@/renderer/services/services-provider";
import { createChatService } from "@/renderer/services/chat/chat-service";
import { setupChatHandlers } from "@/main/handlers/chat-handlers";
import type { ChatService } from "@/main/services/domain/chat/chat-service";
import type { PracticeService } from "@/main/services/domain/practice/practice-service";
import type { ElectronAPI } from "@/shared/types/electron-api";
import { createIpcPair } from "@/test/utils/fakes/ipc-fake";
import { useChat } from "@/renderer/hooks/useChat";
import { vi } from "vitest";

// Minimal fake dependencies for main chat handlers
const makeDeps = () => {
  const chatService: Partial<ChatService> = {
    sendMessage: vi.fn(async ({ conversationId, content }) => ({
      userMessage: {
        id: "u1",
        conversationId,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
        status: "sent",
      },
      assistantMessage: {
        id: "a1",
        conversationId,
        role: "assistant",
        content: "ok from main",
        timestamp: new Date().toISOString(),
        status: "completed",
      },
    })),
    getTypingIndicator: vi.fn(async () => ({ isTyping: true, agentInfo: { name: "Bot" } } as any)),
    pauseConversation: vi.fn(async () => undefined),
    resumeConversation: vi.fn(async () => undefined),
    endConversation: vi.fn(async () => undefined),
    getConversation: vi.fn(async () => ({
      id: "conv-1",
      status: "active",
      agentType: "learning",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    createConversation: vi.fn(async () => ({
      id: "conv-1",
      title: "Untitled",
      status: "active",
      agentType: "learning",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };

  const practiceService: Partial<PracticeService> = {
    generatePracticePlan: vi.fn(async () => ({
      summary: "plan",
      exercises: [{ title: "q1", difficulty: "medium" }],
      focusConcepts: ["topic"],
      suggestions: [],
    })),
  };

  const loggerService = { child: () => ({ info: vi.fn(), error: vi.fn() }) };

  return {
    chatService: chatService as ChatService,
    practiceService: practiceService as PracticeService,
    loggerService,
  };
};

describe("useChat with main handlers via fake IPC", () => {
  it("sends message end-to-end through main handler", async () => {
    const ipc = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipc.ipcMain as any, deps);

    const electronAPI = {
      chat: {
        sendMessage: async (params: any) => {
          const res = await ipc.ipcRenderer.invoke("chat:send-message", params);
          const assistant = res.data?.assistantMessage ?? res.data;
          return { success: res.success, data: assistant, error: res.error };
        },
        getTypingIndicator: (id: string) => ipc.ipcRenderer.invoke("chat:get-typing-indicator", id),
        sendMessageStream: vi.fn(),
        startConversation: (params: any) => ipc.ipcRenderer.invoke("chat:start-conversation", params),
        checkPracticeOpportunity: (params: any) => ipc.ipcRenderer.invoke("chat:check-practice-opportunity", params),
        getPracticeSuggestion: (params: any) => ipc.ipcRenderer.invoke("chat:get-practice-suggestion", params),
        getConversationHistory: (params: any) => ipc.ipcRenderer.invoke("chat:get-history", params),
        pauseConversation: (id: string) => ipc.ipcRenderer.invoke("chat:pause-conversation", id),
        resumeConversation: (id: string) => ipc.ipcRenderer.invoke("chat:resume-conversation", id),
        endConversation: (id: string) => ipc.ipcRenderer.invoke("chat:end-conversation", id),
      },
      sessions: {
        create: async ({ title }: { title: string }) => ({ success: true, data: { sessionId: "conv-1", session: { id: "conv-1", title } } }),
        get: async (id: string) => ({ success: true, data: { id, title: "t" } }),
        update: async () => ({ success: true, data: undefined }),
        list: async () => ({ success: true, data: { sessions: [], total: 0, hasMore: false } }),
        delete: async () => ({ success: true, data: { deleted: true } }),
        saveMessage: async () => ({ success: true, data: undefined }),
        saveSessionWithMessages: async () => ({ success: true, data: { sessionId: "conv-1" } }),
        updateTitle: async () => ({ success: true, data: undefined }),
        getRecentSessions: async () => ({ success: true, data: [] }),
        search: async () => ({ success: true, data: { results: [], total: 0 } }),
        getStatistics: async () => ({ success: true, data: { totalSessions: 0, totalMessages: 0, totalUserMessages: 0, totalAssistantMessages: 0, totalTokensUsed: 0, averageMessagesPerSession: 0 } }),
      },
      agents: { getAvailableAgents: async () => ({ success: true, data: [] }) },
      catalyst: { cancelAgent: async () => ({ success: true }) },
    } as unknown as ElectronAPI;

    const chatService = createChatService(electronAPI);

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider
        apiClient={electronAPI}
        overrides={{ chatService, sessionService: {} as any, analyticsService: {} as any, discoveryService: {} as any, catalystService: {} as any, configService: {} as any, fileService: {} as any, conceptParsing: {} as any, agentService: {} as any }}
      >
        {children}
      </ServicesProvider>
    );

    const { result } = renderHook(() => useChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage("hello world");
    });

    expect(deps.chatService.sendMessage).toHaveBeenCalled();
    const assistant = result.current.messages.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("ok from main");
  });

  it("fetches typing indicator via main handler", async () => {
    const ipc = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipc.ipcMain as any, deps);

    const electronAPI = {
      chat: {
        sendMessage: vi.fn(),
        sendMessageStream: vi.fn(),
        startConversation: vi.fn(),
        getTypingIndicator: (id: string) => ipc.ipcRenderer.invoke("chat:get-typing-indicator", id),
        checkPracticeOpportunity: vi.fn(),
        getPracticeSuggestion: vi.fn(),
        getConversationHistory: vi.fn(),
        pauseConversation: vi.fn(),
        resumeConversation: vi.fn(),
        endConversation: vi.fn(),
      },
      sessions: {
        create: async () => ({ success: true, data: { sessionId: "conv-typing" } }),
        get: async () => ({ success: true, data: { id: "conv-typing", title: "t" } }),
        update: async () => ({ success: true, data: undefined }),
        list: async () => ({ success: true, data: { sessions: [], total: 0, hasMore: false } }),
        delete: async () => ({ success: true, data: { deleted: true } }),
        saveMessage: async () => ({ success: true, data: undefined }),
        saveSessionWithMessages: async () => ({ success: true, data: { sessionId: "conv-typing" } }),
        updateTitle: async () => ({ success: true, data: undefined }),
        getRecentSessions: async () => ({ success: true, data: [] }),
        search: async () => ({ success: true, data: { results: [], total: 0 } }),
        getStatistics: async () => ({
          success: true,
          data: {
            totalSessions: 0,
            totalMessages: 0,
            totalUserMessages: 0,
            totalAssistantMessages: 0,
            totalTokensUsed: 0,
            averageMessagesPerSession: 0,
          },
        }),
      },
      agents: { getAvailableAgents: async () => ({ success: true, data: [] }) },
      catalyst: { cancelAgent: async () => ({ success: true }) },
    } as unknown as ElectronAPI;

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <ServicesProvider
        apiClient={electronAPI}
        overrides={{
          chatService: createChatService(electronAPI),
          sessionService: {} as any,
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

    const indicator = await act(async () => result.current.getAvailableAgents()); // trigger hook usage
    const typing = await electronAPI.chat.getTypingIndicator("conv-typing");

    expect(typing.success).toBe(true);
    expect(typing.data?.isTyping).toBe(true);
  });
});
