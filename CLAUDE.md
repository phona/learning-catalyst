# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
```bash
# Install development dependencies
yarn install

# Run the development server
yarn dev

# Run development with custom workspace
yarn dev:workspace

# Build the application
yarn build

# Build for all platforms
yarn build:all
```

### Code Quality & Linting
```bash
# Run linting
yarn lint

# Type checking
yarn type-check
```

### Testing
```bash
# Run all tests
yarn test

# Run tests with UI
yarn test:ui

# Run tests once (CI mode)
yarn test:run

# Run tests with coverage
yarn test:coverage
```

### Qdrant Vector Database Management
```bash
# Start Qdrant service
yarn qdrant:start

# Stop Qdrant service
yarn qdrant:stop

# Check Qdrant status
yarn qdrant:status

# Setup Qdrant initially
yarn setup:qdrant
```

### Electron Development
```bash
# Rebuild native dependencies
yarn rebuild
```

## Architecture Overview

Learning Catalyst follows a **modern React-based desktop architecture** with clear separation of concerns:

### Core Architecture Layers
1. **Presentation Layer** - React components with TypeScript and Tailwind CSS
2. **State Management Layer** - Zustand for reactive state management
3. **Service Layer** - API integration and business logic
4. **AI Integration Layer** - Multi-provider AI abstraction and tool orchestration
5. **Data Storage Layer** - Local-first storage with Electron and Prisma

### Key Architectural Principles
- **Component-First Design**: Each UI element is a reusable React component
- **Provider Abstraction**: Unified interface for multiple AI providers (OpenAI, ChatGLM, DeepSeek, SiliconFlow, local models)
- **Local-First Approach**: User data remains primarily on local machines
- **Desktop-First Design**: Electron-based desktop application with web technologies

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

### Source Architecture
```
src/
├── components/          # Reusable React components
│   ├── Chat/           # Chat interface components
│   ├── Dashboard/      # Learning dashboard components
│   ├── Knowledge/      # Knowledge graph and search components
│   ├── Analytics/      # Progress tracking and analytics
│   ├── Config/         # Settings and configuration panels
│   ├── Discovery/      # Content discovery components
│   ├── Layout/         # App layout and navigation
│   ├── Session/        # Session management components
│   └── UI/             # Base UI components (ErrorBoundary, LoadingScreen, etc.)
├── pages/              # Page-level components (DiscoveryPage)
├── hooks/              # Custom React hooks (useQdrant, useAppServices)
├── services/           # API integration and business logic
│   ├── ai/            # AI provider services and implementations
│   ├── knowledge/     # Knowledge management services
│   ├── qdrant/        # Vector database integration
│   └── configService.ts # Configuration management
├── stores/             # Zustand state management (useChatStore, useAppStore, useConfigStore)
├── types/              # TypeScript type definitions
│   ├── api.ts         # API interface types
│   ├── learning.ts    # Learning-specific types
│   ├── session.ts     # Session management types
│   ├── ai.ts          # AI provider types
│   ├── config.ts      # Configuration types
│   ├── content.ts     # Content types
│   ├── knowledge.ts   # Knowledge graph types
│   └── ui.ts          # UI component types
├── modules/            # Core business logic modules
│   ├── database/      # Local database management
│   ├── knowledge-graph/ # Knowledge graph implementation
│   ├── analytics/     # Analytics and progress tracking
│   └── vector-database/ # Vector database abstraction
├── shared/             # Shared utilities and types
├── test/               # Test setup and utilities
├── App.tsx             # Main application component
└── main.tsx           # Application entry point
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
yarn test src/test/components/Chat/MessageBubble.test.tsx
```

## Key Files to Understand

### Core Implementation
- **`src/main.tsx`**: Application entry point with React rendering
- **`src/App.tsx`**: Main application component with routing and layout
- **`electron/main/index.ts`**: Electron main process configuration
- **`package.json`**: Complete project configuration with dependencies and scripts
- **`vite.config.ts`**: Vite bundler configuration for development and build

### Configuration and Development
- **`tsconfig.json`**: TypeScript compiler configuration with strict mode
- **`tailwind.config.js`**: Tailwind CSS configuration
- **`eslint.config.js`**: ESLint configuration for React and TypeScript
- **`vite.config.ts`**: Vite development server and build configuration with Electron integration

