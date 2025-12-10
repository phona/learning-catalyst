# CLAUDE.md

Learning Catalyst - AI-powered desktop application for personalized learning with multi-agent
orchestration. Built with TypeScript, Electron, React, and LangChain integration.

## 🎯 Product Vision

**Core Mission**: Transform learning from passive reading into active discovery through AI-guided
exploration.

**User Experience**: Make the study → assess → review loop feel like an engaging game:

- **Discovery** 🗺️, not studying
- **Conversation** 💬, not lectures
- **Achievement** 🏆, not testing
- **Adventure** 🚀, not curriculum

**Key Documents**:

- 📋 [Product Blueprint](./docs/product-blueprint.md) - User-focused vision
- 🏗️ This document - Technical implementation

## Quick Start

```bash
npm install           # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

### Testing

```bash
npm run test:main        # Main process tests
npm run test:renderer    # Renderer tests
npm run test:integration # Cross-process tests
npm run test:performance # Memory & performance tests
npm run test:complete    # All test suites
npm run test:coverage    # Coverage reports
```

Deep dives:

- Test Strategy → [docs/DEVELOPER-GUIDE/testing.md#test-strategy](./docs/DEVELOPER-GUIDE/testing.md#test-strategy)
- Test Cases Template → [docs/DEVELOPER-GUIDE/testing.md#test-cases](./docs/DEVELOPER-GUIDE/testing.md#test-cases)
- Test Execution Process → [docs/DEVELOPER-GUIDE/testing.md#test-execution](./docs/DEVELOPER-GUIDE/testing.md#test-execution)
- Design for Testability → [docs/DEVELOPER-GUIDE/testing.md#design-for-testability](./docs/DEVELOPER-GUIDE/testing.md#design-for-testability)
- AI-Assisted Testing → [docs/DEVELOPER-GUIDE/testing.md#ai-assisted-testing](./docs/DEVELOPER-GUIDE/testing.md#ai-assisted-testing)

Targeted iteration scripts:

- `npm run test:main:file -- <file>`
- `npm run test:renderer:file -- <file>`
- `npm run test:main:ui` / `npm run test:renderer:ui`

## Architecture

**Multi-Process Electron App:**

- **Main Process** (Node.js): AI services, database, agent orchestration → **provides electronAPI**
- **Renderer Process** (Browser): React UI, state management → **consumes electronAPI**
- **IPC Layer**: Secure communication via preload scripts
- **Storage**: SQLite (source of truth) + Qdrant (vector index only)
- **AI**: Multi-provider (OpenAI, ChatGLM, DeepSeek, local models)

**📚 Database Architecture**: [ARCHITECTURE-CLEAN-DATABASE.md](./docs/ARCHITECTURE-CLEAN-DATABASE.md) - Clean separation of SQLite (full data) and Qdrant (vectors + conceptId)

### Functional Pattern (All Modules)

**All code uses React-style functional factories - NO classes:**

```typescript
// ✅ Service Factory
export function createService(deps: Dependencies) {
  const internalState = { data: null };

  return {
    method: (input: Input) => {
      internalState.data = process(input);
      return internalState.data;
    }
  };
}

// ✅ Agent Factory
export function createAgent(deps: Dependencies) {
  return {
    process: async (input: Input) => {
      return await deps.service.method(input);
    }
  };
}

