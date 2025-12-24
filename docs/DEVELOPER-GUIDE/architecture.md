# System Architecture

t o

## Overview

Learning Catalyst uses a **multi-process Electron architecture** with a service-oriented design.
This document describes the complete system architecture, component relationships, and design
patterns.

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Learning Catalyst                           │
│                      Desktop Application                       │
│                                                                │
│  ┌──────────────────┐              ┌──────────────────┐       │
│  │  Renderer Process│              │   Main Process   │       │
│  │     (React)      │              │    (Node.js)     │       │
│  │                  │              │                  │       │
│  │  ┌────────────┐ │              │  ┌────────────┐  │       │
│  │  │ Components │ │              │  │ Services   │  │       │
│  │  └────────────┘ │              │  └────────────┘  │       │
│  │  ┌────────────┐ │              │  ┌────────────┐  │       │
│  │  │   State    │ │◄────────────►│  │  Database  │  │       │
│  │  └────────────┘ │   IPC (RPC)  │  └────────────┘  │       │
│  │  ┌────────────┐ │              │  ┌────────────┐  │       │
│  │  │   Hooks    │ │              │  │    AI      │  │       │
│  │  └────────────┘ │              │  │ Providers  │  │       │
│  └──────────────────┘              └──────────────────┘       │
│          │                                  │                  │
│          └────────────────┬─────────────────┘                  │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Preload   │                              │
│                    │    Script   │                              │
│                    │ (Security)  │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   SQLite DB    │
                    │   (Local)      │
                    └────────────────┘
```

## Process Architecture

### 1. Main Process (Node.js)

**Responsibilities:**

- AI provider management and API calls
- Database operations (Kysely + SQLite)
- Agent orchestration and lifecycle
- File system access
- Application lifecycle management
- IPC handler registration

**Key Components:**

```
src/main/
├── index.ts                    # Main process entry
├── preload/
│   └── index.ts                # Security bridge
├── handlers/                   # IPC handlers (8 domains)
│   ├── chat-handlers.ts
│   ├── learning-handlers.ts
│   ├── knowledge-handlers.ts
│   ├── analytics-handlers.ts
│   ├── sessions-handlers.ts
│   ├── agents-handlers.ts
│   ├── content-handlers.ts
│   └── settings-handlers.ts
└── services/                   # Service layer
    ├── core/                   # Infrastructure
    │   ├── database/           # Kysely + Qdrant infrastructure
    │   │   ├── kysely-database.ts      # SQLite (relational)
    │   │   ├── qdrant-process-service.ts  # Qdrant process management
    │   │   └── vector-store.ts          # Vector operations
    │   ├── config/             # Configuration
    │   └── logger/             # Logging
    ├── domain/                 # Business logic
    │   ├── chat/               # Chat service
    │   ├── learning/           # Learning service
    │   ├── knowledge/          # Knowledge service
    │   │   └── vector/         # Vector database adapter
    │   └── analytics/          # Analytics service
    └── ai/                     # AI integration
        ├── ai-service.ts       # AI abstraction
        └── providers/          # Provider implementations
```

### 2. Renderer Process (React)

**Responsibilities:**

- User interface rendering
- Component state management
- User interaction handling
- Real-time UI updates
- Visualization (knowledge graphs, charts)

**Key Components:**

```
src/renderer/
├── main.tsx                    # React entry
├── App.tsx                     # Root component
├── components/                 # UI components
│   ├── Dashboard/
│   ├── Chat/
│   ├── KnowledgeMap/
│   ├── SessionManager/
│   ├── Settings/
│   └── Layout/
├── hooks/                      # Custom React hooks
│   ├── useElectronAPI.ts
│   ├── useSession.ts
│   └── useAnalytics.ts
├── services/                   # Frontend services
│   └── electronAPI.ts          # API client
└── stores/                     # State management
    ├── userStore.ts
    └── sessionStore.ts
