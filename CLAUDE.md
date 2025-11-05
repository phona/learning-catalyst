# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
```bash
# Install development dependencies
npm install

# Run the development server
npm run dev

# Run development with custom workspace
npm run dev:workspace

# Build the application
npm run build

# Build for all platforms
npm run build:all
```

### Code Quality & Linting
```bash
# Run linting
npm run lint

# Type checking
npm run type-check
```

### Testing
```bash
# Run all tests (default configuration)
npm test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Multi-Environment Testing
# Run tests for specific processes
npm run test:main              # Main process tests
npm run test:renderer          # Renderer process tests
npm run test:integration       # Integration tests
npm run test:performance       # Performance tests

# With UI for specific environments
npm run test:main:ui
npm run test:renderer:ui
npm run test:integration:ui
npm run test:performance:ui

# Coverage for specific environments
npm run test:main:coverage
npm run test:renderer:coverage
npm run test:integration:coverage

# Complete test suite
npm run test:complete              # All test environments
npm run test:complete:coverage     # All environments with coverage
```

### Qdrant Vector Database Management
```bash
# Start Qdrant service
npm run qdrant:start

# Stop Qdrant service
npm run qdrant:stop

# Check Qdrant status
npm run qdrant:status

# Setup Qdrant initially
npm run setup:qdrant
```

### Electron Development
```bash
# Rebuild native dependencies
npm run rebuild
```

## Architecture Overview

Learning Catalyst follows a **multi-process Electron architecture** with clear separation between main and renderer processes:

### Core Architecture Layers
1. **Main Process (Node.js)** - AI services, database operations, system integration
2. **Renderer Process (Browser)** - React UI, state management, user interactions
3. **IPC Communication** - Secure inter-process communication via preload scripts
4. **AI Integration Layer** - Multi-provider AI abstraction with LangChain
5. **Data Storage Layer** - Local SQLite database with Qdrant vector storage

### Key Architectural Principles
- **Process Separation**: Clear boundary between main (Node.js) and renderer (browser) processes
- **Multi-Agent System**: Sophisticated agent lifecycle management and orchestration
- **Provider Abstraction**: Unified interface for multiple AI providers (OpenAI, ChatGLM, DeepSeek, SiliconFlow, local models)
- **Local-First Approach**: User data remains primarily on local machines with SQLite
- **Memory Optimization**: Development environment configured for memory efficiency

### Module Documentation Framework
Every module follows the **What-How-Relationship Framework**:
- **🎯 What It Is**: Clear module definition, purpose, and scope
- **⚙️ How It Works**: Internal architecture and operational logic
- **🔗 Relationships**: Dependencies and integration patterns

## Project Structure (Current State)

### Active Components
- **Source Code**: React-based desktop application in `src/` directory
- **Documentation**: Comprehensive docs in `docs/` directory with API references and technical architecture
- **Test Suite**: Modern test infrastructure with Vitest and React Testing Library
- **Configuration**: Electron + Vite + TypeScript setup with comprehensive tooling
- **Build System**: Vite for bundling with Electron builder for distribution

### Multi-Process Architecture
```
src/
├── main/               # Electron main process (Node.js environment)
│   ├── services/       # Main process services
│   │   ├── agents/     # Multi-agent system management
│   │   ├── catalyst/   # Core AI orchestration and concept parsing
│   │   ├── database/   # SQLite database operations and migrations
│   │   └── langchain/  # AI/ML processing and model factory
│   └── index.ts        # Main process entry point
├── renderer/           # React frontend (Browser environment)
│   ├── components/     # UI components by feature
│   │   ├── Analytics/  # Learning analytics and progress tracking
│   │   ├── Chat/       # AI chat interface
│   │   ├── Config/     # Settings and configuration
│   │   ├── Dashboard/  # Learning dashboard
│   │   ├── Discovery/  # Content discovery and exploration
│   │   ├── Knowledge/  # Knowledge graph visualization
│   │   ├── Layout/     # Application layout and navigation
│   │   └── UI/         # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Frontend services and API clients
│   ├── stores/         # Zustand state management
│   └── App.tsx         # React application root
└── shared/             # Shared between processes
    ├── constants/      # Shared constants and enums
    ├── types/          # TypeScript type definitions
    └── utils/          # Shared utility functions
```