// ✅ React Component
export function Component({ prop }: Props) {
  const [state, setState] = useState<Type>();
  return <div>{/* JSX */}</div>;
}
```

### Key Principles

- **Process Separation**: Main (provides) ↔ Renderer (consumes)
- **electronAPI Flow**: One-way only
  ```
  Main → IPC Handler → Preload → window.electronAPI → Renderer
  ```
- Renderer code now subscribes to `onIPCError` so structured IPC payloads surface as toasts/setup
  guidance whenever the main process cannot initialize (missing chat config, startup failures). That
  ensures the UI never falls back to hidden defaults.
- Readiness + config propagation rely on buffered `ts-chan` channels in preload; use
  `awaitReady/awaitConfigChange` rather than polling or timeouts to gate renderer flows. After a
  `status: 'ready'` snapshot is observed, later non-ready snapshots are ignored to avoid UI
  regressions/timeouts. The main process also caches the latest readiness snapshot and replays it on
  `did-finish-load`, and preload hydrates from `system:get-latest-ready` on reload to avoid missed
  events during development.
- **Main Process**: NEVER accesses electronAPI (only provides it)
- **Service Pattern**: Pass dependencies as function parameters
- **Agent Tools**: Call service functions only (not lower-level APIs)

### Chat streaming status

- Chat streaming now emits `chat:status` frames (retry/tip/fail/tool) on the same MessageChannel used for chunks; renderers can ignore if unsupported.
- Retry policy is bounded (2 attempts, 20s per attempt) with fast-fail for auth/quota/validation so the UI doesn’t wait on hidden backoff loops.
- **State**: Tracked via Kysely/SQLite tables (not separate stores)

### Implementation Guidelines

- Agent-first design with sophisticated orchestration
- Provider abstraction for multiple AI services
- Local-first data storage
- Memory-optimized development environment
- Full TypeScript coverage with strict mode
- Use `.tsx` for React components/JSX and `.ts` for TypeScript-only files
- IPC contracts defined in `@/shared/types/electron-api/` ensure type-safe communication
- Maintain dependency injection for internal communication (never access `window.electronAPI` from
  the main process)
- Favor direct, purposeful code modifications without unnecessary prefixes
- Limit `any` usage to maintain type safety
- Avoid try/catch blocks that only silence errors
- Propagate errors to the UI layer so they render user-friendly messages

### Knowledge ingestion plan (new)

- `knowledge.ingestConcepts` accepts an optional `plan` with per-concept `actions`, field toggles, canonical/alias choices, merge targets, and low-confidence thresholds.
- Defaults stay the same (`overwrite` existing names, keep relationships) when no plan is provided.
- Relationships are pruned when their source/target is skipped or merged; ingestion results now include `conceptsSkipped`, `conceptsMerged`, `relationshipsSkipped`, and `lowConfidenceSkipped`.

## Project Structure

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── services/            # Functional service layer
│   │   ├── core/            # Infrastructure (database, config, logger)
│   │   ├── domain/          # Business logic (chat, learning, knowledge, analytics)
│   │   └── ai/              # AI operations and providers
│   ├── agents/              # Agent layer (factories + tools)
│   ├── handlers/            # IPC handlers (expose electronAPI)
│   └── preload/             # Preload scripts
├── renderer/                # React frontend (Browser)
│   ├── components/          # UI components
│   ├── hooks/               # Custom hooks
│   ├── services/            # Frontend services (consume electronAPI)
│   └── stores/              # Zustand state
└── shared/                  # Shared utilities and types
    ├── types/               # TypeScript interfaces
    └── utils/               # Shared utilities
```

## Development Guidelines

### Service Architecture

**Core Services** (Infrastructure):

- Database: `createDatabase()`, `createSqliteDriverFactory()`
- Config: `createConfigService()`
- Logger: `createLoggerService()`

**Domain Services** (Business Logic):

- `createChatService({ db, loggerService })`
- `createLearningService({ db, aiService })`
- `createKnowledgeService({ db, vectorService })`
- `createAnalyticsService({ db })`

**AI Services**:

- `createAIService({ config, logger })`
- Provider modules: `openai-provider.ts`, `chatglm-provider.ts`, etc.

### Import Patterns

```typescript
// Core services
import { createDatabase } from '@/main/services/core/database/kysely-database';
import { createConfigService } from '@/main/services/core/config/config-service';

// Domain services
import { createChatService } from '@/main/services/domain/chat/chat-service';
import { createKnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';

// AI services
import { createAIService } from '@/main/services/ai/ai-service';

// Agent factories
import { createLearningAgent } from '@/main/agents/learning-agent';
import { createTutoringAgent } from '@/main/agents/tutoring-agent';

// IPC handlers
import { setupChatHandlers } from '@/main/handlers/chat-handlers';
```

### Component Development

**React Best Practices:**

- ✅ Functional components with hooks
- ✅ TypeScript interfaces for props
- ✅ useCallback, useMemo for optimization
- ❌ Class components

**State Management:**

- Zustand: Global application state
- React useState: Component-local state
- Electron store: Persistent configuration

## Key Features

**Modern Desktop App:**

- React UI with Tailwind CSS
- Real-time streaming responses
- Zustand state management
- Cross-platform support

**Core Capabilities:**

- AI chat (multiple providers) → **Conversational Learning Adventures**
- Knowledge graphs → **Visual Knowledge Discovery Maps**
- Session management → **Learning Quest Persistence**
- Analytics dashboard → **Achievement & Progress Celebration**
- Settings panel → **Learning Experience Personalization**
- Import/export → **Learning Material Library**

