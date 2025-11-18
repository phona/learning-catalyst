# Services Guide

Services form the **business logic layer** of Learning Catalyst. This guide covers the service architecture, patterns, and how to create and use services.

## Service Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────┐
│           IPC Handlers                  │
│     (Request Routing & Validation)      │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Domain Services               │
│      (Business Logic)                   │
│  • Chat Service                         │
│  • Learning Service                     │
│  • Knowledge Service                    │
│  • Analytics Service                    │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Core Services                 │
│     (Infrastructure)                    │
│  • Database Service (Kysely)            │
│  • Config Service                       │
│  • Logger Service                       │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│            AI Services                  │
│      (External Integration)             │
│  • AI Service (Abstraction)             │
│  • Provider Services                    │
└─────────────────────────────────────────┘
```

### Service Interface Pattern

**All services follow the functional pattern:**

```typescript
// Service factory function
export function createServiceName(dependencies: Dependencies): Service {
  return {
    // Public methods
    methodName: async (params: ParamType): Promise<ReturnType> => {
      // Implementation
    },

    // Private helper methods can be included
    helperMethod: (input: InputType): OutputType => {
      // Implementation
    }
  };
}
```

## Core Services

### 1. Database Service

**File**: `src/main/services/core/database/kysely-database.ts`

**Purpose**: Database connection and query execution

**Usage**:
```typescript
import { createSqliteDriverFactory, createDatabase, runMigrations } from '@/main/services/core/database/kysely-database';

async function setupDatabase() {
  const dbPath = '.catalyst/learning_catalyst.db';
  const driverFactory = await createSqliteDriverFactory(dbPath);
  const db = createDatabase(driverFactory);
  await runMigrations(driverFactory);
  return db;
}
```

**Key Functions**:
- `createSqliteDriverFactory(dbPath)` - Creates database driver
- `createDatabase(driverFactory)` - Creates Kysely instance
- `runMigrations(driverFactory)` - Applies migrations
- `runMigrationsAtPath(dbPath)` - Convenience function

### 2. Config Service

**Purpose**: Configuration management

**Usage**:
```typescript
// Get configuration
const config = await configService.get('ai.providers.openai.apiKey');