### Electron Architecture
```
electron/
├── main/
│   ├── index.ts        # Main Electron process
│   ├── ipc-handlers.ts # IPC communication handlers
│   └── qdrant-manager.ts # Qdrant service management
└── preload/
    └── index.ts        # Preload script for secure renderer communication
```

### Documentation Structure
```
docs/
├── commands/           # Complete CLI command reference
├── examples/           # Usage examples and integration guides
├── installation/       # Setup and quick start guides
└── technical/          # Architecture and API documentation
    ├── api-reference/  # Complete API specifications
    ├── system-architecture/  # 5-layer architecture docs
    └── testing/        # Testing procedures
```

## Desktop Application Interface

### Modern Desktop Features
- **React-Based UI**: Modern, responsive interface with Tailwind CSS
- **Real-Time Updates**: Live streaming responses with visual feedback
- **Component Architecture**: Reusable React components with TypeScript
- **State Management**: Zustand for efficient reactive state management
- **Electron Integration**: Native desktop features and file system access
- **Error Handling**: User-friendly error messages with actionable suggestions
- **Hot Reload**: Fast development with Vite's hot module replacement
- **Cross-Platform**: Windows, macOS, and Linux support

### Core Application Features
- **AI Chat Interface**: Natural language conversations with multiple AI providers
- **Knowledge Management**: Interactive knowledge graphs and learning paths
- **Session Management**: Save and restore learning sessions
- **Analytics Dashboard**: Learning progress and token usage statistics
- **Settings Panel**: Configure AI providers and application preferences
- **File Management**: Import/export learning data and configurations

### User Experience Design
- **Intuitive Navigation**: Clean, modern interface with logical flow
- **Progress Indicators**: Visual feedback for AI responses and processing
- **Responsive Design**: Adapts to different window sizes and screen resolutions
- **Accessibility**: WCAG compliant interface with keyboard navigation
- **Performance**: Optimized rendering and efficient state updates

## AI Provider Integration

### Supported Providers
- OpenAI (GPT models)
- ChatGLM (Zhipu AI) with thinking process support
- DeepSeek
- SiliconFlow
- Local models (Ollama, Llama.cpp)

### Advanced Provider Features
- **ChatGLM Thinking Integration**: Real-time reasoning process visualization
- **Custom Model ID Support**: Experimental and custom model usage
- **Provider Switching**: Seamless switching without session interruption
- **Streaming Support**: Real-time response streaming across providers
- **Model Discovery**: Automatic model availability detection with timeout fallback

### Provider Architecture
- **Abstraction Layer**: Unified `ModelAbstractionLayer` interface
- **Factory Pattern**: `ModelFactory` for provider instantiation
- **Configuration Management**: Interactive provider setup and switching
- **Authentication**: Secure API key storage and management
- **Error Handling**: Comprehensive retry logic and graceful failures
- **Timeout Management**: Configurable timeouts for model discovery and requests

## Development Guidelines

### Code Style
- **Line Length**: 130 characters
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Formatting**: Prettier with consistent configuration
- **Linting**: ESLint with React and TypeScript plugins
- **Component Structure**: Functional components with hooks
- **Import Organization**: Organized imports with consistent ordering
- **Code Quality**: Comprehensive linting and type checking pipeline

### Component Development
When creating new components:
1. Use functional components with TypeScript interfaces
2. Implement proper prop types and default values
3. Follow React best practices (hooks, memo, useCallback)
4. Create reusable, composable components
5. Document component props and usage examples

### State Management
- **Zustand**: Use for global application state
- **Local State**: React useState for component-specific state
- **Async State**: TanStack Query for server state management
- **Forms**: React Hook Form for form state management
- **Persistence**: Electron store for app configuration

### Configuration Management
- TypeScript configuration for type safety
- Environment variables for sensitive data
- Electron store for persistent settings
- JSON schema validation for configuration files
- Secure storage of API keys and sensitive data

