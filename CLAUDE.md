# CLAUDE.md

Learning Catalyst - AI-powered desktop application for personalized learning with multi-agent orchestration. Built with TypeScript, Electron, React, and LangChain integration.

## Quick Start

```bash
npm install           # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

## Testing

```bash
npm run test:main      # Main process (Node.js) tests
npm run test:renderer  # Renderer (React) tests
npm run test:integration  # Cross-process tests
npm run test:performance   # Memory & performance tests
npm run test:complete   # All test suites
npm run test:coverage  # Generate coverage reports
```

## Architecture

**Multi-Process Electron App:**
- **Main Process** (Node.js): AI services, database, agent orchestration
- **Renderer Process** (Browser): React UI, state management, user interactions
- **IPC Layer**: Secure communication via preload scripts
- **Storage**: SQLite + Qdrant vector database
- **AI**: Multi-provider abstraction (OpenAI, ChatGLM, DeepSeek, local models)

**Multi-Agent System:**
- Lifecycle management with state tracking
- Agent registry and configuration
- Tool-calling, handoff, and hybrid orchestration
- Specialized agents: learning, assessment, tutoring, practice

**Key Principles:**
- Process separation with secure IPC
- Agent-first design with sophisticated orchestration
- Provider abstraction for multiple AI services
- Local-first data storage
- Memory-optimized development environment
- Full TypeScript coverage with strict mode

## Project Structure

```
src/
├── main/                 # Electron main process (Node.js)
│   ├── services/
│   │   ├── agents/       # Multi-agent system
│   │   ├── catalyst/     # AI orchestration
│   │   ├── database/     # SQLite + Qdrant
│   │   └── langchain/    # AI provider abstraction
│   └── handlers/         # IPC handlers
├── renderer/             # React frontend (Browser)
│   ├── components/       # UI components by feature
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Frontend services
│   ├── stores/           # Zustand state management
│   └── App.tsx           # React app root
└── shared/               # Shared between processes
    ├── modules/          # Shared business logic
    ├── types/            # TypeScript interfaces
    └── utils/            # Shared utilities
```

## Development Guidelines

**Architecture Status:** ✅ Migration completed from `src/modules` to proper service-oriented architecture

**Import Patterns:**
```typescript
// Main process services
import { AgentLifecycleManager } from '@/main/services/agents/agent-lifecycle-manager';
import { CatalystService } from '@/main/services/catalyst/catalyst-service';
import { DatabaseFactory } from '@/main/services/database/kysely-database';