// Update configuration
await configService.set('ai.providers.openai.model', 'gpt-4');
```

### 3. Logger Service

**Purpose**: Structured logging

**Usage**:
```typescript
// Different log levels
loggerService.info('User logged in', { userId: '123' });
loggerService.warn('High memory usage', { usage: '85%' });
loggerService.error('Database connection failed', { error: err.message });
loggerService.debug('Query executed', { query: sql, duration: '45ms' });
```

## Domain Services

### Chat Service

**File**: `src/main/services/domain/chat/chat-service.ts`

**Purpose**: Handle chat conversations and AI interactions

**Interface**:
```typescript
interface ChatService {
  sendMessage(content: string, sessionId?: string): Promise<ChatResponse>;
  getHistory(sessionId: string): Promise<ConversationDisplay[]>;
  deleteMessage(messageId: string): Promise<void>;
  sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void,
    sessionId?: string
  ): Promise<void>;
}
```

**Example Implementation**:
```typescript
export function createChatService({ db, loggerService, aiService }: Dependencies) {
  return {
    async sendMessage(content: string, sessionId?: string): Promise<ChatResponse> {
      // Log the action
      loggerService.info('Sending chat message', { content, sessionId });

      // Store user message
      const userMessage = await db
        .insertInto('messages')
        .values({
          id: generateId(),
          session_id: sessionId!,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
          message_order: Date.now(),
          created_at: new Date().toISOString()
        })
        .returningAll()
        .executeTakeFirst();

      // Get AI response
      const aiResponse = await aiService.complete({
        messages: [
          { role: 'user', content }
        ]
      });

      // Store AI response
      const assistantMessage = await db
        .insertInto('messages')
        .values({
          id: generateId(),
          session_id: sessionId!,
          role: 'assistant',
          content: aiResponse.content,
          thinking_content: aiResponse.thinking,
          provider: aiResponse.provider,
          model: aiResponse.model,
          timestamp: new Date().toISOString(),
          message_order: Date.now() + 1,
          created_at: new Date().toISOString()
        })
        .returningAll()
        .executeTakeFirst();

      return {
        userMessage,
        assistantMessage
      };
    },

    async getHistory(sessionId: string): Promise<ConversationDisplay[]> {
      const messages = await db
        .selectFrom('messages')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('message_order', 'asc')
        .execute();

      return messages.map(toConversationDisplay);
    }
  };
}
```

### Learning Service

**File**: `src/main/services/domain/learning/learning-service.ts`

**Purpose**: Manage learning sessions and progress

**Interface**:
```typescript
interface LearningService {
  startSession(options: SessionStartOptions): Promise<LearningSessionDisplay>;
  getSession(sessionId: string): Promise<LearningSessionDisplay>;
  listSessions(filters?: SessionFilters): Promise<LearningSessionDisplay[]>;
  updateProgress(sessionId: string, conceptId: string, status: ProgressStatus): Promise<void>;
  getProgress(sessionId?: string): Promise<LearningProgressDisplay>;
  completeSession(sessionId: string): Promise<void>;
}
```

**Example Implementation**:
```typescript
export function createLearningService({ db, loggerService }: Dependencies) {
  return {
    async startSession(options: SessionStartOptions): Promise<LearningSessionDisplay> {
      const sessionId = generateId();
      const now = new Date().toISOString();

      const session = await db
        .insertInto('learning_sessions')
        .values({
          id: sessionId,
          title: options.title,
          description: options.description,
          start_time: now,
          metadata: JSON.stringify({
            tags: options.tags || [],
            category: options.category || 'general',
            difficulty: options.difficulty || 'intermediate',
            goals: options.goals || []
          }),
          created_at: now,
          updated_at: now,
          total_messages: 0
        })
        .returningAll()
        .executeTakeFirst();

      loggerService.info('Learning session started', { sessionId, title: options.title });

      return toLearningSessionDisplay(session);
    },

    async updateProgress(
      sessionId: string,
      conceptId: string,
      status: ProgressStatus
    ): Promise<void> {
      await db
        .insertInto('concept_progress')
        .values({
          id: generateId(),
          session_id: sessionId,
          concept_id: conceptId,
          status,
          updated_at: new Date().toISOString()
        })
        .onConflict((oc) =>
          oc.column('session_id', 'concept_id')
            .doUpdateSet({ status, updated_at: new Date().toISOString() })
        )
        .execute();

      loggerService.info('Progress updated', { sessionId, conceptId, status });
    }
  };
}
```

### Knowledge Service

**File**: `src/main/services/domain/knowledge/knowledge-service.ts`

**Purpose**: Manage knowledge graph and concepts

**Interface**:
```typescript
interface KnowledgeService {
  search(query: string): Promise<ConceptExplorationDisplay[]>;
  getConcept(conceptId: string): Promise<ConceptDisplay>;
  getRelatedConcepts(conceptId: string): Promise<RelatedConceptsDisplay>;
  extractConcepts(content: string): Promise<ConceptRow[]>;
  buildKnowledgeMap(sessionId?: string): Promise<KnowledgeMapDisplay>;
}
```

**Example Implementation**:
```typescript
export function createKnowledgeService({ db, loggerService }: Dependencies) {
  return {
    async search(query: string): Promise<ConceptExplorationDisplay[]> {
      const concepts = await db
        .selectFrom('concepts')
        .selectAll()
        .where((eb) => eb.or([
          eb('name', 'like', `%${query}%`),
          eb('description', 'like', `%${query}%`),
          eb('tags', 'like', `%${query}%`)
        ]))
        .limit(20)
        .execute();

      return concepts.map(toConceptExplorationDisplay);
    },

    async getRelatedConcepts(conceptId: string): Promise<RelatedConceptsDisplay> {
      const relationships = await db
        .selectFrom('relationships')
        .selectAll()
        .where('source_concept_id', '=', conceptId)
        .execute();

      const relatedConceptIds = relationships.map(r => r.target_concept_id);

      if (relatedConceptIds.length === 0) {
        return { conceptId, related: [] };
      }

      const relatedConcepts = await db
        .selectFrom('concepts')
        .selectAll()
        .where('id', 'in', relatedConceptIds)
        .execute();

      return {
        conceptId,
        related: relatedConcepts.map(toRelatedConceptDisplay)
      };
    }
  };
}
```

### Analytics Service

**File**: `src/main/services/domain/analytics/analytics-service.ts`

**Purpose**: Generate analytics and insights

**Interface**:
```typescript
interface AnalyticsService {
  getDashboard(): Promise<DashboardDisplay>;
  getProgressChart(timeRange: string): Promise<ProgressChartDisplay>;
  getUsageStats(): Promise<UsageStatsDisplay>;
  getTokenUsage(): Promise<TokenUsageDisplay>;
  recordEvent(event: AnalyticsEvent): Promise<void>;
}
```

**Example Implementation**:
```typescript
export function createAnalyticsService({ db, loggerService }: Dependencies) {
  return {
    async getDashboard(): Promise<DashboardDisplay> {
      // Get total sessions
      const sessionCount = await db
        .selectFrom('learning_sessions')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst();

      // Get total concepts
      const conceptCount = await db
        .selectFrom('concepts')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst();

      // Get mastered concepts
      const masteredCount = await db
        .selectFrom('concept_progress')
        .select(db.fn.count('id').as('count'))
        .where('status', '=', 'mastered')
        .executeTakeFirst();

      // Calculate streak
      const streak = await calculateLearningStreak(db);

      return {
        totalSessions: Number(sessionCount?.count || 0),
        totalConcepts: Number(conceptCount?.count || 0),
        masteredConcepts: Number(masteredCount?.count || 0),
        currentStreak: streak,
        averageSessionLength: await calculateAverageSessionLength(db)
      };
    },

    async recordEvent(event: AnalyticsEvent): Promise<void> {
      await db
        .insertInto('analytics')
        .values({
          id: generateId(),
          event_type: event.type,
          event_data: JSON.stringify(event.data),
          session_id: event.sessionId,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .execute();
    }
  };
}
```

## AI Services

### AI Service (Abstraction)

**File**: `src/main/services/ai/ai-service.ts`

**Purpose**: Unified interface for all AI providers

**Interface**:
```typescript
interface AIService {
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(request: ChatCompletionRequest, onChunk: (chunk: string) => void): Promise<void>;
  getAvailableModels(): Promise<ModelDisplay[]>;
  setModel(modelId: string): Promise<void>;
}
```

**Example Implementation**:
```typescript
export function createAIService({ configService, loggerService }: Dependencies) {
  let currentProvider: AIProvider;

  return {
    async complete(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
      // Get current provider
      const provider = await getCurrentProvider(configService);

      // Call provider
      const response = await provider.complete(request);

      // Log usage
      loggerService.info('AI completion', {
        provider: provider.name,
        model: provider.model,
        promptLength: request.messages.length,
        tokens: response.usage
      });

      return response;
    },

    async stream(
      request: ChatCompletionRequest,
      onChunk: (chunk: string) => void
    ): Promise<void> {
      const provider = await getCurrentProvider(configService);
      await provider.stream(request, onChunk);
    }
  };
}
```

### Provider Services

**OpenAI Provider**:
```typescript
// src/main/services/ai/providers/openai-provider.ts
export function createOpenAIProvider(config: OpenAIConfig): AIProvider {
  return {
    name: 'openai',
    async complete(request) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          temperature: request.temperature || 0.7
        })
      });

      const data = await response.json();
      return toChatCompletionResponse(data);
    }
  };
}
```

## Creating a New Service

### Step 1: Define Dependencies

```typescript
// src/main/services/domain/my-service/my-service.ts
export interface Dependencies {
  db: Kysely<Database>;
  loggerService: LoggerService;
  configService: ConfigService;
  aiService?: AIService;
}
```

### Step 2: Define Interface

```typescript
export interface MyService {
  myMethod(param: string): Promise<ReturnType>;
  anotherMethod(params: Params): Promise<void>;
}
```

### Step 3: Implement Service

```typescript
export function createMyService(dependencies: Dependencies): MyService {
  const { db, loggerService } = dependencies;

  return {
    async myMethod(param: string): Promise<ReturnType> {
      loggerService.info('myMethod called', { param });

      // Implementation
      const result = await db
        .selectFrom('my_table')
        .selectAll()
        .where('column', '=', param)
        .executeTakeFirst();

      return toReturnType(result);
    },

    async anotherMethod(params: Params): Promise<void> {
      // Implementation
      await db
        .insertInto('my_table')
        .values(params)
        .execute();

      loggerService.info('anotherMethod completed', { params });
    }
  };
}
```

### Step 4: Register Service

```typescript
// src/main/index.ts
import { createMyService } from './services/domain/my-service/my-service';