## AI Integration

**Supported Providers:**

- OpenAI (GPT models)
- ChatGLM (thinking process visualization)
- DeepSeek, SiliconFlow
- Local models (Ollama, Llama.cpp)

**Advanced Features:**

- Real-time reasoning visualization (ChatGLM)
- Seamless provider switching
- Automatic model discovery with timeout
- Custom model support
- Streaming across all providers

## Multi-Agent System

**Specialized Agents:**

- **Learning** -> Learning Guide (explores concepts conversationally).
- **Assessment** -> Understanding Coach (pulls practice/discussion evidence for the provided goal+concepts, scores confidence, infers level; tools: fetch_practice_history, fetch_goal_artifacts, fetch_discussion_transcript, grade_open_answer; no userId or extra context needed in this desktop app; no new questions invented).
- **Tutoring** -> Learning Mentor (personalized help and motivation).
- **Practice** -> Practice Master (gamified challenges).
- **Learning Planner** -> Builds single-session plans using the session blueprint tool; requires `level` + `timeAvailable` (no difficulty aliases or defaults).
- **Session Blueprint (single-session)** -> Builds a one-sitting plan with one primary concept plus required retrieval/apply/teach-back/open-question blocks, bounded by `level` (novice|intermediate|advanced) and `timeAvailable`; `level` is the only difficulty field. Supervisor should call assessment first when level is unknown.

**Configuration Schema:**

```typescript
interface AgentConfiguration {
  id: string;
  name: string;
  type: 'learning' | 'assessment' | 'tutoring' | 'practice';
  modelConfig: { provider: string; model: string; temperature: number };
  tools: string[];
  capabilities: string[];
}
```

## Code Standards

- TypeScript strict mode
- 130-character line length
- ESLint with React/TypeScript plugins
- Functional pattern everywhere (NO classes)
- Organized imports
- `.tsx` for React/JSX, `.ts` for TypeScript-only

### Naming Guidelines

**Folders**: kebab-case (`user-management`, `knowledge-graph`) **Components**: PascalCase
(`UserProfile.tsx`, `ChatInterface.tsx`) **Services**: camelCase (`chatService.ts`,
`databaseManager.ts`) **Utilities**: camelCase (`dateUtils.ts`, `validationHelpers.ts`)

### Anti-Patterns to Avoid

❌ `IUserInterface.ts` (prefixes) ❌ `UserServiceClass.ts` (suffixes) ❌ `utils.ts` (too generic) ❌
`component1.ts` (non-descriptive)

✅ `user-types.ts` (clear purpose) ✅ `UserService.ts` (clean naming) ✅ `dateUtils.ts` (specific
functionality) ✅ `UserProfile.tsx` (descriptive)

## Testing Strategy

**Multi-Environment:**

- **Main Process**: AI services, database, agents
- **Renderer**: React components, hooks, UI
- **Integration**: IPC communication
- **Performance**: Memory leaks, resource management

**Frameworks:**

- Vitest + React Testing Library
- jsdom for DOM simulation
- Custom Electron integration setup

**Coverage Targets:**

- Main Process: >90%
- Renderer: >90%
- Integration: >80%
- Overall: >85%

## Memory & Performance

**Development Optimization:**

- Node.js: 512MB heap, 64MB semispace
- Manual code splitting
- Optimized file watching
- Memory monitoring and alerts

**Best Practices:**

- Monitor memory usage during development
- Use performance test suite regularly
- Follow cleanup patterns for event listeners
- Be mindful of Node.js polyfill memory impact

## Working with the Codebase

### Development Workflow

1. `npm run dev:workspace` - Start development server
2. Understand: Main (provides) ↔ Renderer (consumes)
3. **NEVER** use `window.electronAPI` in main process
4. Run tests regularly across all environments
5. Use TypeScript strictly
6. Monitor memory usage

### Key Patterns

**Creating Services:**

```ts
const dbPath = getDefaultDatabasePath();
const driverFactory = await createSqliteDriverFactory(dbPath);
await runMigrations(driverFactory);
const db = createDatabase(driverFactory);

// Use factory pattern
const chatService = createChatService({ db, loggerService });
```

**Creating Agents:**

```ts
const agent = createLearningAgent({
  learningService,
  knowledgeService,
  aiService,
});
```

**IPC Communication:**

