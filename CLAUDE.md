# CLAUDE.md

Learning Catalyst - AI-powered desktop application for personalized learning with multi-agent orchestration. Built with TypeScript, Electron, React, and LangChain integration.

## 🎯 Product Vision Index

**Core Mission**: Transform learning from passive reading into active discovery through AI-guided exploration.

**User Experience Goal**: Make the study → assess → review loop feel like an engaging game, not studying.

**Key Documents**:
- 📋 [Product Blueprint](./docs/product-blueprint.md) - User-focused vision and experience design
- 🏗️ This document - Technical implementation and development guidelines

**Development Alignment**: Every feature must serve the core user experience of making learning feel like:
- **Discovery**, not studying
- **Conversation**, not lectures
- **Achievement**, not testing
- **Adventure**, not curriculum

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
- **Main Process** (Node.js): AI services, database, agent orchestration, **provides electronAPI**
- **Renderer Process** (Browser): React UI, state management, user interactions, **consumes electronAPI**
- **IPC Layer**: Secure communication via preload scripts that expose electronAPI to renderer
- **Storage**: SQLite + Qdrant vector database
- **AI**: Multi-provider abstraction (OpenAI, ChatGLM, DeepSeek, local models)

**Multi-Agent System:**
- Lifecycle management with state tracking
- Agent registry and configuration
- Tool-calling, handoff, and hybrid orchestration
- Specialized agents: learning, assessment, tutoring, practice

**Key Principles:**
- Process separation with secure IPC
- Main process **provides** electronAPI through IPC handlers and preload scripts **(NEVER consumes electronAPI)**
- Renderer process **consumes** electronAPI via window.electronAPI interface
- Agent-first design with sophisticated orchestration
- Provider abstraction for multiple AI services
- Local-first data storage
- Memory-optimized development environment
- Full TypeScript coverage with strict mode
- Use correct file extensions: `.tsx` for React components/JSX, `.ts` for TypeScript-only files
- IPC contracts defined in `@/shared/types/electron-api/` ensure type safety across processes
- Main process internal communication through dependency injection (NEVER window.electronAPI)
- Main process should NEVER invoke or access electronAPI - it only provides it
- Dependency injection for loose coupling and testability
- Direct and purposeful code modifications without unnecessary prefixes

## Project Structure

