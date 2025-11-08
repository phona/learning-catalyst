/**
 * Database Mocks for Integration Testing
 *
 * Provides mock database implementations for integration tests
 * that require database interactions without actual database setup.
 */

import { vi } from 'vitest';

export interface MockDatabase {
  selectFrom: any;
  insertInto: any;
  updateTable: any;
  deleteFrom: any;
  transaction: any;
  query: any;
  close: () => Promise<void>;
}

export function createMockDatabase(): MockDatabase {
  const mockData = new Map<string, any[]>();

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereRef: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    orderByDesc: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    execute: vi.fn().mockImplementation(async () => []),
    executeTakeFirst: vi.fn().mockImplementation(async () => null),
    executeTakeFirstOrThrow: vi.fn().mockImplementation(async () => {
      throw new Error('No rows found');
    })
  };

  const mockQuery = vi.fn().mockImplementation((query: string, params?: any) => {
    // Simple query mocking for basic CRUD operations
    if (query.includes('SELECT')) {
      return Promise.resolve([]);
    } else if (query.includes('INSERT')) {
      return Promise.resolve({ insertId: 1, rowsAffected: 1 });
    } else if (query.includes('UPDATE')) {
      return Promise.resolve({ rowsAffected: 1 });
    } else if (query.includes('DELETE')) {
      return Promise.resolve({ rowsAffected: 1 });
    }
    return Promise.resolve({});
  });

  return {
    selectFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    insertInto: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        execute: vi.fn().mockImplementation(async () => ({ insertId: 1, rowsAffected: 1 })),
        executeTakeFirst: vi.fn().mockImplementation(async () => ({ insertId: 1, rowsAffected: 1 }))
      })
    }),
    updateTable: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue(mockQueryBuilder)
    }),
    deleteFrom: vi.fn().mockReturnValue(mockQueryBuilder),
    transaction: vi.fn().mockImplementation(async (fn) => {
      return fn(createMockDatabase());
    }),
    query: mockQuery,
    close: vi.fn().mockResolvedValue(undefined)
  };
}

export function createMockKyselyDatabase(): any {
  const mockDb = createMockDatabase();

  // Add Kysely-specific methods
  return {
    ...mockDb,
    // Add transaction support
    transaction: vi.fn().mockImplementation(async (fn) => {
      return fn(mockDb);
    }),
    // Add schema introspection
    schema: {
      hasTable: vi.fn().mockResolvedValue(true),
      getColumnMetadata: vi.fn().mockResolvedValue([])
    },
    // Add connection pool info
    pool: {
      numUsed: 0,
      numFree: 5,
      numPending: 0,
      total: 5
    }
  };
}

export function createMockAgentRegistryData() {
  return {
    agents: [
      {
        id: 'learning-agent-1',
        name: 'Learning Assistant',
        type: 'learning',
        description: 'Helps with learning tasks',
        capabilities: ['concept-explanation', 'learning-path'],
        status: 'active',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now()
      },
      {
        id: 'assessment-agent-1',
        name: 'Assessment Tool',
        type: 'assessment',
        description: 'Evaluates knowledge and skills',
        capabilities: ['quiz-generation', 'skill-assessment'],
        status: 'inactive',
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 86400000
      }
    ],
    sessions: [
      {
        id: 'session-1',
        title: 'Learning Session 1',
        agentId: 'learning-agent-1',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Help me learn TypeScript',
            timestamp: Date.now() - 3600000
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'I\'ll help you learn TypeScript step by step.',
            timestamp: Date.now() - 3000000
          }
        ],
        createdAt: Date.now() - 7200000,
        updatedAt: Date.now() - 3000000
      }
    ],
    concepts: [
      {
        id: 'concept-1',
        name: 'TypeScript Basics',
        description: 'Fundamental TypeScript concepts',
        difficulty: 'beginner',
        prerequisites: [],
        relatedConcepts: ['concept-2'],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 43200000
      },
      {
        id: 'concept-2',
        name: 'Type Annotations',
        description: 'Type annotations in TypeScript',
        difficulty: 'beginner',
        prerequisites: ['concept-1'],
        relatedConcepts: ['concept-3'],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 43200000
      }
    ]
  };
}

export function createMockCatalystServiceData() {
  return {
    parsedConcepts: [
      {
        id: 'parsed-1',
        conceptId: 'concept-1',
        content: 'TypeScript is a typed superset of JavaScript',
        confidence: 0.95,
        extractionMethod: 'nlp',
        createdAt: Date.now()
      }
    ],
    knowledgeGraph: {
      nodes: [
        {
          id: 'node-1',
          label: 'TypeScript',
          type: 'concept',
          properties: {
            difficulty: 'beginner',
            description: 'Programming language'
          }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          label: 'relates-to',
          properties: {
            strength: 0.8
          }
        }
      ]
    }
  };
}

export function createMockLangChainData() {
  return {
    models: [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        capabilities: ['chat', 'completion'],
        contextLength: 4096,
        pricing: { input: 0.001, output: 0.002 }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        capabilities: ['chat', 'completion', 'function-calling'],
        contextLength: 8192,
        pricing: { input: 0.03, output: 0.06 }
      }
    ],
    conversations: [
      {
        id: 'conv-1',
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        createdAt: Date.now()
      }
    ]
  };
}

// Utility function to mock database queries with specific data
export function mockDatabaseWithData(mockDb: MockDatabase, data: Record<string, any[]>): void {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation((condition) => {
      // Simple where clause mocking
      if (typeof condition === 'function') {
        return mockQueryBuilder;
      }
      return mockQueryBuilder;
    }),
    whereRef: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    orderByDesc: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    execute: vi.fn().mockImplementation(async () => {
      // Return data based on the table being queried
      return [];
    }),
    executeTakeFirst: vi.fn().mockImplementation(async () => {
      return null;
    }),
    executeTakeFirstOrThrow: vi.fn().mockImplementation(async () => {
      throw new Error('No rows found');
    })
  };

  mockDb.selectFrom = vi.fn().mockReturnValue(mockQueryBuilder);
  mockDb.insertInto = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      execute: vi.fn().mockImplementation(async () => ({ insertId: 1, rowsAffected: 1 })),
      executeTakeFirst: vi.fn().mockImplementation(async () => ({ insertId: 1, rowsAffected: 1 }))
    })
  });
  mockDb.updateTable = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue(mockQueryBuilder)
  });
  mockDb.deleteFrom = vi.fn().mockReturnValue(mockQueryBuilder);
}