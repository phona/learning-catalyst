import { describe, it, expect, vi } from "vitest";
import { setupChatHandlers } from "../handlers/chat-handlers";
import type { ChatService } from "../services/domain/chat/chat-service";
import type { PracticeService } from "../services/domain/practice/practice-service";
import { createIpcPair } from "@/test/utils/fakes/ipc-fake";

const makeDeps = () => {
  const chatService: Partial<ChatService> = {
    createConversation: vi.fn(async ({ title, agentType }) => ({
      id: "conv-new",
      title,
      agentType,
      status: "active",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
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
        content: "ok",
        timestamp: new Date().toISOString(),
        status: "completed",
      },
    })),
    streamAssistantResponse: vi.fn(async () => ({
      stream: (async function* () {
        yield { type: "delta", content: "hello" };
        yield { type: "delta", content: " world" };
        return { type: "done" };
      })(),
    })),
    getTypingIndicator: vi.fn(async () => ({ isTyping: true, agentInfo: { name: "Bot" } } as any)),
    getConversation: vi.fn(async () => ({
      id: "conv-1",
      status: "active",
      agentType: "learning",
      messages: [
        {
          id: "m1",
          conversationId: "conv-1",
          role: "user",
          content: "hi?",
          timestamp: new Date().toISOString(),
        },
        {
          id: "m2",
          conversationId: "conv-1",
          role: "assistant",
          content: "hey",
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    pauseConversation: vi.fn(async () => undefined),
    resumeConversation: vi.fn(async () => undefined),
    endConversation: vi.fn(async () => undefined),
  };

  const practiceService: Partial<PracticeService> = {
    generatePracticePlan: vi.fn(async () => ({
      summary: "plan",
      exercises: [{ title: "q1", difficulty: "medium" }],
      focusConcepts: ["arrays"],
      suggestions: ["keep practicing"],
    })),
  };

  const loggerService = {
    child: () => ({ info: vi.fn(), error: vi.fn() }),
  };

  return {
    chatService: chatService as ChatService,
    practiceService: practiceService as PracticeService,
    loggerService,
  };
};

describe("chat IPC contract with fake ipc pair", () => {
  it("handles chat:send-message and returns assistant message", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const result = await ipcRenderer.invoke("chat:send-message", {
      conversationId: "conv-1",
      message: "hello",
    });

    expect(result.success).toBe(true);
    expect(result.data?.assistantMessage?.content).toBe("ok");
    expect(deps.chatService.sendMessage).toHaveBeenCalledWith({
      conversationId: "conv-1",
      role: "user",
      content: "hello",
      attachments: undefined,
    });
  });

  it("propagates chat service errors for chat:send-message", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    deps.chatService.sendMessage = vi.fn(async () => {
      throw new Error("boom");
    }) as any;
    setupChatHandlers(ipcMain as any, deps);

    await expect(
      ipcRenderer.invoke("chat:send-message", { conversationId: "conv-err", message: "hi" }),
    ).rejects.toThrow(/boom/);
  });

  it("returns failure when requesting practice suggestion without opportunity", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const result = await ipcRenderer.invoke("chat:get-practice-suggestion", {
      conversationId: "conv-2",
      userMessage: "plain statement without question",
      userContext: { id: "u1", preferences: {} },
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("chat.practice_missing_opportunity");
  });

  it("detects practice opportunity via question", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const result = await ipcRenderer.invoke("chat:check-practice-opportunity", {
      conversationId: "conv-3",
      userMessage: "Can you quiz me on arrays?",
    });

    expect(result.success).toBe(true);
    expect(result.data?.hasOpportunity).toBe(true);
  });

  it("returns suggestion when opportunity exists", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const result = await ipcRenderer.invoke("chat:get-practice-suggestion", {
      conversationId: "conv-4",
      userMessage: "Can you quiz me on arrays?",
      userContext: { id: "u1", preferences: { practiceFrequency: "high" } },
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toContain("suggestion");
    expect(result.data?.options?.accept).toBeDefined();
  });

  it("pauses, resumes, and ends conversation", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const pause = await ipcRenderer.invoke("chat:pause-conversation", "conv-5");
    const resume = await ipcRenderer.invoke("chat:resume-conversation", "conv-5");
    const end = await ipcRenderer.invoke("chat:end-conversation", "conv-5");

    expect(pause.success).toBe(true);
    expect(resume.success).toBe(true);
    expect(end.success).toBe(true);
    expect(deps.chatService.pauseConversation).toHaveBeenCalled();
    expect(deps.chatService.resumeConversation).toHaveBeenCalled();
    expect(deps.chatService.endConversation).toHaveBeenCalled();
  });

  it("returns typing indicator", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const res = await ipcRenderer.invoke("chat:get-typing-indicator", "conv-typing");
    expect(res.success).toBe(true);
    expect(res.data?.isTyping).toBe(true);
  });

  it("returns conversation history", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const res = await ipcRenderer.invoke("chat:get-history", { conversationId: "conv-1" });
    expect(res.success).toBe(true);
    expect(res.data?.messages).toHaveLength(2);
    expect(res.data?.messages?.[0]?.role).toBe("user");
  });

  it("starts conversation", async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();
    const deps = makeDeps();
    setupChatHandlers(ipcMain as any, deps);

    const res = await ipcRenderer.invoke("chat:start-conversation", {
      agentType: "learning",
      topic: "typescript",
    });
    expect(res.success).toBe(true);
    expect(res.data?.id).toBe("conv-new");
  });
});
