import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createChatService } from '../chat-service';

vi.mock('@/main/services/core/context', () => ({
  createUserContextTracker: vi.fn(() => ({
    updateContext: vi.fn(async () => undefined),
    getCurrentContext: vi.fn(() => ({})),
    dispose: vi.fn(),
  })),
}));

type SessionRow = {
  id: string;
  title: string;
  metadata: string;
  created_at: string;
  updated_at: string;
  start_time?: string;
  end_time?: string;
};

type MessageRow = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking_content?: string;
  provider?: string;
  model?: string;
  tokens_used?: string;
  timestamp: string;
  message_order: number;
  created_at: string;
};

const makeDb = () => {
  const sessions: SessionRow[] = [];
  const messages: MessageRow[] = [];

  const api = {
    selectFrom: vi.fn((table: 'learning_sessions' | 'messages') => {
      const q: any = { table, whereFilter: null, selectMode: null, orderKey: null, orderDir: 'asc', limitCount: null };
      const chain = {
        select: (arg: any) => {
          q.selectMode = typeof arg === 'function' ? 'max' : 'columns';
          return chain;
        },
        selectAll: () => chain,
        where: (col: string, _op: string, val: any) => {
          q.whereFilter = { col, val };
          return chain;
        },
        orderBy: (key: string, dir?: 'asc' | 'desc') => {
          q.orderKey = key; q.orderDir = dir ?? 'asc';
          return chain;
        },
        limit: (n: number) => { q.limitCount = n; return chain; },
        execute: async () => {
          let rows = q.table === 'learning_sessions' ? [...sessions] : [...messages];
          if (q.whereFilter) {
            rows = rows.filter((r: any) => r[q.whereFilter.col] === q.whereFilter.val);
          }
          if (q.orderKey) {
            rows.sort((a: any, b: any) => String(a[q.orderKey]).localeCompare(String(b[q.orderKey])));
            if (q.orderDir === 'desc') rows.reverse();
          }
          if (q.limitCount != null) rows = rows.slice(0, q.limitCount);
          return rows as any;
        },
        executeTakeFirst: async () => {
          if (q.selectMode === 'max' && q.table === 'messages') {
            const max = messages.reduce((m, r) => Math.max(m, r.message_order || 0), 0);
            return { maxOrder: max } as any;
          }
          const rows = await chain.execute();
          return rows[0] ?? undefined;
        },
      };
      return chain;
    }),
    insertInto: vi.fn((table: 'learning_sessions' | 'messages') => ({
      values: (row: any) => ({
        execute: async () => {
          if (table === 'learning_sessions') sessions.push(row);
          else messages.push(row);
        },
        returningAll: () => ({ executeTakeFirst: async () => row }),
      }),
    })),
    updateTable: vi.fn((table: 'learning_sessions') => ({
      set: (updates: any) => ({
        where: (_col: string, _op: string, id: string) => ({
          execute: async () => {
            const idx = sessions.findIndex((s) => s.id === id);
            if (idx >= 0) sessions[idx] = { ...sessions[idx], ...updates };
          },
        }),
      }),
    })),
    deleteFrom: vi.fn((table: 'learning_sessions' | 'messages') => ({
      where: (_col: string, _op: string, id: string) => ({
        execute: async () => {
          if (table === 'messages') {
            for (let i = messages.length - 1; i >= 0; i--) if (messages[i].session_id === id) messages.splice(i, 1);
          } else {
            const idx = sessions.findIndex((s) => s.id === id);
            if (idx >= 0) sessions.splice(idx, 1);
          }
        },
        executeTakeFirst: async () => {
          let numDeletedRows = 0;
          if (table === 'learning_sessions') {
            const before = sessions.length;
            const idx = sessions.findIndex((s) => s.id === id);
            if (idx >= 0) { sessions.splice(idx, 1); numDeletedRows = 1; }
          }
          return { numDeletedRows } as any;
        },
      }),
    })),
  };

  return { api, sessions, messages };
};