```

### 3. Preload Script (Security Boundary)

**Responsibilities:**

- Expose limited API to renderer
- Input validation and sanitization
- Secure IPC channel setup
- Type-safe API bridging

```typescript
// src/main/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI } from '@/shared/types/electron-api';

// White-listed API methods only
contextBridge.exposeInMainWorld('electronAPI', {
  // Chat API
  chat: {
    sendMessage: (message: string, sessionId?: string) =>
      ipcRenderer.invoke('chat:sendMessage', message, sessionId),
    getHistory: (sessionId: string) => ipcRenderer.invoke('chat:getHistory', sessionId),
  },

  // Learning API
  learning: {
    startSession: (options: SessionStartOptions) =>
      ipcRenderer.invoke('learning:startSession', options),
    getProgress: () => ipcRenderer.invoke('learning:getProgress'),
  },

  // Add other API domains...
} satisfies ElectronAPI);
```

## Service Architecture

### Functional Pattern

**No classes** - All services use the functional pattern:

```typescript
// ✅ Service factory function
export function createChatService({ db, loggerService, aiService }: Dependencies) {
  return {
    async sendMessage(content: string, sessionId?: string) {
      loggerService.info('Sending message', { content });

      // Store message
      const message = await db
        .insertInto('messages')
        .values({ content, session_id: sessionId })
        .returningAll()
        .executeTakeFirst();

      // Get AI response
      const response = await aiService.complete(content);

      return { message, response };
    },
  };
}

// ❌ NOT class-based
export class ChatService {
  constructor(
    private db: Database,
    private logger: Logger,
    private ai: AIService,
  ) {}

  async sendMessage(content: string) {
    // Implementation
  }
}
```

### Dependency Injection

**Explicit dependencies** passed as parameters:

```typescript
// src/main/index.ts
import { createDatabase } from './services/core/database/kysely-database';
import { createChatService } from './services/domain/chat/chat-service';
import { createAIService } from './services/ai/ai-service';

// Create dependencies
const db = createDatabase(driverFactory);
const loggerService = createLoggerService();
const aiService = createAIService({ configService });

// Create services
const chatService = createChatService({ db, loggerService, aiService });
const learningService = createLearningService({ db, loggerService });

// Register handlers
setupChatHandlers({ chatService, loggerService });
setupLearningHandlers({ learningService, loggerService });
```

### Service Layer Hierarchy

```
Service Layers (Top to Bottom)
├── IPC Handlers
│   ├── Validate inputs
│   ├── Route to services
│   └── Format responses
│
├── Domain Services
│   ├── Chat Service
│   ├── Learning Service
│   ├── Knowledge Service
│   └── Analytics Service
│
├── Core Services
│   ├── Database Service (Kysely)
│   ├── Config Service
│   └── Logger Service
│
└── AI Services
    ├── AI Service (Abstraction)
    └── Provider Services
        ├── OpenAI
        ├── ChatGLM
        ├── DeepSeek
        └── Local Models
```

## Database Architecture

### Kysely + SQLite

**Type-safe query builder with SQLite storage:**

```typescript
// Database setup
const driverFactory = await createSqliteDriverFactory(dbPath);
const db = createDatabase(driverFactory);
await runMigrations(driverFactory);

// Type-safe queries
const sessions = await db
  .selectFrom('learning_sessions')
  .selectAll()
  .where('end_time', 'is', null)
  .execute();

// Relationships
const messages = await db
  .selectFrom('messages as m')
  .selectAll('m')
  .select((eb) => eb.fn.count('m.id').as('message_count'))
  .leftJoin('learning_sessions as s', 'm.session_id', 's.id')
  .groupBy('s.id')
  .execute();
```

### Migration System

**Versioned schema changes:**

```typescript
// Migrations directory
src/main/services/core/database/migrations/
├── 20251029_create_categories.ts
├── 20251029_create_concepts.ts
├── 20251029_create_learning_sessions.ts
├── 20251029_create_messages.ts
├── 20251030_create_concept_progress.ts
├── 20251107_create_agents.ts
└── index.ts (migration registry)