const myService = createMyService({
  db,
  loggerService,
  configService
});

// Use in handlers
setupMyHandlers({ myService, loggerService });
```

### Step 5: Create IPC Handler

```typescript
// src/main/handlers/my-handlers.ts
export function setupMyHandlers({ myService, loggerService }: Dependencies) {
  ipcMain.handle('my:myMethod', async (event, param: string) => {
    try {
      const result = await myService.myMethod(param);
      return { success: true, data: result };
    } catch (error) {
      loggerService.error('myMethod failed', { error: error.message });
      return {
        success: false,
        error: {
          code: 'MY_SERVICE_ERROR',
          message: error.message
        }
      };
    }
  });
}
```

## Service Best Practices

### 1. Always Log Operations

```typescript
// ✅ Good
loggerService.info('Operation started', { param });
try {
  const result = await doOperation();
  loggerService.info('Operation completed', { result });
  return result;
} catch (error) {
  loggerService.error('Operation failed', { error: error.message });
  throw error;
}

// ❌ Bad - No logging
const result = await doOperation();
return result;
```

### 2. Handle Errors Gracefully

```typescript
// ✅ Good - Specific error handling
async myMethod(param: string): Promise<ReturnType> {
  try {
    return await db.selectFrom('table').execute();
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      throw new ValidationError('Invalid parameter');
    }
    loggerService.error('Database error', { error });
    throw new DatabaseError('Operation failed');
  }
}
```

### 3. Use Transactions for Multiple Operations

```typescript
// ✅ Good - Atomic operations
await db.transaction().execute(async (trx) => {
  await trx.insertInto('table1').values(data1).execute();
  await trx.insertInto('table2').values(data2).execute();
  await trx.updateTable('table3').set({ status: 'complete' }).execute();
});
```

### 4. Validate Inputs

```typescript
// ✅ Good - Input validation
async myMethod(param: string): Promise<ReturnType> {
  if (!param || typeof param !== 'string') {
    throw new ValidationError('Parameter must be a non-empty string');
  }

  // Continue with operation
}
```

### 5. Use Type-Safe Queries

```typescript
// ✅ Good - Type-safe Kysely
const result = await db
  .selectFrom('learning_sessions')
  .selectAll()
  .where('id', '=', sessionId)
  .executeTakeFirst();

