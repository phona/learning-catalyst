# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Learning Catalyst is a **sophisticated AI-powered desktop application** built with TypeScript, Electron, and React. It provides personalized learning experiences through multi-agent AI orchestration, comprehensive knowledge management, and adaptive learning technologies. The application follows a **multi-process Electron architecture** with clear separation between AI services (main process) and user interface (renderer process).

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
# Run all tests (default configuration - main process)
npm test

# Run tests with UI interface
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Multi-Environment Testing
# Main Process Tests (Node.js environment - AI services, database, agents)
npm run test:main                    # Main process tests
npm run test:main:ui                 # Main process tests with UI
npm run test:main:coverage           # Main process tests with coverage

# Renderer Process Tests (Browser environment - React components, hooks, UI)
npm run test:renderer                # Renderer process tests
npm run test:renderer:ui             # Renderer tests with UI
npm run test:renderer:coverage       # Renderer tests with coverage

# Integration Tests (Cross-process communication, end-to-end workflows)
npm run test:integration             # Integration tests
npm run test:integration:ui          # Integration tests with UI
npm run test:integration:coverage    # Integration tests with coverage

# Performance Tests (Memory management, resource leaks, concurrent operations)
npm run test:performance             # Performance tests
npm run test:performance:ui          # Performance tests with UI
npm run test:performance:coverage    # Performance tests with coverage

# Complete Test Suite
npm run test:complete                # All test environments (main + renderer + integration)
npm run test:complete:coverage       # All environments with coverage
npm run test:all                     # Alias for complete test suite
npm run test:all:coverage            # Alias for complete coverage
```

### Test Examples
```bash
# Run specific test file
npm test src/main/services/agents/__tests__/agent-lifecycle.test.ts

# Run tests with specific pattern
npm test -- --grep "Agent Lifecycle"

# Run tests in watch mode for development
npm run test:main -- --watch

# Run performance tests specifically
npm run test:performance

# Generate coverage report for all environments
npm run test:complete:coverage
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

Learning Catalyst follows a **sophisticated multi-process Electron architecture** with clear separation between main and renderer processes:

### Core Architecture Layers
1. **Main Process (Node.js Environment)** - AI services, database operations, agent orchestration, system integration
2. **Renderer Process (Browser Environment)** - React UI, state management, user interactions, real-time updates
3. **IPC Communication Layer** - Secure inter-process communication via preload scripts with type-safe contracts
4. **AI Integration Layer** - Multi-provider AI abstraction with LangChain and advanced agent orchestration
5. **Data Storage Layer** - Local SQLite database with Qdrant vector storage for semantic search

### Multi-Agent Architecture
The application features a **comprehensive multi-agent system** with:
- **Agent Lifecycle Management**: Complete agent lifecycle from creation to deletion with state tracking
- **Agent Registry**: Centralized agent registration, configuration, and discovery
- **State Persistence**: Agent state saving and restoration across sessions
- **Orchestration Patterns**: Tool-calling, handoff, and hybrid orchestration strategies
- **Specialized Agents**: Learning, assessment, tutoring, and practice agents with specific capabilities

### Key Architectural Principles
- **Process Separation**: Clear boundary between main (Node.js) and renderer (browser) processes with secure IPC
- **Agent-First Design**: Multi-agent system with sophisticated lifecycle management and orchestration
- **Provider Abstraction**: Unified interface for multiple AI providers (OpenAI, ChatGLM, DeepSeek, SiliconFlow, local models)
- **Local-First Approach**: User data remains primarily on local machines with SQLite and vector storage
- **Memory Optimization**: Development environment configured for memory efficiency with monitoring and cleanup
- **Type Safety**: Comprehensive TypeScript coverage with strict mode and shared type definitions