## Testing Environment

### Test Configuration
- **Framework**: Vitest with React support
- **Coverage**: Built-in Vitest coverage reporting
- **Test Environment**: jsdom for React component testing
- **Test Libraries**: React Testing Library, user-event for interaction testing
- **Type Checking**: TypeScript integration for type-safe tests
- **TDD Methodology**: Red-green-refactor cycle support

### Test Structure
```
src/
├── __tests__/           # Test files co-located with components
│   ├── components/      # Component tests
│   ├── hooks/          # Hook tests
│   ├── services/       # Service tests
│   └── utils/          # Utility function tests
├── test/               # Additional test utilities and setup
│   ├── setup.ts        # Test configuration
│   └── mocks/          # Mock implementations
└── test-utils/         # Custom test utilities
```

### Test Running Examples
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test

# Run tests with UI
yarn test:ui

# Run tests once (CI mode)
yarn test:run

# Run tests with coverage
yarn test:coverage

# Run specific test file
npm test src/renderer/components/Chat/__tests__/MessageBubble.test.tsx
```

## Key Files to Understand

### Core Implementation
- **`src/renderer/App.tsx`**: React application root with routing and layout
- **`src/renderer/main.tsx`**: React application entry point with rendering
- **`src/main/index.ts`**: Main Electron process entry point
- **`electron/main/index.ts`**: Electron main process configuration
- **`package.json`**: Complete project configuration with dependencies and scripts
- **`vite.config.ts`**: Vite configuration with memory optimization and Electron integration

### Configuration and Development
- **`tsconfig.json`**: TypeScript compiler configuration with strict mode
- **`vitest*.config.ts`**: Multiple test configurations for different environments
- **`eslint.config.js`**: ESLint configuration for React and TypeScript
- **`vite.config.ts`**: Vite development server with memory optimization settings

### Key Business Logic
- **`src/main/services/database/`**: SQLite database management, migrations, and services
- **`src/main/services/langchain/`**: AI provider abstraction with ModelFactory
- **`src/main/services/agents/`**: Multi-agent system management and orchestration
- **`src/main/services/catalyst/`**: Core AI orchestration and concept parsing
- **`src/renderer/stores/`**: Zustand state management for frontend
- **`src/renderer/hooks/`**: Custom React hooks for state and services

### Multi-Process Communication
- **`electron/main/index.ts`**: Electron main process entry point
- **`electron/preload/index.ts`**: Secure preload script for IPC communication
- **Shared types in `src/shared/types/`**: TypeScript interfaces for IPC contracts

## Working with This Codebase

### Development Workflow
1. **Start the Development Server**: Use `npm run dev` to start the Vite development server with hot reload
2. **Understand Process Separation**: Main process handles AI/database, renderer handles UI
3. **Run Tests Regularly**: Comprehensive test suite with multiple environments (main, renderer, integration)
4. **Use TypeScript Strictly**: All code must pass strict TypeScript compilation before committing
5. **Memory Management**: Development environment is optimized for memory efficiency

### Multi-Process Development Best Practices
1. **Process Boundaries**: Main process (Node.js) handles AI services and database; renderer process (browser) handles UI
2. **Component Structure**: Components are organized by feature in `src/renderer/components/`
3. **State Management**: Use Zustand stores for global state, React hooks for local component state
4. **IPC Communication**: Use secure IPC channels via preload scripts for process communication
5. **TypeScript Integration**: All components must have proper TypeScript interfaces for props
6. **Memory Awareness**: Development environment has memory optimization settings configured
7. **Error Boundaries**: Use the ErrorBoundary component for graceful error handling
8. **Performance**: Implement React.memo, useCallback, and useMemo where appropriate

### AI Provider Integration
- **Factory Pattern**: Use `src/main/services/langchain/ModelFactory.ts` for AI provider instances
- **Provider Abstraction**: All AI providers implement the same interface for consistency
- **Configuration**: AI provider settings are managed through the configuration service
- **Multi-Agent Support**: Advanced agent lifecycle management and orchestration
- **LangChain Integration**: Built on LangChain ecosystem for advanced AI capabilities

### Database and Vector Storage
- **Local Database**: SQLite-electron for local data persistence via main process services
- **Vector Database**: Qdrant for semantic search and knowledge graph operations
- **Service Management**: Use npm scripts to manage Qdrant service lifecycle
- **Schema Management**: Database migrations in `src/main/services/database/migrations/`
- **Important**: Uses `sqlite-electron` instead of `sqlite3` for proper Electron integration

### Testing Strategy
- **Multi-Environment Tests**: Separate configurations for main, renderer, integration, and performance
- **Main Process Tests**: Test AI services, database operations, and agent management
- **Renderer Tests**: Test React components, hooks, and UI interactions
- **Integration Tests**: Test cross-process communication and end-to-end workflows
- **Performance Tests**: Memory management and resource leak detection

### Memory Optimization and Performance
- **Development Configuration**: Memory limits and optimization settings in vite.config.ts
- **Chunk Splitting**: Manual code splitting to reduce memory usage during development
- **File Watching**: Optimized file watcher configuration to reduce memory overhead
- **Cleanup Utilities**: Memory debugging and cleanup utilities for development
- **Build Optimization**: Production builds with proper chunking and tree shaking

### Professional Development Environment
- **Hot Reload**: Vite provides fast hot module replacement with memory optimization
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Configured for React and TypeScript best practices
- **Multi-Process Debugging**: VSCode debugging for both main and renderer processes
- **Memory Monitoring**: Built-in memory usage tracking and alerting during development

## Common Development Patterns

### Adding New AI Providers
1. Create provider implementation in main process services
2. Implement the standard AI provider interface with LangChain compatibility
3. Add provider configuration options to shared types
4. Update the ModelFactory in `src/main/services/langchain/ModelFactory.ts`
5. Add provider-specific tests in main process test suite

### Creating New Components
1. Organize components by feature in appropriate `src/renderer/components/[Feature]/` directory
2. Create TypeScript interfaces for all props
3. Use established patterns for state management (Zustand for global, hooks for local)
4. Include comprehensive tests in renderer test suite
5. Follow naming conventions: PascalCase for components, camelCase for hooks

### Database Schema Changes
1. Create migration script in `src/main/services/database/migrations/`
2. Update Kysely schema definitions
3. Update shared TypeScript types
4. Add tests for new database operations in main process tests
5. Update service layer to handle new schema

### IPC Communication Patterns
- Main process services expose APIs via IPC handlers
- Renderer communication through preload script with secure APIs
- Use TypeScript interfaces to define IPC channel contracts
- Implement proper error handling and timeout management
- Test communication patterns in integration test suite

### Memory Management Best Practices
- Monitor memory usage during development with built-in alerts
- Use the memory optimization settings configured in vite.config.ts
- Test with performance test suite to detect memory leaks
- Use appropriate cleanup patterns in event handlers and subscriptions
- Be mindful of Node.js polyfills and their memory impact

## Development Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- npm package manager
- Git for version control

### Initial Setup
```bash
# Clone repository
git clone [repository-url]
cd learning_catalyst

# Install dependencies
npm install

# Setup Qdrant vector database
npm run setup:qdrant

# Start development server
npm run dev
```

### Environment Variables
The application uses Electron store for configuration rather than environment variables for sensitive data. API keys and configuration are managed through the settings panel.

### Debugging Configuration
- Use VSCode with the official React and TypeScript extensions
- Configure breakpoints in both main and renderer processes
- Use Electron DevTools for renderer process debugging
- Check console output for main process debugging

## Memory-Optimized Development

### Development Environment Configuration
The development environment is configured for memory efficiency:
- **Node.js Memory Limits**: 512MB heap, 64MB semispace
- **Vite Optimization**: Manual chunk splitting and dependency pre-bundling
- **File Watching**: Excludes large directories to reduce overhead
- **Memory Monitoring**: Built-in alerts for memory usage

### Best Practices
- Monitor memory usage during development
- Use memory profiling tools when needed
- Test with performance suite regularly
- Follow cleanup patterns for event listeners and subscriptions
- Be aware of Node.js polyfill memory impact