# Developer Guide

Welcome to the Learning Catalyst developer documentation! This guide will help you understand the codebase, architecture, and development workflows.

## Overview

Learning Catalyst is an **Electron desktop application** with a modern, service-oriented architecture:

- **Multi-process**: Main process (Node.js) + Renderer (React)
- **Type-safe**: Full TypeScript coverage with Kysely
- **Functional pattern**: Services with dependency injection
- **Test-driven**: Comprehensive test suites

## Architecture at a Glance

### Process Separation

```
┌─────────────────────────────────────┐
│   Renderer Process (React Browser)  │
│   - UI Components                   │
│   - State Management (Zustand)      │
│   - User Interactions               │
│   - Consumes: window.electronAPI    │
└─────────────────┬───────────────────┘
                  │ IPC
                  │ Secure Channel
                  ▼
┌─────────────────────────────────────┐
│   Main Process (Node.js)            │
│   - AI Services                     │
│   - Database (SQLite + Kysely)      │
│   - Agent Orchestration             │
│   - Provides: electronAPI           │
└─────────────────────────────────────┘
```

### Service-Oriented Architecture

```
Main Process
├── Core Services
│   ├── Database Service (Kysely)
│   ├── Config Service
│   └── Logger Service
├── Domain Services
│   ├── Chat Service
│   ├── Learning Service
│   ├── Knowledge Service
│   └── Analytics Service
└── AI Services
    ├── AI Service (Abstraction)
    └── Provider Services (OpenAI, ChatGLM, etc.)
```

## Development Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# npm 9+
npm --version

# Git
git --version

# Optional: pnpm (faster installs)
npm install -g pnpm
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/learning-catalyst.git
cd learning-catalyst

# Install dependencies
npm install

# Verify installation
npm run type-check
```

### Development Workflow

```bash
# Start development server (hot reload)
npm run dev

# Run tests
npm test

# Run specific test suite
npm run test:main        # Main process tests
npm run test:renderer    # Renderer tests
npm run test:integration # IPC tests

# Build for production
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

### Debugging

**Main Process (Node.js):**
```bash
# Debug mode
npm run dev:debug

# Attach debugger at: localhost:9229
```

**Renderer Process:**
- Open DevTools: Ctrl+Shift+I
- React DevTools available
- Source maps enabled

## Codebase Structure

### Main Process (src/main)

```
src/main/
├── index.ts                    # Entry point
├── preload/                    # Security layer
├── handlers/                   # IPC handlers
│   ├── chat-handlers.ts
│   ├── learning-handlers.ts
│   └── ...
├── services/                   # Service layer
│   ├── core/                   # Core infrastructure
│   │   ├── database/           # Database (Kysely)
│   │   ├── config/             # Configuration
│   │   └── logger/             # Logging
│   ├── domain/                 # Business logic
│   │   ├── chat/               # Chat service
│   │   ├── learning/           # Learning service
│   │   ├── knowledge/          # Knowledge service
│   │   └── analytics/          # Analytics service
│   └── ai/                     # AI services
│       ├── ai-service.ts
│       └── providers/          # AI provider implementations
├── agents/                     # Multi-agent system
│   ├── learning-agent.ts
│   ├── tutoring-agent.ts
│   └── tools/                  # Agent tools
└── types/                      # TypeScript types
```

### Renderer Process (src/renderer)

```
src/renderer/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component
├── components/                 # React components
│   ├── Dashboard/
│   ├── Chat/
│   ├── KnowledgeMap/
│   └── ...
├── hooks/                      # Custom hooks
├── services/                   # Frontend services
│   └── electronAPI.ts          # API client
└── stores/                     # State management
    └── userStore.ts
```

### Shared Types (src/shared)

```
src/shared/
└── types/
    ├── electron-api/           # IPC contracts
    │   ├── index.ts            # Main API interface
    │   ├── chat-api.ts
    │   ├── learning-api.ts
    │   └── ...
    └── database/               # Database types
        └── schema.ts
```

## Key Patterns

### 1. Functional Service Pattern

**No classes** - Services are objects with functions:

```typescript
// ✅ Good: Functional service
export function createChatService({ db, loggerService }: Dependencies) {
  return {
    async sendMessage(content: string, sessionId?: string) {
      loggerService.info('Sending message');
      const result = await db
        .insertInto('messages')
        .values({ content, session_id: sessionId })
        .execute();
      return result;
    }
  };
}

// ❌ Avoid: Class-based service
export class ChatService {
  constructor(private db: Database) {}

  async sendMessage(content: string) {
    // ...
  }
}
```

### 2. Dependency Injection

**Explicit dependencies** - Pass them as parameters:

```typescript
// ✅ Good: Clear dependencies
const chatService = createChatService({
  db,
  loggerService,
  aiService
});

// ✅ Good: Testable with mocks
const mockDb = createMock<Database>();
const chatService = createChatService({
  db: mockDb,
  loggerService: mockLogger
});
```

### 3. Type-Safe IPC

**IPC contracts defined centrally**:

```typescript
// ✅ Good: Type-safe IPC
interface ElectronAPI {
  chat: ChatAPI;
  learning: LearningAPI;
  // ...
}

// Usage in renderer
const response = await window.electronAPI.chat.sendMessage(message);
// TypeScript ensures type safety
```

### 4. Kysely Database

**Type-safe queries**:

```typescript
// ✅ Good: Type-safe query
const sessions = await db
  .selectFrom('learning_sessions')
  .selectAll()
  .where('end_time', 'is', null)
  .execute();

// ❌ Avoid: Raw SQL
const sessions = await db.query(
  'SELECT * FROM learning_sessions WHERE end_time IS NULL'
);
```

## Common Development Tasks

### Adding a New IPC Method

1. **Define the interface**:
```typescript
// src/shared/types/electron-api/my-api.ts
export interface MyAPI {
  myMethod: (param: string) => Promise<MyResult>;
}
```

2. **Update main interface**:
```typescript
// src/shared/types/electron-api/index.ts
export interface ElectronAPI {
  // ...
  myApi: MyAPI;
}
```

3. **Implement handler**:
```typescript
// src/main/handlers/my-handlers.ts
export function setupMyHandlers() {
  ipcMain.handle('myApi:myMethod', async (event, param) => {
    const result = await myService.myMethod(param);
    return { success: true, data: result };
  });
}
```

4. **Update preload**:
```typescript
// src/main/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // ...
  myApi: {
    myMethod: (param: string) => ipcRenderer.invoke('myApi:myMethod', param)
  }
});
```

### Adding a New Service

1. **Create service file**:
```typescript
// src/main/services/domain/my-service/my-service.ts
export function createMyService({ db, logger }: Dependencies) {
  return {
    async myMethod(param: string) {
      // Implementation
      return result;
    }
  };
}
```

2. **Register in main**:
```typescript
// src/main/index.ts
import { createMyService } from './services/domain/my-service/my-service';

const myService = createMyService({ db, logger });
```

3. **Use in handlers**:
```typescript
// src/main/handlers/my-handlers.ts
export function setupMyHandlers() {
  ipcMain.handle('my:myMethod', async (event, param) => {
    return await myService.myMethod(param);
  });
}
```

### Adding a Database Table

1. **Create migration**:
```typescript
// src/main/services/core/database/migrations/YYYYMMDD_create_my_table.ts
export async function up(db: Kysely<Database>): Promise<void> {
  await db.schema
    .createTable('my_table')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .execute();
}
```

2. **Add to schema**:
```typescript
// src/main/services/core/database/kysely-schema.ts
export interface Database {
  // ...
  my_table: MyTableRow;
}
```

3. **Create index**:
```typescript
await db.schema
  .createIndex('idx_my_table_name')
  .on('my_table')
  .column('name')
  .execute();
```

## Testing

### Test Structure

```
src/
├── main/
│   └── services/
│       └── domain/
│           └── my-service/
│               ├── my-service.ts
│               └── __tests__/
│                   └── my-service.test.ts
├── renderer/
│   └── components/
│       └── MyComponent/
│           ├── MyComponent.tsx
│           └── __tests__/
│               └── MyComponent.test.tsx
└── integration/
    └── my-feature.test.ts
```

### Main Process Tests