### Module Documentation Framework
Every module follows the **What-How-Relationship Framework**:
- **🎯 What It Is**: Clear module definition, purpose, and scope
- **⚙️ How It Works**: Internal architecture, operational logic, and design patterns
- **🔗 Relationships**: Dependencies, integration patterns, and evolution paths

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
│   │   ├── agents/     # Multi-agent system management and orchestration
│   │   │   ├── agent-lifecycle-manager.ts    # Agent lifecycle and state management
│   │   │   ├── agent-registry.ts             # Agent registration and discovery
│   │   │   ├── agent-state-persistence.ts    # Agent state persistence
│   │   │   └── orchestration/                # Agent orchestration strategies
│   │   ├── catalyst/   # Core AI orchestration and concept parsing
│   │   │   ├── catalyst-service.ts           # Main Catalyst AI service
│   │   │   ├── ai-extractor.ts               # AI-powered content extraction
│   │   │   ├── langchain-adapter.ts          # LangChain integration layer
│   │   │   └── pipeline.ts                   # Content processing pipeline
│   │   ├── database/   # SQLite database operations and migrations
│   │   │   ├── kysely-database.ts            # Main database interface
│   │   │   ├── qdrant-service.ts             # Vector database service
│   │   │   ├── migrations/                   # Database schema migrations
│   │   │   └── checkpoints/                  # Checkpoint and session management
│   │   └── langchain/  # AI/ML processing and model factory
│   │       ├── ModelFactory.ts               # AI provider factory
│   │       └── langchain-service.ts          # LangChain service integration
│   ├── handlers/          # IPC handlers for renderer communication
│   ├── qdrant-manager.ts  # Qdrant vector database management
│   └── index.ts           # Main process entry point
├── renderer/           # React frontend (Browser environment)
│   ├── components/       # UI components organized by feature
│   │   ├── Analytics/    # Learning analytics and progress tracking
│   │   ├── Chat/         # AI chat interface with real-time streaming
│   │   ├── Config/       # Settings and configuration management
│   │   ├── Dashboard/    # Learning dashboard and analytics
│   │   ├── Discovery/    # Content discovery and exploration
│   │   ├── Knowledge/    # Knowledge graph visualization
│   │   ├── Layout/       # Application layout and navigation
│   │   ├── Session/      # Session management components
│   │   ├── shared/       # Shared UI components
│   │   └── UI/           # Reusable UI components and utilities
│   ├── hooks/            # Custom React hooks for state and services
│   ├── services/         # Frontend services and API clients
│   ├── stores/           # Zustand state management stores
│   ├── types/            # Renderer-specific TypeScript types
│   └── App.tsx           # React application root with routing
└── shared/               # Shared between processes
    ├── constants/        # Shared constants and enums
    ├── types/            # TypeScript type definitions for IPC
    └── utils/            # Shared utility functions
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

## Agent Lifecycle Management System

The application features a **sophisticated multi-agent system** with comprehensive lifecycle management:

### Core Agent Management Components

#### Agent Lifecycle Manager (`src/main/services/agents/agent-lifecycle-manager.ts`)
**What It Is**: Central authority for managing complete agent lifecycles from creation to deletion with full state tracking and event monitoring.

**Key Capabilities**:
- **Agent Creation**: Create agents with auto-activation and initial state configuration
- **State Transitions**: Manage agent state changes (inactive ↔ active ↔ error ↔ deleted)
- **Lifecycle Events**: Track all agent events with comprehensive metadata and timestamps
- **Batch Operations**: Execute state transitions across multiple agents simultaneously
- **Statistics & Monitoring**: Detailed lifecycle analytics and performance metrics
- **Resource Management**: Handle agent cleanup, caching, and archival

**Lifecycle States**:
- `inactive`: Agent created but not active
- `active`: Agent currently processing or available for tasks
- `error`: Agent encountered error and requires attention
- `deleted`: Agent permanently removed (with archival option)

#### Agent Registry (`src/main/services/agents/agent-registry.ts`)
**What It Is**: Centralized registration and discovery system for all agents with configuration management and type safety.

**Key Features**:
- Agent registration and configuration management
- Agent discovery and type-based lookup
- Configuration validation and schema enforcement
- Agent dependency management
- Runtime agent monitoring and health checks

#### Agent State Persistence (`src/main/services/agents/agent-state-persistence.ts`)
**What It Is**: Handles saving and restoring agent states across application sessions with database-backed persistence.