```
src/
├── main/                 # Electron main process (Node.js) - PROVIDES electronAPI
│   ├── services/
│   │   ├── agents/       # Multi-agent system
│   │   ├── catalyst/     # AI orchestration
│   │   ├── database/     # SQLite + Qdrant
│   │   └── langchain/    # AI provider abstraction
│   ├── handlers/         # IPC handlers that expose electronAPI
│   └── preload/          # Preload scripts that secure electronAPI exposure
├── renderer/             # React frontend (Browser) - CONSUMES electronAPI
│   ├── components/       # UI components by feature
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Frontend services using window.electronAPI
│   ├── stores/           # Zustand state management
│   └── App.tsx           # React app root
└── shared/               # Shared between processes
    ├── types/            # TypeScript interfaces for electronAPI contracts
    ├── utils/            # Shared utilities
    └── interfaces/       # Shared interfaces
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
- **Main Process**: System operations, database, AI providers, **exposes electronAPI via IPC handlers (NEVER consumes electronAPI)**
- **Renderer Process**: UI components, state management, user interactions, **consumes electronAPI via window.electronAPI**
- **Shared modules**: Pure business logic reusable across processes
- **IPC Communication**: One-way flow - Main process provides, renderer process consumes
- Use TypeScript interfaces for all props and IPC contracts
- Follow React best practices (hooks, memo, useCallback)
- IPC contracts defined in `@/shared/types/electron-api/` ensure type-safe communication
- Main process internal services use dependency injection (NEVER window.electronAPI)
- **CRITICAL**: Main process should NEVER attempt to access or invoke electronAPI - it only provides it to renderer
- Use dependency injection containers for service management and testing

## Key Features

**Modern Desktop App:**
- React UI with Tailwind CSS and TypeScript
- Real-time streaming responses with visual feedback
- Zustand state management with hot reload
- Cross-platform support (Windows, macOS, Linux)
- User-friendly error handling and recovery

**Core Capabilities:**
- AI chat with multiple providers (OpenAI, ChatGLM, DeepSeek, local models) → **Conversational Learning Adventures**
- Interactive knowledge graphs and learning paths → **Visual Knowledge Discovery Maps**
- Session management with save/restore functionality → **Learning Quest Persistence**
- Analytics dashboard for progress tracking → **Achievement & Progress Celebration**
- Settings panel for provider configuration → **Learning Experience Personalization**
- Import/export for learning data → **Learning Material Library Management**

**Feature Development Guideline**: Every technical capability must be expressed through user-facing language that emphasizes discovery, achievement, and adventure over traditional education terminology.

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
- **Learning**: Personalized learning paths and concept explanation → **Learning Guide**: Explores concepts conversationally
- **Assessment**: Knowledge evaluation and gap identification → **Understanding Coach**: Checks mastery naturally
- **Tutoring**: Interactive guidance and real-time feedback → **Learning Mentor**: Personalized help and motivation
- **Practice**: Skill development through adaptive exercises → **Practice Master**: Gamified challenges and puzzles

**User Experience Alignment**: Each agent serves the study → assess → review loop while making learning feel like an adventure.

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
- Import clauses should be placed at the top of files whenever possible
- When adding a new file, check for duplicates or similar functionality to avoid redundancy
- Don't add prefixes or postfixes to distinguish class or function usage - organize by layer instead
- Use appropriate file extensions: `.tsx` for files containing JSX/React components, `.ts` for TypeScript-only files

## File and Folder Naming Guidelines

### General Principles
- **kebab-case for folders**: `user-management`, `agent-orchestration`, `knowledge-graph`
- **PascalCase for React components**: `UserProfile.tsx`, `LearningDashboard.tsx`
- **camelCase for utilities/services**: `databaseManager.ts`, `chatService.ts`
- **Descriptive but concise**: Names should clearly indicate purpose without being overly long

### Folder Structure Best Practices
```
src/
├── main/
│   ├── services/
│   │   ├── agents/              # Agent-related services
│   │   │   ├── agent-lifecycle-manager.ts
│   │   │   ├── agent-registry.ts
│   │   │   └── orchestration/
│   │   ├── catalyst/            # AI orchestration services
│   │   ├── database/            # Database services
│   │   └── langchain/           # AI provider abstraction
│   ├── handlers/                # IPC handlers
│   └── integration/             # Integration tests
├── renderer/
│   ├── components/
│   │   ├── Chat/               # Feature-based organization
│   │   ├── Dashboard/
│   │   ├── Knowledge/
│   │   └── Analytics/
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Frontend services
│   └── stores/                 # State management
└── shared/
    ├── types/                  # TypeScript interfaces
    ├── utils/                  # Shared utilities
    └── interfaces/             # Shared interfaces
