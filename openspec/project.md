# Project Context

## Purpose
Learning Catalyst is an AI-powered desktop application that transforms learning from passive reading into active discovery through AI-guided exploration. The application makes the study → assess → review loop feel like an engaging game with:

- **Discovery** 🗺️, not studying
- **Conversation** 💬, not lectures
- **Achievement** 🏆, not testing
- **Adventure** 🚀, not curriculum

The system provides conversational learning experiences, visual knowledge discovery maps, learning quest persistence, and progress celebration through a multi-agent orchestration system.

## Tech Stack

### Core Technologies
- **TypeScript** - Full coverage with strict mode
- **Electron** - Multi-process desktop application
- **React** - Frontend UI framework
- **Vite** - Build tool and dev server

### Database & Storage
- **SQLite** - Primary data storage (source of truth)
- **Qdrant** - Vector database for embeddings
- **Kysely** - Type-safe SQL query builder

### AI & Machine Learning
- **LangChain** - LLM orchestration framework
- **Multiple AI Providers**: OpenAI (GPT), ChatGLM (thinking visualization), DeepSeek, SiliconFlow
- **Local Models**: Ollama, Llama.cpp support

### State Management & UI
- **Zustand** - Global state management
- **Tailwind CSS** - Styling
- **Assistant UI** - Chat interface components
- **React Testing Library** - Component testing

### Infrastructure
- **ts-chan** - Buffered channels for IPC
- **Electron Store** - Configuration management
- **Winston** - Logging
- **SQLite-Electron** - Database driver

## Project Conventions

### Code Style

#### Naming Guidelines
- **Folders**: kebab-case (`user-management`, `knowledge-graph`)
- **Components**: PascalCase (`UserProfile.tsx`, `ChatInterface.tsx`)
- **Services**: camelCase (`chatService.ts`, `databaseManager.ts`)
- **Utilities**: camelCase (`dateUtils.ts`, `validationHelpers.ts`)

#### Anti-Patterns to Avoid
❌ `IUserInterface.ts` (prefixes)
❌ `UserServiceClass.ts` (suffixes)
❌ `utils.ts` (too generic)
❌ `component1.ts` (non-descriptive)

✅ `user-types.ts` (clear purpose)
✅ `UserService.ts` (clean naming)
✅ `dateUtils.ts` (specific functionality)
✅ `UserProfile.tsx` (descriptive)

#### File Extensions
- `.tsx` - React components/JSX
- `.ts` - TypeScript-only files

#### Code Standards
- TypeScript strict mode enabled
- 130-character line length limit
- ESLint with React/TypeScript plugins
- NO classes - functional pattern everywhere
- Organized imports with clear separation
- Limited `any` usage for type safety

### Architecture Patterns

#### Multi-Process Electron Architecture
- **Main Process** (Node.js): Provides electronAPI via IPC handlers
  - AI services, database, agent orchestration
  - NEVER accesses window.electronAPI

- **Renderer Process** (Browser): Consumes electronAPI
  - React UI, state management
  - Uses preload scripts for secure communication

- **IPC Flow**: Main → IPC Handler → Preload → window.electronAPI → Renderer

#### Functional Factory Pattern (Mandatory)
All code uses React-style functional factories - NO classes:

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
```

#### Service Layer Architecture
- **Core Services** (Infrastructure): Database, Config, Logger
- **Domain Services** (Business Logic): Chat, Learning, Knowledge, Analytics
- **AI Services**: Provider abstraction with multi-provider support
- **Agent Layer**: Specialized agents (Learning, Assessment, Tutoring, Practice)

#### Dependency Injection
- Services receive dependencies as function parameters
- Never access `window.electronAPI` from main process
- Agent tools call service functions only (not lower-level APIs)

### Testing Strategy

#### Multi-Environment Testing
- **Main Process**: AI services, database, agents (target: >90% coverage)
- **Renderer**: React components, hooks, UI (target: >90% coverage)
- **Integration**: IPC communication (target: >80% coverage)
- **Performance**: Memory leaks, resource management

#### Frameworks & Tools
- **Vitest** - Test runner
- **React Testing Library** - Component testing
- **jsdom** - DOM simulation
- **Custom Electron integration** - Cross-process testing

#### Testing Commands
```bash
npm run test:main        # Main process tests
npm run test:renderer    # Renderer tests
npm run test:integration # Cross-process tests
npm run test:performance # Memory & performance tests
npm run test:complete    # All test suites
npm run test:coverage    # Coverage reports

