# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Environment Setup
```bash
# Install development dependencies
yarn install

# Run the development server
yarn dev

# Build the application
yarn build
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

# Run tests with coverage
yarn test:coverage
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
│   ├── ui/             # Base UI components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API integration and business logic
│   ├── ai/            # AI provider services
│   ├── api/           # External API integrations
│   └── storage/       # Data persistence services
├── stores/             # Zustand state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── main/               # Electron main process
├── renderer/           # Electron renderer process
├── App.tsx             # Main application component
└── main.tsx           # Application entry point
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
yarn test:watch

# Run tests with UI
yarn test:ui

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test src/components/__tests__/Button.test.tsx
```

## Key Files to Understand

### Core Implementation
- **`src/main.tsx`**: Application entry point with React rendering
- **`src/App.tsx`**: Main application component with routing and layout
- **`src/main/index.ts`**: Electron main process configuration
- **`package.json`**: Complete project configuration with dependencies and scripts
- **`vite.config.ts`**: Vite bundler configuration for development and build
- **`electron.vite.config.ts`**: Electron-specific build configuration

### Configuration and Development
- **`tsconfig.json`**: TypeScript compiler configuration
- **`tailwind.config.js`**: Tailwind CSS configuration
- **`eslint.config.js`**: ESLint configuration for React and TypeScript
- **`vite.config.ts`**: Vite development server and build configuration

### Documentation
- **`docs/technical/system-architecture/README.md`**: Complete system architecture documentation
- **`docs/technical/api-reference/README.md`**: API reference with maintaining philosophy
- **`docs/README.md`**: Comprehensive application documentation and usage guide

## Working with This Codebase

### Development Workflow
1. **Start with Documentation**: The `docs/` directory contains the most comprehensive and current information about the system
2. **Use Yarn Commands**: All development workflows are standardized through yarn scripts
3. **Run Tests Regularly**: Comprehensive test suite with Vitest and React Testing Library
4. **Follow Component Architecture**: Understand the React component structure before making changes

### React Development
5. **Component-First Development**: Build reusable, composable React components
6. **TypeScript Integration**: Use strict TypeScript for type safety and better developer experience
7. **State Management**: Use Zustand for global state, React hooks for local state
8. **Error Boundaries**: Implement proper error handling with React error boundaries
9. **Performance**: Use React.memo, useCallback, and useMemo for optimization
10. **Responsive Design**: Build components that work across different screen sizes
11. **Accessibility**: Follow WCAG guidelines and implement proper ARIA attributes

### Best Practices
9. **Type Safety**: Use strict TypeScript and proper type definitions
10. **Configuration Management**: Use environment variables and Electron store for settings
11. **Testing**: Write comprehensive tests with React Testing Library and follow TDD methodology
12. **Documentation**: Update relevant documentation when adding new features

### Professional Development Environment
- **Yarn**: Package management and dependency resolution
- **VSCode Integration**: TypeScript and React development environment with debugging support
- **Hot Reload**: Fast development with Vite's hot module replacement
- **Electron DevTools**: Debug and inspect Electron main and renderer processes

## Missing Development Guidelines

### AI Assistant Guidelines
No `.cursorrules` or `.github/copilot-instructions.md` files found. Consider adding:

- **Cursor Rules**: `.cursorrules` file for consistent AI-assisted development
- **Coding Standards**: Specific guidelines for code generation and formatting
- **Architecture Guidelines**: Rules for maintaining 5-layer architecture during AI-assisted development
- **Testing Guidelines**: Instructions for generating comprehensive tests

### Contributing Guidelines
- **Contributing.md**: Missing contribution guidelines and pull request process
- **Code Review Process**: Standards for reviewing and merging changes
- **Release Process**: Guidelines for versioning and releases

### CI/CD Configuration
- **GitHub Actions**: No CI/CD configuration found for automated testing
- **Quality Gates**: Missing automated code quality checks
- **Deployment**: No automated deployment workflows

### Debugging and Troubleshooting
- **Debugging Guide**: Missing systematic debugging procedures
- **Common Issues**: No troubleshooting guide for frequent problems
- **Performance Analysis**: Missing performance optimization guidelines