```typescript
// src/main/services/domain/my-service/__tests__/my-service.test.ts
import { describe, it, expect } from 'vitest';
import { createMyService } from '../my-service';

describe('MyService', () => {
  it('should handle myMethod', async () => {
    const mockDb = createMock<Database>();
    const mockLogger = createMock<Logger>();

    const service = createMyService({
      db: mockDb,
      logger: mockLogger
    });

    const result = await service.myMethod('test');
    expect(result).toBeDefined();
  });
});
```

### Renderer Tests

```typescript
// src/renderer/components/MyComponent/__tests__/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// src/integration/my-feature.test.ts
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('works end-to-end', async () => {
    // Test IPC flow
    const result = await window.electronAPI.myApi.myMethod('test');
    expect(result.success).toBe(true);
  });
});
```

## Performance

### Memory Management

- **Multi-process monitoring**: Each process tracked separately
- **Vite file watching**: Large directories excluded
- **Chunk size limits**: Prevent memory bloat
- **Custom memory plugin**: Proactive monitoring

See: [performance.md](./performance.md)

### Optimization Strategies

1. **Lazy load components**:
```typescript
// ✅ Good: Lazy loading
const KnowledgeMap = lazy(() => import('../components/KnowledgeMap'));
```

2. **Optimize queries**:
```typescript
// ✅ Good: Selective columns
const sessions = await db
  .selectFrom('learning_sessions')
  .select(['id', 'title', 'updated_at'])  // Only needed columns
  .execute();
```

3. **Use indexes**:
```typescript
// Always index foreign keys
await db.schema
  .createIndex('idx_messages_session_id')
  .on('messages')
  .column('session_id')
  .execute();
```

## Code Style

### TypeScript

- **Strict mode**: Enabled in tsconfig.json
- **No `any`**: Use proper types or `unknown`
- **Explicit return types**: For public methods
- **No `!` assertions**: Prefer null checks

### Formatting

- **Prettier**: Automatic formatting
- **Line length**: 130 characters max
- **Import order**: organize imports consistently

### Naming

- **Files**: kebab-case (`my-service.ts`)
- **Components**: PascalCase (`MyComponent.tsx`)
- **Functions**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE

## Common Issues

### "Cannot find module '@/shared/..."

**Solution**: Check TypeScript paths configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### "ElectronAPI is not defined"

**Solution**: Ensure preload script exposes API
```typescript
// src/main/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // ... exposed methods
});
```

### Type errors with Kysely

**Solution**: Use proper type parameters
```typescript
// ✅ Good
const session = await db
  .selectFrom('learning_sessions')
  .selectAll()
  .executeTakeFirst();

// ❌ Bad
const session = await db
  .query('SELECT * FROM learning_sessions');
```

### High memory usage in dev

**Solution**: Check vite.config.ts for exclusions
```typescript
// Exclude large directories
watch: {
  ignored: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**'
  ]
}
```

## Useful Resources

### Documentation
- [Architecture](architecture.md) - System design
- [Electron API](electron-api.md) - IPC contracts
- [Database](database.md) - Schema and queries
- [Services](services.md) - Service patterns
- [Agents](agents.md) - Multi-agent system
- [Performance](performance.md) - Optimization

### External Docs
- [Electron](https://www.electronjs.org/docs)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Kysely](https://kysely.dev)
- [Vite](https://vitejs.dev)

### Tools
- **VSCode**: Recommended IDE
- **React DevTools**: Browser extension
- **Vue DevTools**: Alternative browser extension
- **Electron DevTools**: Browser extension

## Getting Help

- **Code**: Read the source - it's well-documented
- **Tests**: See examples in `__tests__` directories
- **GitHub Issues**: Report bugs or ask questions
- **GitHub Discussions**: Architecture discussions

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Write** tests for new code
4. **Follow** the code style (Prettier will format)
5. **Run** tests: `npm test`
6. **Commit** changes: `git commit -m 'Add amazing feature'`
7. **Push** to branch: `git push origin feature/amazing-feature`
8. **Open** a Pull Request

### PR Requirements

- ✅ Tests pass
- ✅ TypeScript compiles without errors
- ✅ Code formatted with Prettier
- ✅ Documentation updated
- ✅ No breaking changes (or properly migrated)

---

**Ready to dive deeper?** → [Architecture Overview](architecture.md)