# Targeted iteration
npm run test:main:file -- <file>
npm run test:renderer:file -- <file>
```

### Git Workflow

#### Branching Strategy
- Feature branches from `main`
- Branch naming: `feature/feature-name` or `fix/issue-name`
- Merge via pull requests

#### Commit Conventions
- Clear, descriptive commit messages
- Focus on "why" rather than "what"
- Use conventional commit format when applicable

#### Recent Commits (from git status)
```
7536c54 fix: Add missing null check in concept parsing smoke test
703572c refactor: Simplify app initialization and error handling architecture
a7c300d chore: checkpoint
de6c297 chore: checkpoint
045f743 fix: Correct session title display by using row.title instead of metadata.topic
```

## Domain Context

### Multi-Agent System
Specialized agents for different learning aspects:
- **Learning Agent** - Learning Guide (explores concepts conversationally)
- **Assessment Agent** - Understanding Coach (pulls practice/discussion evidence, scores confidence)
- **Tutoring Agent** - Learning Mentor (personalized help and motivation)
- **Practice Agent** - Practice Master (gamified challenges)
- **Learning Planner** - Builds single-session plans
- **Session Blueprint** - Creates one-sitting plans with concept blocks

### Core Features
- **AI Chat** - Conversational learning adventures with multiple providers
- **Knowledge Graphs** - Visual knowledge discovery maps
- **Session Management** - Learning quest persistence
- **Analytics Dashboard** - Achievement & progress celebration
- **Settings Panel** - Learning experience personalization
- **Import/Export** - Learning material library

### User Experience Principles
- Study → assess → review loop feels like a game
- Technical complexity hidden from users
- Language emphasizes exploration over education
- Progress feels like achievement, not evaluation
- Interaction feels conversational, not mechanical

### Key Business Logic
- **Chat streaming** - Real-time response streaming with status frames
- **Knowledge ingestion** - Concept extraction with relationship mapping
- **Session checkpoints** - Persistent learning state
- **Error handling** - Comprehensive multi-layered error system
- **Configuration** - Provider-agnostic AI service configuration

## Important Constraints

### Technical Constraints
- **Functional Pattern Only** - NO classes allowed anywhere in codebase
- **Process Separation** - Main provides electronAPI, Renderer consumes it
- **TypeScript Strict Mode** - Full type safety required
- **130-char line limit** - Code formatting constraint
- **Memory Optimization** - Development: 512MB heap, 64MB semispace

### Architectural Constraints
- **IPC Communication Only** - No direct main-renderer access
- **Dependency Injection** - All services receive dependencies as parameters
- **Service Pattern** - Business logic in services, UI in components
- **No Window Access** - Main process never accesses window.electronAPI

### Testing Constraints
- **High Coverage Requirements** - >90% main, >90% renderer, >80% integration
- **Multi-Environment Testing** - Must test main, renderer, and integration
- **Performance Testing** - Memory leak detection required

### Development Constraints
- **Memory Monitoring** - Must monitor during development
- **Event Listener Cleanup** - Proper cleanup patterns required
- **Node.js Polyfill Impact** - Be mindful of memory impact

## External Dependencies

### AI Providers
- **OpenAI** - GPT models (primary provider)
- **ChatGLM** - Thinking process visualization
- **DeepSeek** - Alternative LLM provider
- **SiliconFlow** - API gateway service
- **Local Models** - Ollama, Llama.cpp for offline inference

### Development Tools
- **npm** - Package management
- **Electron** - Desktop app framework
- **Vite** - Build tool and dev server
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking

### External Services
- **SQLite** - Local database (bundled with electron-sqlite3)
- **Qdrant** - Vector database for embeddings
- **Electron Store** - Configuration persistence
- **Assistant UI** - Chat interface library

### Key Libraries
- **LangChain** - LLM orchestration
- **Kysely** - SQL query builder
- **Zustand** - State management
- **React** - UI framework
- **Tailwind CSS** - Styling
- **Winston** - Logging
- **ts-chan** - Channel communication