```ts
// Main process - EXPOSE electronAPI
const setupChatHandlers = ({ chatService }) => {
  ipcMain.handle('chat:sendMessage', async (event, input) => {
    return await chatService.sendMessage(input);
  });
};

// Renderer process - CONSUME electronAPI
const response = await window.electronAPI.chat.sendMessage(message);
```

### Critical Rules

- ✅ Main Process: Provides electronAPI via IPC handlers
- ❌ Main Process: NEVER accesses electronAPI
- ✅ Renderer Process: Consumes electronAPI
- ✅ All Communication: Through IPC contracts in `@/shared/types/electron-api/`
- ✅ Service Pattern: Pass dependencies as parameters
- ✅ Functional Approach: Use factories, NOT classes

## 🎯 Development Alignment

**Before implementing any feature, ask:**

- Does this make learning feel like discovery? 🗺️
- Does this create conversational interaction? 💬
- Does this provide achievement and progress? 🏆
- Does this feel like an adventure, not studying? 🚀

**User Experience Validation:**

- [ ] Feature supports study → assess → review loop
- [ ] Technical complexity hidden from users
- [ ] Language emphasizes exploration over education
- [ ] Progress feels like achievement, not evaluation
- [ ] Interaction feels conversational, not mechanical

**Implementation Priority:**

1. User experience > Technical sophistication
2. Conversational flow > Feature completeness
3. Achievement motivation > Data accuracy
4. Adventure framing > Traditional education patterns

## Key Files

**Core Implementation:**

- `src/main/index.ts` - Electron main entry
- `src/renderer/App.tsx` - React app root
- `package.json` - Project configuration
- `vite.config.ts` - Build setup

**Business Logic:**

- Database: `src/main/services/core/database/`
- Config: `src/main/services/core/config/`
- Chat: `src/main/services/domain/chat/`
- Learning: `src/main/services/domain/learning/`
- Knowledge: `src/main/services/domain/knowledge/`
- Analytics: `src/main/services/domain/analytics/`
- AI: `src/main/services/ai/`
- Agents: `src/main/agents/`
- IPC Handlers: `src/main/handlers/`

**Testing:**

- `vitest*.config.ts` - Test configurations
- `src/test/` - Global test utilities

**Documentation:**

- `docs/ARCHITECTURE-CLEAN-DATABASE.md` - Clean database architecture guide (SQLite + Qdrant separation)

## Assistant UI Integration (Dec 5, 2025)

**Migration from Custom Chat Components:**

The project has migrated from custom-built chat UI components to the `assistant-ui` library for a more robust and feature-rich chat experience.

**Removed Components:**
- `ChatArea.tsx` - Custom chat display area
- `MessageBubble.tsx` - Individual message rendering
- `TimelineView.tsx` - Timeline/thread display
- `ChatProcessingOverlay.tsx` - Processing state overlay
- `DetailsPanel.tsx` - Message details sidebar
- `PracticeSuggestionBubble.tsx` - Practice prompts
- Associated test files for all above components

**New Architecture:**

- **UI Library**: `@assistant-ui/react` provides the core `Thread` component for chat interface
- **Message Components**: Custom message types implemented in `src/renderer/components/Chat/MessageComponents.tsx`
- **Better Thread**: Enhanced thread component in `src/renderer/components/Chat/BetterThread.tsx`
- **LangGraph Integration**: New IPC route `chat:stream-ai-sdk` streams LangGraph output via `MessagePort`
- **Transport Bridge**: Preload exposes `electronAPI.aiSDK.stream(params)` for renderer communication
- **Simplified State**: Chat store (`chatStore.ts`) slimmed to session/agent selectors only; Assistant UI owns all message state and rendering

**Benefits:**
- More polished and accessible chat UI out-of-the-box
- Better message streaming and real-time updates
- Simplified renderer code and state management
- Built-in support for message actions, loading states, and error handling
- Easier to maintain and extend with new chat features

**Key Files:**
- `src/renderer/components/Chat/BetterThread.tsx` - Main thread component
- `src/renderer/components/Chat/MessageComponents.tsx` - Custom message types
- `src/renderer/services/chat/chat-service.ts` - Updated chat service
- `src/renderer/services/api/electron-api-client.ts` - API client updates

## Important Notes

- Uses `sqlite-electron` (not `sqlite3`)
- Configuration via Electron store (not env variables)
- Multi-process debugging in VSCode
- Services use dependency injection for modularity
- All main process code should NEVER reference or access `window.electronAPI`
- `electronAPI` now exposes documented sessions/catalyst domains and filesystem/dialog helpers with
  matching IPC handlers.

