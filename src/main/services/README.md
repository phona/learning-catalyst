# Services Architecture

This directory contains the business logic layer of the Learning Catalyst application, following Domain-Driven Design principles.

## Structure

### Core Services (`core/`)
Infrastructure-level services providing foundational capabilities.

- **Database** - Kysely-based SQLite integration with migrations and schema management
- **Config** - Configuration management with persistent storage via electron-store
- **Logger** - Application-wide logging with structured output
- **Analysis** - Learning pattern analysis, conversation analysis, and vibe detection
- **Checkpoints** - State persistence for long-running operations and recovery
- **Context** - User context tracking and session management
- **Error Handling** - Centralized error handling and IPC error management

### Domain Services (`domain/`)
Business logic services implementing core application features.

- **Chat** - Conversational AI and multi-agent orchestration with streaming
- **Learning** - Learning session management, progress tracking, and concept relationships
- **Knowledge** - Concept management, knowledge graph operations, and vector storage
- **Analytics** - User progress analytics, achievements, and learning trends
- **Workflow** - Event-driven workflow orchestration with specialized nodes
- **Practice** - Gamified learning challenges and practice session management
- **Concept Parsing** - Content ingestion, concept extraction, and knowledge normalization
- **Content** - Content management and discovery services

### Agent Services (`agent/`)
AI provider abstraction and model access layer.

- **Provider Factory** - Direct access to AI models via `getModel()`, `getEmbeddings()`, etc.
- **Tool Registry** - Dynamic tool loading and execution framework
- **Multi-Provider Support** - OpenAI, ChatGLM, DeepSeek, local models

### AI Services (`ai/`)
AI provider abstraction layer and management.

- **AI Service** - Unified interface for AI operations across providers
- **Providers** - Multiple AI provider implementations:
  - OpenAI (GPT models)
  - ChatGLM (with thinking process visualization)
  - DeepSeek
  - Local models (Ollama, Llama.cpp)
- **Streaming** - Real-time response streaming across all providers

## Dependency Flow

```
main/index.ts
  ↓
IPC Handlers (src/main/handlers/)
  ↓
Domain Services (Business Logic)
  ↓
Core Services (Infrastructure)
  ↓
Database Layer (SQLite + Qdrant Vector DB)
```

## Service Creation Pattern

All services follow the functional factory pattern:

```typescript
export function createMyService(deps: Dependencies) {
  const internalState = { data: null };

  return {
    method: async (input: Input) => {
      internalState.data = await process(input, deps);
      return internalState.data;
    }
  };
}
```

**Key principles:**
- ✅ Functional factories (NO classes)
- ✅ Dependency injection via parameters
- ✅ No direct electron API access
- ✅ Async/await for all operations
- ✅ Proper error handling and propagation

## Dependency Injection

Services receive dependencies as constructor parameters:

```typescript
// Main process service creation
const chatService = createChatService({
  db: database,
  loggerService: loggerService,
  aiService: aiService,
  providerFactory: providerFactory
});

// Renderer consumes via electronAPI
const response = await window.electronAPI.chat.sendMessage(message);
```

## Creating New Services

1. **Create service factory** in appropriate subdirectory (`core/`, `domain/`, `agent/`, or `ai/`)
2. **Export from index** - Add to `src/main/services/index.ts`
3. **Create IPC handler** - Add to `src/main/handlers/`
4. **Define IPC contract** - Add type definitions to `src/shared/types/electron-api/`
5. **Export handler** - Add to `src/main/handlers/index.ts`
6. **Add preload exposure** - Update `src/main/preload/index.ts`

## Testing

Each service includes:
- **Unit tests** in `__tests__/` subdirectory
- **Integration tests** for cross-service interactions
- **Mock dependencies** using test utilities from `src/test/utils/`

Test patterns:
```typescript
describe('MyService', () => {
  it('should process input', async () => {
    const mockDB = createMockDB();
    const service = createMyService({ db: mockDB });
    const result = await service.process(input);
    expect(result).toBeDefined();
  });
});
```

## Error Handling

- Services throw errors rather than catching them silently
- Errors propagate to IPC layer
- Renderer receives structured error responses
- User-friendly error messages displayed in UI

## Logging

All services receive a logger instance:
- Structured logging with levels (info, warn, error)
- Context preservation across service calls
- Performance timing for critical operations

## See Also

- [Developer Guide: Services](../../docs/DEVELOPER-GUIDE/services.md)
- [Architecture Overview](../../docs/DEVELOPER-GUIDE/architecture.md)
- [Testing Guide](../../docs/DEVELOPER-GUIDE/testing.md)
- [Agent System Guide](../../docs/DEVELOPER-GUIDE/agents.md)