// ❌ Bad - Raw SQL
const result = await db.query(
  `SELECT * FROM learning_sessions WHERE id = '${sessionId}'`
);
```

### 6. Return Standardized Responses

```typescript
// ✅ Good - Standardized
return {
  id: row.id,
  title: row.title,
  createdAt: row.created_at
};

// ❌ Bad - Directly returning DB rows
return row;
```

## Testing Services

### Unit Test Example

```typescript
// src/main/services/domain/my-service/__tests__/my-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createMyService } from '../my-service';
import { createMock } from 'vitest-mock-extended';

describe('MyService', () => {
  let myService: MyService;
  let mockDb: ReturnType<typeof createMock>;
  let mockLogger: ReturnType<typeof createMock>;

  beforeEach(() => {
    mockDb = createMock<Kysely<Database>>();
    mockLogger = createMock<LoggerService>();

    myService = createMyService({
      db: mockDb,
      loggerService: mockLogger
    });
  });

  it('should handle myMethod', async () => {
    // Arrange
    const param = 'test';
    const mockResult = { id: '1', name: 'Test' };
    mockDb.selectFrom.mockReturnThis();
    mockDb.selectAll.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.executeTakeFirst.mockResolvedValue(mockResult);

    // Act
    const result = await myService.myMethod(param);

    // Assert
    expect(result).toEqual(mockResult);
    expect(mockDb.selectFrom).toHaveBeenCalledWith('my_table');
    expect(mockDb.where).toHaveBeenCalledWith('column', '=', param);
  });

  it('should log operations', async () => {
    // Act
    await myService.myMethod('test');

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(
      'myMethod called',
      { param: 'test' }
    );
  });
});
```

## Service Dependencies

### Dependency Graph

```
Main Process (index.ts)
├── Database Service
│   └── Kysely + SQLite
│
├── Config Service
│   └── Electron Store
│
├── Logger Service
│   └── Console/File output
│
├── AI Service
│   └── Provider Services (OpenAI, ChatGLM, etc.)
│
├── Domain Services
│   ├── Chat Service
│   │   ├── Database Service
│   │   ├── Logger Service
│   │   └── AI Service
│   │
│   ├── Learning Service
│   │   ├── Database Service
│   │   └── Logger Service
│   │
│   ├── Knowledge Service
│   │   ├── Database Service
│   │   └── Logger Service
│   │
│   └── Analytics Service
│       ├── Database Service
│       └── Logger Service
│
└── IPC Handlers
    └── Use Domain Services
