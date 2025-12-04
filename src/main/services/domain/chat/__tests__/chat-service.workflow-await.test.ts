import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock LangGraph workflow to emit an interrupt with checkpoint_id
vi.mock('../workflow-graph', () => ({
  createWorkflowGraph: vi.fn(() => ({
    stream: async function* () {
      yield {
        __interrupt__: [
          {
            value: { prompt: 'Please answer X', questionId: 'q-123' },
            checkpoint_id: 'ckpt-xyz',
          },
        ],
      };
    },
  })),
  isInterruptEvent: (evt: any) => !!evt?.__interrupt__,
  extractInterrupt: (evt: any) => evt?.__interrupt__?.[0]?.value,
}));

// Mock checkpoint saver to avoid DB requirements
vi.mock('../../core/checkpoints/SQLiteCheckpointSaver', () => ({
  SQLiteCheckpointSaver: class MockCheckpointSaver {},
}));

import { createChatService } from '../chat-service';

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
      const chain: any = {
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
        execute: async (): Promise<any[]> => {
          let rows: any[] = q.table === 'learning_sessions' ? [...sessions] : [...messages];
          if (q.whereFilter) {
            rows = rows.filter((r: any) => r[q.whereFilter.col] === q.whereFilter.val);
          }
          if (q.orderKey) {
            rows.sort((a: any, b: any) => String(a[q.orderKey]).localeCompare(String(b[q.orderKey])));
            if (q.orderDir === 'desc') rows.reverse();
          }
          if (q.limitCount != null) rows = rows.slice(0, q.limitCount);
          if (q.selectMode === 'max' && q.table === 'messages') {
            return [{ maxOrder: rows.reduce((m: any, r: any) => Math.max(m, r.message_order ?? 0), 0) }];
          }
          return rows;
        },
        executeTakeFirst: async () => {
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
            for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].session_id === id) messages.splice(i, 1);
          } else {
            const idx = sessions.findIndex((s) => s.id === id);
            if (idx >= 0) sessions.splice(idx, 1);
          }
        },
        executeTakeFirst: async () => ({ numDeletedRows: 1 } as any),
      }),
    })),
  };

  return { api, sessions, messages };
};

describe('chat-service workflow await', () => {
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
    agentManager = {
      runAgent: vi.fn(async () => ({ content: 'ok' })),
      getAgent: vi.fn(() => ({ stream: vi.fn(), invoke: vi.fn(), providerSettings: { providerName: 'openai', model: 'gpt-4o' } })),
    };
    service = createChatService({ db, loggerService, aiService, agentManager });
  });

  it('emits await_user_input with checkpointId from interrupt', async () => {
    const statuses: any[] = [];
    const conv = await service.createConversation({ title: 'Await', agentType: 'learning' });
    const { stream } = await service.streamAssistantResponse({
      conversationId: conv.id,
      content: 'Start',
      onStatus: (s) => statuses.push(s),
    });

    // consume stream (will break on interrupt)
    for await (const _ of stream) {
      // no-op
    }

    const awaitStatus = statuses.find((s) => s?.type === 'await_user_input');
    expect(awaitStatus).toBeDefined();
    expect(awaitStatus.checkpointId).toBe('ckpt-xyz');
    expect(awaitStatus.questionId).toBeDefined();
  });
});