// Migration example
export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('learning_sessions')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('start_time', 'text', (col) => col.notNull())
    .addColumn('end_time', 'text')
    .addColumn('metadata', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();
}
```

### Schema Design

**Key tables:**

```
Core Tables:
├── learning_sessions    # Learning session metadata
├── messages            # Chat messages
├── concepts            # Learned concepts
├── relationships       # Concept relationships
├── concept_progress    # User mastery tracking
├── analytics           # Usage statistics
├── achievements        # User achievements
├── settings            # User preferences
└── checkpoints         # Session snapshots

Memory System (Phase 8):
├── memory_entries        # Multi-layer memory
├── episodic_memories     # Learning episodes
├── semantic_memories     # Conceptual knowledge
├── procedural_memories   # Skills and procedures
└── memory_associations   # Memory connections

Agent System:
├── agents               # Agent configurations
├── agent_lifecycle_events # State changes
├── agent_states         # Current state
└── agent_archives       # Archived agents
```

## IPC Communication

### 8 API Domains

**Organized by functionality:**

1. **Chat API** - Conversation and messaging
2. **Learning API** - Learning sessions and progress
3. **Knowledge API** - Concept exploration
4. **Analytics API** - Statistics and insights
5. **Sessions API** - Session management
6. **Agents API** - AI agent lifecycle
7. **Content API** - Content discovery
8. **Settings API** - Configuration

### IPC Handler Pattern

**IMPORTANT:** All handlers must return raw data. The `ipc-main-proxy` automatically wraps responses in `APIResponse<T>` format. Do not manually wrap responses.

```typescript
// src/main/handlers/chat-handlers.ts
import { ipcMain } from 'electron';

/**
 * Chat IPC Handlers
 *
 * NOTE: All handlers return raw data. The ipc-main-proxy wraps responses.
 * - Return raw objects: result, { data }
 * - Throw errors directly: throw new Error('message')
 * - No manual { success, data } wrapping needed
 */
export function setupChatHandlers({ chatService, loggerService }: Dependencies) {
  const logger = loggerService.child({ handler: 'chat' });

  // Send message - return raw data, proxy wraps it
  ipcMain.handle('chat:sendMessage', async (event, message: string, sessionId?: string) => {
    const result = await chatService.sendMessage(message, sessionId);
    return result;  // Raw return - proxy adds { success: true, data: result }
  });

  // Get history - optional try-catch for logging
  ipcMain.handle('chat:getHistory', async (event, sessionId: string) => {
    try {
      const history = await chatService.getHistory(sessionId);
      return history;  // Raw return - proxy wraps it
    } catch (error) {
      logger.error('chat:getHistory failed', { sessionId, error });
      throw error;  // Re-throw - proxy catches and wraps as error response
    }
  });
}
```

### Type-Safe IPC

**Contract-driven development:**

```typescript
// src/shared/types/electron-api/chat-api.ts
export interface ChatAPI {
  sendMessage: (message: string, sessionId?: string) => Promise<APIResponse<MessageResponse>>;
  sendMessageStream: (
    message: string,
    onChunk: (chunk: string) => void,
    sessionId?: string,
  ) => Promise<APIResponse<void>>;
  getHistory: (sessionId: string) => Promise<APIResponse<ConversationDisplay[]>>;
  deleteMessage: (messageId: string) => Promise<APIResponse<void>>;
}
```

## Multi-Agent System

### Agent Types

**Specialized AI agents:**

```typescript
type AgentType = 'learning' | 'assessment' | 'tutoring' | 'practice' | 'general';