```

## Common Patterns

### Repository Pattern

**Abstract data access:**

```typescript
// Repository interface
interface MessageRepository {
  create(data: InsertableMessage): Promise<MessageRow>;
  findBySession(sessionId: string): Promise<MessageRow[]>;
  delete(id: string): Promise<void>;
}

// Repository implementation
function createMessageRepository(db: Kysely<Database>): MessageRepository {
  return {
    async create(data) {
      return await db.insertInto('messages').values(data).returningAll().executeTakeFirst();
    },

    async findBySession(sessionId) {
      return await db
        .selectFrom('messages')
        .selectAll()
        .where('session_id', '=', sessionId)
        .orderBy('message_order', 'asc')
        .execute();
    },

    async delete(id) {
      await db.deleteFrom('messages').where('id', '=', id).execute();
    }
  };
}

// Use in service
export function createChatService({ db, loggerService }: Dependencies) {
  const messages = createMessageRepository(db);

  return {
    async sendMessage(content: string, sessionId: string) {
      const message = await messages.create({
        id: generateId(),
        session_id: sessionId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      });

      return message;
    }
  };
}
```

### Factory Pattern

**Create different implementations:**

```typescript
type ProviderType = 'openai' | 'chatglm' | 'deepseek';

export function createProvider(type: ProviderType): AIProvider {
  switch (type) {
    case 'openai':
      return createOpenAIProvider(config);
    case 'chatglm':
      return createChatGLMProvider(config);
    case 'deepseek':
      return createDeepSeekProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
```

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Electron API](./electron-api.md)
- [Database Design](./database.md)
- [Agent System](./agents.md)

---

**Last Updated**: November 2025
**Version**: 1.0