```

### File Naming Patterns

#### Components (`.tsx`)
- **PascalCase**: `UserProfile.tsx`, `ChatInterface.tsx`
- **Feature-specific**: `KnowledgeGraphVisualization.tsx`
- **Avoid prefixes**: No `Component`, `View`, `Page` suffixes unless necessary

#### Services (`.ts`)
- **camelCase**: `chatService.ts`, `databaseManager.ts`
- **Descriptive**: `conceptParsingService.ts`
- **Layer-appropriate**: Place in appropriate service folder

#### Utilities (`.ts`)
- **camelCase**: `typeUtils.ts`, `performanceMonitor.ts`
- **Functional naming**: `dateHelpers.ts`, `validationUtils.ts`

#### Types (`.ts`)
- **camelCase**: `electron-api.ts`, `ai-types.ts`
- **Domain-specific**: `knowledge-graph-types.ts`

### Naming Anti-Patterns to Avoid

❌ **Bad naming:**
- `IUserInterface.ts` (prefixes)
- `UserServiceClass.ts` (suffixes)
- `utils.ts` (too generic)
- `component1.ts`, `component2.ts` (non-descriptive)
- `NewFolder/`, `TempFiles/` (temporary names)

✅ **Good naming:**
- `user-types.ts` (clear purpose)
- `UserService.ts` (clean naming)
- `dateUtils.ts`, `validationHelpers.ts` (specific functionality)
- `UserProfile.tsx`, `ChatInterface.tsx` (descriptive components)
- `agent-management/`, `knowledge-graph/` (feature-based folders)

### Layer-Based Organization

Organize by architectural layers rather than naming conventions:
1. **Presentation Layer**: Components, hooks, UI state
2. **Service Layer**: Business logic, data transformation
3. **Data Layer**: Database operations, external APIs
4. **Shared Layer**: Types, utilities, constants

### Consistency Rules
- Stick to established patterns within the project
- Use singular for types: `UserType` not `UsersTypes`
- Use plural for collections: `users/` folder not `user/`
- Match import paths: `@/main/services/agents/agent-lifecycle-manager`
- Keep names searchable: Avoid abbreviations unless widely understood

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
- Dependency injection with inversion of control containers

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
2. Understand process separation: Main (provides electronAPI) ↔ Renderer (consumes electronAPI)
3. **CRITICAL**: Never use window.electronAPI in main process code
4. Run tests regularly across all environments
5. Use TypeScript strictly - all code must compile before committing
6. Monitor memory usage in development environment

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
- **Main Process** exposes APIs via IPC handlers that become part of electronAPI **(NEVER consumes electronAPI)**
- **Renderer Process** consumes these APIs through window.electronAPI (exposed via preload script)
- Use TypeScript interfaces for contracts
- All IPC contracts must be defined in `@/shared/types/electron-api/`
- Test in integration suite
- Main process internal services use dependency injection (NEVER window.electronAPI)
- **IMPORTANT**: Main process code should NEVER reference, import, or access window.electronAPI

**electronAPI Flow (One-Way):**
```
Main Process (Provider ONLY) → IPC Handler → Preload Script → window.electronAPI → Renderer Process (Consumer ONLY)
```

**Example Usage:**
```typescript
// ❌ WRONG - Main Process should NEVER do this:
// const response = await window.electronAPI.someAPI(); // NEVER IN MAIN PROCESS!

// ✅ CORRECT - Main Process (Provider ONLY) - src/main/handlers/
ipcMain.handle('chat:sendMessage', async (event, message) => {
  return await catalystService.sendMessage(message);
});

// ✅ CORRECT - Renderer Process (Consumer ONLY) - src/renderer/services/
const response = await window.electronAPI.chat.sendMessage(message);
```

**Critical Rules:**
- ✅ Main Process: Provides electronAPI via IPC handlers
- ❌ Main Process: NEVER accesses or invokes electronAPI
- ✅ Renderer Process: Consumes electronAPI via window.electronAPI
- ✅ All Communication: Must flow through IPC contracts in `@/shared/types/electron-api/`

## 🎯 Development Alignment Checklist

**Before implementing any feature, ask:**
- Does this make learning feel like discovery? 🗺️
- Does this create conversational interaction? 💬
- Does this provide achievement and progress? 🏆
- Does this feel like an adventure, not studying? 🚀

**User Experience Validation:**
- [ ] Feature supports study → assess → review loop naturally
- [ ] Technical complexity is hidden from users
- [ ] Language emphasizes exploration over education
- [ ] Progress feels like achievement, not evaluation
- [ ] Interaction feels conversational, not mechanical

**Implementation Priority:**
1. User experience > Technical sophistication
2. Conversational flow > Feature completeness
3. Achievement motivation > Data accuracy
4. Adventure framing > Traditional education patterns

**Refer to [Product Blueprint](./docs/product-blueprint.md) for detailed user experience guidelines.**

**Important Notes:**
- Uses `sqlite-electron` (not `sqlite3`) for Electron compatibility
- Configuration via Electron store (not environment variables)
- Memory-optimized development environment
- Multi-process debugging support in VSCode
- Service location via dependency injection for modularity