// Learning Agent - Explains concepts conversationally
// Assessment Agent - Tests knowledge and identifies gaps
// Tutoring Agent - Provides personalized guidance
// Practice Agent - Creates exercises and challenges
```

### Agent Factory Pattern

```typescript
// src/main/agents/learning-agent.ts
export function createLearningAgent({
  aiService,
  knowledgeService,
  loggerService,
}: Dependencies): Agent {
  return {
    type: 'learning',
    async process(input: AgentInput): Promise<AgentOutput> {
      loggerService.info('Processing learning request', { input });

      // Use knowledge service to find relevant concepts
      const concepts = await knowledgeService.search(input.query);

      // Generate explanation using AI
      const explanation = await aiService.complete(`Explain ${input.query} in detail`);

      return {
        response: explanation,
        concepts,
        suggestions: generateSuggestions(concepts),
      };
    },
  };
}
```

### Agent Tools

**Tools wrap service calls:**

```typescript
// src/main/agents/tools/knowledge-extraction.ts
export function knowledgeExtractionTool(services: Services) {
  return async (input: ExtractionInput): Promise<ExtractionResult> => {
    // Use services, not direct API calls
    const concepts = await services.knowledgeService.extractConcepts(input.content);
    const relationships = await services.knowledgeService.findRelationships(concepts);

    return { concepts, relationships };
  };
}
```

## State Management

### Zustand Stores (Renderer)

```typescript
// src/renderer/stores/userStore.ts
import { create } from 'zustand';

interface UserState {
  sessions: LearningSessionDisplay[];
  currentSession: LearningSessionDisplay | null;
  preferences: UserPreferencesDisplay;
  actions: {
    setCurrentSession: (session: LearningSessionDisplay) => void;
    addSession: (session: LearningSessionDisplay) => void;
    updatePreferences: (prefs: Partial<UserPreferencesDisplay>) => void;
  };
}