**Capabilities**:
- State serialization and deserialization
- Database-backed state storage with SQLite
- Checkpoint and rollback functionality
- State migration and versioning support
- Performance-optimized state operations

### Agent Orchestration Strategies

#### Tool-Calling Agents
Agents that can call external tools and APIs to accomplish tasks:
- Function discovery and execution
- Tool result processing and integration
- Error handling and retry logic
- Tool usage tracking and analytics

#### Handoff Agents
Specialized agents designed for seamless collaboration and task handoff:
- Agent-to-agent communication protocols
- Context preservation during handoff
- Specialized task delegation
- Collaborative problem-solving workflows

#### Hybrid Agents
Combination agents that leverage multiple orchestration strategies:
- Adaptive strategy selection based on task complexity
- Dynamic tool and handoff coordination
- Context-aware orchestration decisions
- Performance optimization through strategy switching

### Specialized Agent Types

#### Learning Agents
Focus on educational content and learning optimization:
- Personalized learning path generation
- Concept explanation and simplification
- Learning progress assessment
- Adaptive difficulty adjustment

#### Assessment Agents
Specialize in evaluating user knowledge and skills:
- Question generation and validation
- Performance evaluation and scoring
- Knowledge gap identification
- Assessment analytics and reporting

#### Tutoring Agents
Provide personalized guidance and support:
- Interactive tutoring sessions
- Real-time feedback and hints
- Learning strategy recommendations
- Motivational support and engagement

#### Practice Agents
Focus on skill development through practice:
- Exercise generation and adaptation
- Practice session management
- Skill progression tracking
- Performance optimization recommendations

### Agent Configuration and Customization

#### Agent Configuration Schema
```typescript
interface AgentConfiguration {
  id: string;
  name: string;
  type: 'learning' | 'assessment' | 'tutoring' | 'practice';
  modelConfig: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tools: string[];
  capabilities: string[];
  metadata: Record<string, any>;
}
```

#### Lifecycle Events and Monitoring
All agent operations generate comprehensive lifecycle events:
- **Creation Events**: Track agent creation with configuration details
- **Activation Events**: Monitor agent activation with performance metrics
- **State Transitions**: Record all state changes with context and metadata
- **Error Events**: Capture and analyze errors for debugging and improvement
- **Deletion Events**: Track agent removal with archival information

### Agent Development Best Practices

#### Creating New Agents
1. **Define Agent Type**: Extend the base agent configuration schema
2. **Implement Agent Logic**: Create specialized agent implementation
3. **Register Agent**: Add to agent registry with proper configuration
4. **Add Tests**: Create comprehensive tests for agent functionality
5. **Document Capabilities**: Provide clear documentation of agent features

#### Agent Configuration
1. **Use Type Safety**: Leverage TypeScript interfaces for configuration
2. **Validate Configuration**: Implement proper schema validation
3. **Provide Defaults**: Ensure sensible default configurations
4. **Document Options**: Clear documentation of all configuration options
5. **Version Compatibility**: Handle configuration versioning and migration

#### Agent Testing
1. **Unit Tests**: Test individual agent functionality
2. **Integration Tests**: Test agent interaction with system components
3. **Lifecycle Tests**: Test complete agent lifecycle scenarios
4. **Performance Tests**: Test agent performance under load
5. **Error Scenarios**: Test agent behavior under error conditions

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

### Multi-Environment Testing Strategy

The application uses a **comprehensive multi-environment testing strategy** to ensure quality across all process boundaries:

#### Test Configurations
- **`vitest.config.ts`**: Default configuration (main process focus)
- **`vitest.main.config.ts`**: Main process (Node.js) environment configuration
- **`vitest.renderer.config.ts`**: Renderer process (Browser) environment configuration
- **`vitest.integration.config.ts`**: Cross-process integration testing configuration
- **`vitest.performance.config.ts`**: Performance and memory testing configuration

### Test Configuration by Environment

#### Main Process Tests (Node.js Environment)
- **Framework**: Vitest with Node.js environment
- **Focus**: AI services, database operations, agent lifecycle management, IPC handlers
- **Test Types**: Unit tests, integration tests, API tests, database tests
- **Mocking**: Service layer mocking, database mocking, AI provider mocking
- **Coverage**: Business logic, agent orchestration, data persistence