### Key Business Logic
- **`src/modules/database/`**: Local SQLite-electron database management and schema
- **`src/services/ai/`**: AI provider abstraction layer with factory pattern
- **`src/services/qdrant/qdrant-service.ts`**: Vector database integration for semantic search
- **`src/modules/knowledge-graph/`**: Knowledge graph implementation and concept management
- **`src/modules/analytics/`**: Learning progress tracking and analytics

### State Management
- **`src/stores/useChatStore.ts`**: Chat interface state management
- **`src/stores/useAppStore.ts`**: Global application state
- **`src/stores/useConfigStore.ts`**: Configuration and settings state

## Working with This Codebase

### Development Workflow
1. **Start the Development Server**: Use `yarn dev` to start the Vite development server with hot reload
2. **Understand the Module System**: The codebase uses a modular architecture with clear separation between UI, business logic, and data layers
3. **Run Tests Regularly**: Comprehensive test suite with Vitest and React Testing Library for reliable development
4. **Use TypeScript Strictly**: All code must pass strict TypeScript compilation before committing

### React Development Best Practices
1. **Component Structure**: Components are organized by feature (Chat/, Dashboard/, Knowledge/, etc.) rather than type
2. **State Management**: Use Zustand stores for global state, React hooks for local component state
3. **TypeScript Integration**: All components must have proper TypeScript interfaces for props
4. **Error Boundaries**: Use the ErrorBoundary component for graceful error handling
5. **Performance**: Implement React.memo, useCallback, and useMemo where appropriate
6. **Electron Integration**: Understand the distinction between main and renderer processes

### AI Provider Integration
- **Factory Pattern**: Use `src/services/ai/factory.ts` to create AI provider instances
- **Provider Abstraction**: All AI providers implement the same interface for consistency
- **Configuration**: AI provider settings are managed through the configuration service
- **Streaming**: Real-time streaming is supported across all providers with consistent handling

### Database and Vector Storage
- **Local Database**: SQLite-electron for local data persistence using `src/modules/database/`
- **Vector Database**: Qdrant for semantic search and knowledge graph operations
- **Service Management**: Use yarn scripts to manage Qdrant service lifecycle
- **Schema Management**: Database schema is defined in `src/modules/database/database-schema.ts`
- **Important**: Uses `sqlite-electron` instead of `sqlite3` for proper Electron integration

### Testing Strategy
- **Unit Tests**: Component-level tests in `src/test/components/`
- **Integration Tests**: End-to-end workflow tests in `src/test/integration/`
- **Service Tests**: Business logic tests in `src/test/services/`
- **Test Utilities**: Custom test utilities in `src/test/test-utils.tsx`

### Professional Development Environment
- **Hot Reload**: Vite provides fast hot module replacement during development
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Configured for React and TypeScript best practices
- **Electron Debugging**: Use VSCode debugging for both main and renderer processes

## Common Development Patterns

### Adding New AI Providers
1. Create provider implementation in `src/services/ai/providers/[provider].ts`
2. Implement the standard AI provider interface
3. Add provider configuration options to `src/types/config.ts`
4. Update the factory pattern in `src/services/ai/factory.ts`
5. Add provider-specific tests in `src/test/services/ai/`

### Creating New Components
1. Organize components by feature in appropriate `src/components/[Feature]/` directory
2. Create TypeScript interfaces for all props
3. Use established patterns for state management (Zustand for global, hooks for local)
4. Include comprehensive tests in `src/test/components/[Feature]/`
5. Follow naming conventions: PascalCase for components, camelCase for hooks

### Database Schema Changes
1. Update `src/modules/database/database-schema.ts`
2. Create migration scripts if needed
3. Update TypeScript types in `src/types/`
4. Add tests for new database operations
5. Update service layer to handle new schema

### IPC Communication Patterns
- Main process handles in `electron/main/ipc-handlers.ts`
- Renderer communication through preload script in `electron/preload/index.ts`
- Use TypeScript interfaces to define IPC channel contracts
- Implement proper error handling and timeout management

## Development Environment Setup

### Prerequisites
- Node.js (v18 or higher)
- Yarn package manager
- Git for version control

### Initial Setup
```bash
# Clone repository
git clone [repository-url]
cd learning_catalyst

# Install dependencies
yarn install

# Setup Qdrant vector database
yarn setup:qdrant

# Start development server
yarn dev
```

### Environment Variables
The application uses Electron store for configuration rather than environment variables for sensitive data. API keys and configuration are managed through the settings panel.

### Debugging Configuration
- Use VSCode with the official React and TypeScript extensions
- Configure breakpoints in both main and renderer processes
- Use Electron DevTools for renderer process debugging
- Check console output for main process debugging