// Shared
import {hdonModelType } from '@/shared/types/ai';
```

**Key Principles:**
- Main process: System operations, database, AI providers
- Shared modules: Pure business logic reusable across processes
- Renderer: UI components, state management, user interactions
- Use TypeScript interfaces for all props and IPC contracts
- Follow React best practices (hooks, memo, useCallback)

## Key Features

**Modern Desktop App:**
- React UI with Tailwind CSS and TypeScript
- Real-time streaming responses with visual feedback
- Zustand state management with hot reload
- Cross-platform support (Windows, macOS, Linux)
- User-friendly error handling and recovery

**Core Capabilities:**
- AI chat with multiple providers (OpenAI, ChatGLM, DeepSeek, local models)
- Interactive knowledge graphs and learning paths
- Session management with save/restore functionality
- Analytics dashboard for progress tracking
- Settings panel for provider configuration
- Import/export for learning data

## AI Integration

**Supported Providers:**
- OpenAI (GPT models)
- ChatGLM (Zhipu AI) with thinking process visualization
- DeepSeek, SiliconFlow
- Local models (Ollama, Llama.cpp)

**Advanced Features:**
- Real-time reasoning process visualization (ChatGLM)
- Seamless provider switching without session interruption
- Automatic model discovery with timeout fallback
- Custom model ID support for experimental models
- Real-time streaming across all providers

**Architecture:**
- Unified `ModelAbstractionLayer` interface
- `ModelFactory` for provider instantiation
- Secure API key storage via Electron store
- Comprehensive retry logic and error handling
- Configurable timeouts for all operations

## Multi-Agent System

**Core Components:**
- **AgentLifecycleManager**: Complete agent lifecycle with state tracking
- **AgentRegistry**: Centralized registration and discovery
- **AgentStatePersistence**: SQLite-backed state persistence

**Lifecycle States:** `inactive` → `active` → `error` → `deleted`

**Orchestration Strategies:**
- **Tool-Calling**: External tool and API execution
- **Handoff**: Agent-to-agent collaboration
- **Hybrid**: Adaptive strategy selection

**Specialized Agents:**
- **Learning**: Personalized learning paths and concept explanation
- **Assessment**: Knowledge evaluation and gap identification
- **Tutoring**: Interactive guidance and real-time feedback
- **Practice**: Skill development through adaptive exercises

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

## Development Best Practices

**Code Standards:**
- TypeScript strict mode with comprehensive type checking
- 130-character line length with Prettier formatting
- ESLint with React/TypeScript plugins
- Functional components with hooks pattern
- Organized imports with consistent ordering

**Component Development:**
- TypeScript interfaces for all props
- React best practices (hooks, memo, useCallback)
- Reusable, composable components
- Proper error boundaries and loading states

**State Management:**
- Zustand for global application state
- React useState for component-local state
- TanStack Query for server state
- React Hook Form for forms
- Electron store for persistent configuration

**Configuration:**
- TypeScript for type safety
- Electron store for settings (not env variables)
- JSON schema validation
- Secure API key storage

## Testing Strategy

**Multi-Environment Testing:**
- **Main Process** (Node.js): AI services, database, agent lifecycle
- **Renderer Process** (Browser): React components, hooks, UI interactions
- **Integration**: Cross-process IPC communication
- **Performance**: Memory leaks and resource management

**Test Frameworks:**
- Vitest + React Testing Library
- jsdom for DOM simulation
- Custom Electron integration setup
- Performance monitoring tools

**Coverage Targets:**
- Main Process: >90% business logic coverage
- Renderer: >85% UI component coverage
- Integration: >80% workflow coverage
- Overall: >85% combined coverage

**Quality Gates:**
- All tests must pass strict TypeScript compilation
- ESLint compliance for all test files
- Performance thresholds and memory leak detection

## Key Files

**Core Implementation:**
- `src/main/index.ts` - Electron main process entry
- `src/renderer/App.tsx` - React app root with routing
- `package.json` - Project configuration and scripts
- `vite.config.ts` - Vite + Electron setup with memory optimization

**Business Logic:**
- `src/main/services/agents/` - Multi-agent system management
- `src/main/services/catalyst/` - AI orchestration and concept parsing
- `src/main/services/langchain/` - AI provider abstraction
- `src/main/services/database/` - SQLite database operations

**Testing:**
- `vitest*.config.ts` - Multiple test environment configurations
- `src/test/` - Global test utilities and setup
- Component tests co-located with source code

## Memory & Performance

**Development Optimization:**
- Node.js memory limits: 512MB heap, 64MB semispace
- Manual code splitting to reduce memory usage
- Optimized file watching (excludes large directories)
- Built-in memory monitoring and alerts

**Best Practices:**
- Monitor memory usage during development
- Use performance test suite regularly
- Follow cleanup patterns for event listeners
- Be mindful of Node.js polyfill memory impact

## Working with the Codebase

**Development Workflow:**
1. `npm run dev` - Start development server with hot reload
2. Understand process separation: Main (AI/database) ↔ Renderer (UI)
3. Run tests regularly across all environments
4. Use TypeScript strictly - all code must compile before committing
5. Monitor memory usage in development environment

**Key Patterns:**

**Adding AI Providers:**
- Implement in `src/main/services/langchain/`
- Update `ModelFactory.ts` and shared types
- Add main process tests

**Creating Components:**
- Organize by feature in `src/renderer/components/`
- Use TypeScript interfaces for props
- Follow React best practices (hooks, memo, useCallback)
- Include renderer tests

**Database Changes:**
- Create migrations in `src/main/services/database/migrations/`
- Update Kysely schema and shared types
- Add database tests

**IPC Communication:**
- Main process exposes APIs via IPC handlers
- Renderer communicates through preload script
- Use TypeScript interfaces for contracts
- Test in integration suite

**Important Notes:**
- Uses `sqlite-electron` (not `sqlite3`) for Electron compatibility
- Configuration via Electron store (not environment variables)
- Memory-optimized development environment
- Multi-process debugging support in VSCode