#### Renderer Process Tests (Browser Environment)
- **Framework**: Vitest + React Testing Library
- **Environment**: jsdom for DOM simulation
- **Focus**: React components, hooks, state management, user interactions
- **Test Types**: Component tests, hook tests, integration tests, E2E workflows
- **Tools**: user-event for interaction testing, React Testing Library for component testing
- **Coverage**: UI components, user workflows, state management

#### Integration Tests (Cross-Process)
- **Framework**: Vitest with custom Electron integration setup
- **Focus**: IPC communication, end-to-end workflows, process coordination
- **Test Types**: Communication tests, workflow tests, data flow tests
- **Mocking**: Partial service mocking, IPC channel mocking
- **Coverage**: Complete user journeys, system integration

#### Performance Tests (Resource Management)
- **Framework**: Vitest with performance monitoring
- **Focus**: Memory usage, resource leaks, concurrent operations, load testing
- **Tools**: Memory monitoring, performance metrics, resource tracking
- **Test Types**: Memory leak detection, concurrent session testing, load testing
- **Coverage**: System stability, resource management, performance optimization

### Test Structure
```
src/
├── __tests__/                           # Test files co-located with source code
│   ├── components/                      # React component tests (renderer)
│   │   ├── Chat/__tests__/              # Chat component tests
│   │   ├── Dashboard/__tests__/         # Dashboard component tests
│   │   └── UI/__tests__/                # UI component tests
│   ├── hooks/                           # React hook tests (renderer)
│   │   └── __tests__/                   # Hook-specific tests
│   ├── services/                        # Service tests (main & renderer)
│   │   └── __tests__/                   # Service layer tests
│   ├── utils/                           # Utility function tests
│   │   └── __tests__/                   # Utility function tests
│   ├── integration/                     # Integration test scenarios
│   │   ├── multi-agent-orchestration.test.ts
│   │   ├── error-recovery.test.ts
│   │   └── ipc-communication.test.ts
│   └── performance/                     # Performance test scenarios
│       ├── concurrent-sessions.test.ts
│       ├── memory-management.test.ts
│       └── resource-leak-detection.test.ts
├── main/services/                       # Main process service tests
│   ├── agents/__tests__/                # Agent system tests
│   ├── catalyst/__tests__/              # Catalyst service tests
│   ├── database/__tests__/              # Database service tests
│   └── langchain/__tests__/             # LangChain service tests
├── renderer/                            # Renderer process tests
│   ├── stores/__tests__/                # State management tests
│   ├── services/__tests__/              # Frontend service tests
│   └── components/**/__tests__/         # Component tests (co-located)
├── test/                                # Global test utilities and setup
│   ├── setup/                           # Test setup configurations
│   │   ├── integration-setup.ts         # Integration test setup
│   │   ├── performance-setup.ts         # Performance test setup
│   │   └── main-setup.ts                # Main process test setup
│   ├── mocks/                           # Mock implementations
│   │   ├── mock-agents.ts               # Agent system mocks
│   │   ├── mock-langchain.ts            # LangChain mocks
│   │   └── mock-electron-api.ts        # Electron API mocks
│   └── utils/                           # Test utility functions
│       ├── helpers/                     # Test helper functions
│       └── fixtures/                    # Test data fixtures
└── test-utils/                          # Custom test utilities
    ├── agent-test-helpers.ts            # Agent testing utilities
    ├── streaming-test-utils.ts          # Streaming response test utilities
    └── test-utils.tsx                   # React testing utilities
```