export const useUserStore = create<UserState>((set) => ({
  sessions: [],
  currentSession: null,
  preferences: {},
  actions: {
    setCurrentSession: (session) => set({ currentSession: session }),
    addSession: (session) =>
      set((state) => ({
        sessions: [...state.sessions, session],
      })),
    updatePreferences: (prefs) =>
      set((state) => ({
        preferences: { ...state.preferences, ...prefs },
      })),
  },
}));
```

### React Hooks

```typescript
// src/renderer/hooks/useSession.ts
export function useSession(sessionId?: string) {
  const [session, setSession] = useState<LearningSessionDisplay | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    async function loadSession() {
      setLoading(true);
      try {
        const response = await window.electronAPI.learning.getSession(sessionId);
        if (response.success) {
          setSession(response.data);
        }
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  return { session, loading, setSession };
}
```

## Security Architecture

### Process Isolation

```
┌─────────────────────────────┐
│     Renderer Process        │
│   (Sandboxed Browser)      │
│                             │
│  - No Node.js access        │
│  - Limited file system      │
│  - Isolated from OS         │
└─────────────┬───────────────┘
              │ IPC (only)
              │ exposed methods
              ▼
┌─────────────────────────────┐
│      Preload Script         │
│    (Security Boundary)      │
│                             │
│  - Input validation         │
│  - API method whitelisting  │
│  - Type checking            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│      Main Process           │
│     (Full Node.js)          │
│                             │
│  - Database access          │
│  - File system operations   │
│  - AI provider calls        │
│  - System APIs              │
└─────────────────────────────┘
```

### Security Principles

1. **Renderer cannot access Node.js directly**
2. **All communication through preload script**
3. **Input validation in main process**
4. **API methods explicitly whitelisted**
5. **Type-safe contracts prevent errors**

## Data Flow

### Typical Learning Flow

```
1. User types message (Renderer)
   ↓
2. window.electronAPI.chat.sendMessage() (Preload)
   ↓
3. 'chat:sendMessage' IPC handler (Main)
   ↓
4. chatService.sendMessage() (Service)
   ↓
5. db.insertInto('messages') (Database)
   ↓
6. aiService.complete() (AI Provider)
   ↓
7. Response flows back up through layers
   ↓
8. UI updates with streaming response (Renderer)
```

### Knowledge Discovery Flow

```
1. User imports materials (Renderer)
   ↓
2. window.electronAPI.content.analyzeDocument() (Preload)
   ↓
3. contentService.analyzeDocument() (Service)
   ↓
4. Extract concepts with AI (AI Service)
   ↓
5. Store in database (Kysely)
   ↓
6. Generate embeddings (Vector Service)
   ↓
7. Build knowledge graph (Knowledge Service)
   ↓
8. Update UI (Renderer)
```

## Performance Considerations

### Memory Management

**Multi-process monitoring:**

- Main process: ~150MB (stable)
- Vite dev server: Optimized with file watching exclusions
- Qdrant vector DB: ~125MB
- Renderer: ~100-200MB

**See**: [performance.md](./performance.md)

### Optimization Strategies

1. **Lazy loading** - Components load on demand
2. **Query optimization** - Indexes on foreign keys
3. **Caching** - Intelligent cache invalidation
4. **Streaming** - Real-time responses
5. **Virtualization** - Large list rendering

## Development Workflow

### File-Watching Exclusions (Vite)

```typescript
// vite.config.ts
server: {
  watch: {
    ignored: [
      '**/node_modules/**', // 50,000+ files
      '**/dist/**', // Build artifacts
      '**/.git/**', // Git history
      '**/test_workspace/**', // User data
      '**/external/**', // Large binaries
    ];
  }
}
```

### Test Organization

```
src/
├── main/
│   └── services/
│       ├── domain/
│       │   └── chat/
│       │       ├── chat-service.ts
│       │       └── __tests__/
│       │           └── chat-service.test.ts
│       └── core/
│           └── database/
│               ├── kysely-database.ts
│               └── __tests__/
│                   └── database.test.ts
├── renderer/
│   └── components/
│       └── Chat/
│           ├── ChatInterface.tsx
│           └── __tests__/
│               └── ChatInterface.test.tsx
└── integration/
    └── chat-flow.test.ts
```

## Design Patterns

### 1. Factory Pattern

```typescript
// Service factories
export function createChatService(dependencies: Dependencies): ChatService;
export function createLearningService(dependencies: Dependencies): LearningService;

// Agent factories
export function createLearningAgent(dependencies: Dependencies): Agent;
export function createTutoringAgent(dependencies: Dependencies): Agent;
```

### 2. Repository Pattern

```typescript
// Data access abstraction
interface ChatRepository {
  createMessage(data: InsertableMessage): Promise<MessageRow>;
  getMessages(sessionId: string): Promise<MessageRow[]>;
  deleteMessage(id: string): Promise<void>;
}

export function createChatRepository(db: Kysely<Database>): ChatRepository {
  return {
    async createMessage(data) {
      return await db.insertInto('messages').values(data).returningAll().executeTakeFirst();
    },
  };
}
```

### 3. Strategy Pattern

```typescript
// AI provider strategy
interface AIProvider {
  complete(prompt: string): Promise<string>;
  stream(prompt: string, onChunk: (chunk: string) => void): Promise<void>;
}

export function createOpenAIProvider(config: OpenAIConfig): AIProvider {
  return {
    async complete(prompt) {
      // OpenAI-specific implementation
    },
    async stream(prompt, onChunk) {
      // OpenAI streaming implementation
    },
  };
}
```

## Architecture Benefits

### 1. Maintainability

- Clear separation of concerns
- Functional pattern (no classes)
- Explicit dependencies
- Type-safe throughout

### 2. Testability

- Easy to mock dependencies
- Pure functions
- Isolated unit tests
- Integration test support

### 3. Security

- Process isolation
- Preload security boundary
- Input validation
- Type safety

### 4. Performance

- Multi-process architecture
- Optimized IPC
- Lazy loading
- Memory monitoring

### 5. Extensibility

- Plugin-friendly services
- Provider abstraction
- Modular architecture
- Clean interfaces

## Related Documentation

- [Electron API](./electron-api.md) - IPC contracts
- [Database Design](./database.md) - Schema and queries
- [Services Guide](./services.md) - Service patterns
- [Agent System](./agents.md) - Multi-agent orchestration
- [Performance](./performance.md) - Optimization

---

**Last Updated**: November 2025 **Version**: 1.0