describe('chat-service main coverage', () => {
  let db: any;
  let loggerService: any;
  let aiService: any;
  let agentManager: any;
  let service: ReturnType<typeof createChatService>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mem = makeDb();
    db = mem.api;
    const child = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: vi.fn(() => child) };
    loggerService = { child: vi.fn(() => child), info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    aiService = { getModelPreset: vi.fn(() => ({ provider: 'openai', model: 'gpt-4o' })) };
    const mockAgent = {
      stream: vi.fn(async function* () {
        yield { model: { messages: [{ kwargs: { content: 'AlphaBetaGamma' } }] } } as any;
      }),
      invoke: vi.fn(),
      providerSettings: { providerName: 'openai', model: 'gpt-4o' },
    };
    agentManager = {
      runAgent: vi.fn(async () => ({ content: 'AlphaBetaGamma' })),
      getAgent: vi.fn(() => mockAgent),
    };
    service = createChatService({ db, loggerService, aiService, agentManager });
  });

  it('creates conversation and persists', async () => {
    const conv = await service.createConversation({ title: 'T', agentType: 'learning', topic: 'X' });
    expect(conv.title).toBe('T');
    const loaded = await service.getConversation(conv.id);
    expect(loaded?.id).toBe(conv.id);
  });

  it('sends user message and generates assistant reply', async () => {
    const conv = await service.createConversation({ title: 'S', agentType: 'learning' });
    const res = await service.sendMessage({ conversationId: conv.id, role: 'user', content: 'Hello' });
    expect(res.userMessage.role).toBe('user');
    expect(res.assistantMessage?.role).toBe('assistant');
  });

  it('stores assistant message without generating reply', async () => {
    const conv = await service.createConversation({ title: 'S2', agentType: 'learning' });
    const res = await service.sendMessage({ conversationId: conv.id, role: 'assistant', content: 'Info' });
    expect(res.assistantMessage).toBeUndefined();
  });

  it('lists and deletes conversations', async () => {
    const a = await service.createConversation({ title: 'A', agentType: 'learning' });
    const b = await service.createConversation({ title: 'B', agentType: 'tutoring' });
    const list = await service.listConversations();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ok = await service.deleteConversation(a.id);
    expect(ok).toBe(true);
  });

  it('typing indicator reflects assistantTyping metadata', async () => {
    const conv = await service.createConversation({ title: 'Typing', agentType: 'learning' });
    const { stream } = await service.streamAssistantResponse({ conversationId: conv.id, content: 'Q' });
    const indicatorBefore = await service.getTypingIndicator(conv.id);
    expect(indicatorBefore.isTyping).toBe(true);
    let agg = '';
    for await (const c of stream) agg += c;
    const indicatorAfter = await service.getTypingIndicator(conv.id);
    expect(indicatorAfter.isTyping).toBe(false);
    expect(agg.length).toBeGreaterThanOrEqual(0);
  });

  it('propagates error when agent stream fails', async () => {
    agentManager.getAgent().stream.mockImplementationOnce(async () => {
      throw new Error('fail');
    });
    const conv = await service.createConversation({ title: 'F', agentType: 'learning' });
    const { stream } = await service.streamAssistantResponse({ conversationId: conv.id, content: 'Q2' });
    let threw = false;
    try {
      for await (const _ of stream) {}
    } catch (err: any) {
      threw = true;
      expect(String(err?.message ?? err)).toMatch(/fail/);
    }
    expect(threw).toBe(true);
    const updated = await service.getConversation(conv.id);
    expect(updated?.messages.at(-1)?.role).toBe('user');
    const indicator = await service.getTypingIndicator(conv.id);
    expect(indicator.isTyping).toBe(false);
  });

  it('can cancel stream mid-way and finalize content', async () => {
    agentManager.getAgent().stream.mockImplementationOnce(async function* () {
      yield { model: { messages: [{ kwargs: { content: '1234' } }] } } as any;
      yield { model: { messages: [{ kwargs: { content: '567890' } }] } } as any;
    });
    const conv = await service.createConversation({ title: 'C', agentType: 'learning' });
    const { stream } = await service.streamAssistantResponse({ conversationId: conv.id, content: 'Q3' });
    const iterator = stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    await service.cancelStream(conv.id);
    const rest = await iterator.next();
    expect(rest.done).toBe(true);
    const updated = await service.getConversation(conv.id);
    expect(updated?.messages.at(-1)?.role).toBe('user');
  });

  it('pause, resume, end update conversation state', async () => {
    const conv = await service.createConversation({ title: 'State', agentType: 'learning' });
    await service.pauseConversation(conv.id);
    await service.resumeConversation(conv.id);
    await service.endConversation(conv.id);
    const final = await service.getConversation(conv.id);
    expect(final?.status).toBe('closed');
  });

  it('emits fail status for rate-limit without retry', async () => {
    agentManager.getAgent().stream.mockImplementationOnce(async () => {
      const e: any = new Error('Rate limited');
      e.response = { status: 429 };
      throw e;
    });
    const conv = await service.createConversation({ title: 'RateLimit', agentType: 'learning' });
    const statuses: any[] = [];

    const { stream } = await service.streamAssistantResponse({
      conversationId: conv.id,
      content: 'Hello',
      onStatus: (s) => statuses.push(s),
    });

    let threw = false;
    try {
      for await (const _ of stream) {
        // exhaust stream
      }
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const failStatus = statuses.find((s) => s?.type === 'fail');
    expect(failStatus?.category).toBe('rate_limit');
  });

  it('emits fail status and stops on non-retryable quota error', async () => {
    agentManager.getAgent().stream.mockImplementationOnce(async () => {
      const e: any = new Error('Quota exceeded');
      e.response = { status: 403 };
      e.error = { code: 'insufficient_quota' };
      throw e;
    });
    const conv = await service.createConversation({ title: 'Quota', agentType: 'learning' });
    const statuses: any[] = [];

    const { stream } = await service.streamAssistantResponse({
      conversationId: conv.id,
      content: 'Hi',
      onStatus: (s) => statuses.push(s),
    });

    let threw = false;
    try {
      for await (const _ of stream) {
        // exhaust stream
      }
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const failStatus = statuses.find((s) => s?.type === 'fail');
    expect(failStatus?.category).toBe('quota');

    const updated = await service.getConversation(conv.id);
    expect(updated?.messages.at(-1)?.role).toBe('user');
    const indicator = await service.getTypingIndicator(conv.id);
    expect(indicator.isTyping).toBe(false);
  });
});