### Test Running Examples
```bash
# Main Process Testing (Node.js Environment)
npm run test:main                         # Run all main process tests
npm run test:main:ui                      # Run main tests with UI interface
npm run test:main:coverage                # Run main tests with coverage
npm run test:main -- --grep "Agent"       # Run main tests matching pattern
npm run test:main -- src/main/services/agents/__tests__/agent-lifecycle.test.ts

# Renderer Process Testing (Browser Environment)
npm run test:renderer                     # Run all renderer process tests
npm run test:renderer:ui                  # Run renderer tests with UI interface
npm run test:renderer:coverage            # Run renderer tests with coverage
npm run test:renderer -- --watch          # Run renderer tests in watch mode
npm run test:renderer -- src/renderer/components/Chat/__tests__/MessageBubble.test.tsx

# Integration Testing (Cross-Process)
npm run test:integration                   # Run all integration tests
npm run test:integration:ui                # Run integration tests with UI
npm run test:integration:coverage          # Run integration tests with coverage
npm run test:integration -- --grep "IPC"   # Run IPC-specific integration tests

# Performance Testing (Resource Management)
npm run test:performance                  # Run all performance tests
npm run test:performance:ui               # Run performance tests with UI
npm run test:performance:coverage         # Run performance tests with coverage
npm run test:performance -- --grep "memory"  # Run memory-specific tests

# Complete Test Suite
npm run test:complete                     # Run all test environments
npm run test:complete:coverage            # Run all tests with coverage
npm run test:all                          # Alias for complete test suite

# Development Testing
npm test                                  # Default: main process tests
npm run test:ui                           # Default: main tests with UI
npm run test:run                          # Run tests once (CI mode)
npm run test:coverage                     # Generate coverage report
```

### Test Development Guidelines

#### Writing Tests for Different Environments

**Main Process Tests**:
```typescript
// Example: Testing Agent Lifecycle Manager
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentLifecycleManager } from '../agent-lifecycle-manager';

describe('AgentLifecycleManager', () => {
  let manager: AgentLifecycleManager;

  beforeEach(() => {
    // Setup with mocked dependencies
    manager = new AgentLifecycleManager(mockRegistry, mockDb, mockLogger, mockAls);
  });

  it('should create agent with lifecycle tracking', async () => {
    const agent = await manager.createAgent(testConfig, { autoActivate: true });
    expect(agent.status).toBe('active');
    // Verify lifecycle events were recorded
  });
});
```

**Renderer Process Tests**:
```typescript
// Example: Testing React Component
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('should send message when submitted', async () => {
    const mockSendMessage = vi.fn();
    render(<ChatInput onSendMessage={mockSendMessage} />);

    const input = screen.getByPlaceholderText('Type a message...');
    const submitButton = screen.getByRole('button', { name: 'Send' });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(submitButton);

    expect(mockSendMessage).toHaveBeenCalledWith('Hello');
  });
});
```

**Integration Tests**:
```typescript
// Example: Testing Cross-Process Communication
import { describe, it, expect, beforeEach } from 'vitest';
import { setupElectronIntegration } from '../../../test/setup/integration-setup';

describe('IPC Communication Integration', () => {
  let electronApp: any;

  beforeEach(async () => {
    electronApp = await setupElectronIntegration();
  });

  it('should handle agent creation from renderer', async () => {
    const result = await electronApp.renderer.evaluate(() => {
      return window.electronAPI.createAgent(testConfig);
    });

    expect(result.success).toBe(true);
    expect(result.agent.id).toBeDefined();
  });
});
```

### Test Data Management

#### Fixtures and Mocks
- **Test Fixtures**: Predefined test data for consistent testing
- **Mock Services**: Comprehensive mocking of external dependencies
- **Database Mocks**: In-memory database for testing
- **AI Provider Mocks**: Simulated AI responses for testing

#### Test Environment Configuration
- **Isolation**: Each test runs in isolated environment
- **Cleanup**: Automatic cleanup after each test
- **State Management**: Reset application state between tests
- **Resource Management**: Proper resource cleanup to prevent leaks

### Coverage and Quality Metrics

#### Coverage Targets
- **Main Process**: >90% coverage for business logic
- **Renderer Process**: >85% coverage for UI components
- **Integration**: >80% coverage for cross-process workflows
- **Overall**: >85% combined coverage

#### Quality Gates
- **TypeScript**: All tests must pass strict type checking
- **Linting**: All test files must pass ESLint rules
- **Performance**: Tests must complete within time limits
- **Memory**: No memory leaks detected in test runs

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