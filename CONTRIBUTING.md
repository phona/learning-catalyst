# Contributing to Learning Catalyst

Thank you for your interest in contributing to Learning Catalyst! This guide will help you get started and ensure your contributions align with our standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)

## Getting Started

Learning Catalyst is an AI-powered desktop application built with:
- **Electron** - Desktop framework
- **TypeScript** - Type-safe development
- **React** - UI components
- **Kysely** - Type-safe database queries
- **Vite** - Build tool

### Quick Start

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/learning-catalyst.git
cd learning-catalyst

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Verify everything works
npm test
```

## Development Setup

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: 9+ or **pnpm**: 8+
- **Git**: Latest version
- **VSCode**: Recommended IDE
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

### Recommended VSCode Extensions

Install these extensions for the best development experience:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "ms-vscode.vscode-git-base"
  ]
}
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Development
NODE_ENV=development
DEBUG=true

# Optional: Enable debug logging
DEBUG_ELECTRON_API=true
DEBUG_MEMORY=true
DEBUG_PERFORMANCE=true

# AI Providers (for testing)
OPENAI_API_KEY=your_key_here
CHATGLM_API_KEY=your_key_here
```

### Build Verification

After setup, verify everything works:

```bash
# Type check
npm run type-check

# Run all tests
npm test

# Build production version
npm run build

# Check for lint errors
npm run lint
```

## Development Workflow

### Branch Strategy

We use **Git Flow** with feature branches:

```
main
├── feature/awesome-feature
├── feature/improvement-x
├── bugfix/critical-issue
└── hotfix/urgent-fix
```

**Branch naming:**
- `feature/` - New features
- `bugfix/` - Non-critical bug fixes
- `hotfix/` - Critical production fixes
- `improvement/` - Code refactoring/optimization
- `docs/` - Documentation changes

### Commit Messages

We follow **Conventional Commits** specification:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding/updating tests
- `chore` - Build process or auxiliary tool changes

**Examples:**

```bash
feat(chat): add streaming response support

Implement real-time streaming for AI responses
to improve user experience during long operations.

Closes #123

fix(database): resolve Kysely connection leak

Closes #456
```

### Development Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

2. **Make changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation

3. **Test changes**
   ```bash
   npm test              # Run all tests
   npm run test:main     # Main process tests only
   npm run test:renderer # Renderer tests only
   ```

4. **Check code quality**
   ```bash
   npm run lint          # Check linting
   npm run type-check    # TypeScript validation
   ```

5. **Commit changes**
   ```bash
   git add .
   git commit -m "feat(chat): add awesome feature"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/my-awesome-feature
   ```

## Coding Standards

### TypeScript Guidelines

**1. Strict Mode**
```typescript
// ✅ Always use strict TypeScript
const { value } = getData();
// TypeScript ensures value is properly typed

// ❌ Avoid any type
const value: any = getData();
```

**2. Explicit Types**
```typescript
// ✅ Explicit return types for public functions
export function createChatService(
  dependencies: Dependencies
): ChatService {
  return {
    async sendMessage(message: string): Promise<ChatResponse> {
      // Implementation
    }
  };
}

// ✅ Explicit parameter types
function processData(data: DataType): ReturnType {
  // Implementation
}
```

**3. No Null/Undefined Confusion**
```typescript
// ✅ Use proper null checking
if (user?.name != null) {
  console.log(user.name);
}

// ✅ Provide default values
const name = user?.name ?? 'Anonymous';

// ❌ Avoid non-null assertion (unless absolutely necessary)
console.log(user!.name);
```

### File Organization

**1. File Naming**
```
Components:    PascalCase (e.g., ChatInterface.tsx)
Services:      camelCase (e.g., chatService.ts)
Types:         camelCase (e.g., chat-types.ts)
Directories:   kebab-case (e.g., chat-service/)
```

**2. Directory Structure**
```
src/
├── main/                    # Electron main process
│   ├── services/           # Service layer
│   │   ├── core/          # Infrastructure
│   │   ├── domain/        # Business logic
│   │   └── ai/           # AI integration
│   ├── handlers/          # IPC handlers
│   └── preload/          # Preload scripts
├── renderer/              # React frontend
│   ├── components/        # UI components
│   ├── hooks/            # Custom hooks
│   ├── services/         # Frontend services
│   └── stores/           # State management
└── shared/               # Shared types
    └── types/            # TypeScript definitions
```

### Code Style

**1. Imports ( organized and grouped )**
```typescript
// ✅ External libraries
import React, { useState, useEffect } from 'react';
import { create } from 'zustand';

// Internal services
import { createChatService } from '@/main/services/domain/chat/chat-service';

// Shared types
import type { ChatMessage } from '@/shared/types/chat';

// Local components
import { MessageList } from './MessageList';
```

**2. Function Organization**
```typescript
// ✅ Helper functions first (private)
function helperFunction(input: string): string {
  return input;
}

// Component/Service definition
export function MyComponent() {
  // State
  const [data, setData] = useState<DataType[]>([]);

  // Effects
  useEffect(() => {
    loadData();
  }, []);

  // Event handlers
  const handleClick = (id: string) => {
    // Implementation
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

**3. Naming Conventions**
```typescript
// ✅ Variables and functions: camelCase
const userName = 'John';
const getUserData = () => {};

// ✅ Types and interfaces: PascalCase
interface UserData {
  id: string;
  name: string;
}

// ✅ Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ Boolean variables: should sound like yes/no
const isLoading = true;
const hasError = false;
const canProceed = true;
```
### Functional Pattern (All Modules)

**Use React-style functional patterns for ALL code:**

```typescript
// ✅ React Component
export function Component({ prop }: Props) {
  const [state, setState] = useState<Type>();
  return <div>{/* JSX */}</div>;
}

// ✅ Service Factory (like custom hook)
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

// ✅ IPC Handler
export function setupHandlers({ service }: Dependencies) {
  ipcMain.handle('domain:method', async (event, input) => {
    return await service.method(input);
  });
}
```

**All modules use functional factories - NO classes anywhere.**

## Testing Requirements

### Test Structure

```
src/
├── main/
│   └── services/
│       └── domain/
│           └── chat/
│               ├── chat-service.ts
│               └── __tests__/
│                   └── chat-service.test.ts
├── renderer/
│   └── components/
│       └── Chat/
│           ├── ChatInterface.tsx
│           └── __tests__/
│               └── ChatInterface.test.tsx
└── integration/
    └── chat-flow.test.ts
```

### Main Process Testing

**Unit Tests with Vitest:**
```typescript
// src/main/services/domain/chat/__tests__/chat-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createChatService } from '../chat-service';
import { createMock } from 'vitest-mock-extended';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockDb: ReturnType<typeof createMock>;
  let mockLogger: ReturnType<typeof createMock>;

  beforeEach(() => {
    mockDb = createMock<Kysely<Database>>();
    mockLogger = createMock<LoggerService>();

    chatService = createChatService({
      db: mockDb,
      loggerService: mockLogger
    });
  });

  it('should send a message', async () => {
    // Arrange
    const message = 'Hello, world!';

    // Act
    await chatService.sendMessage(message);

    // Assert
    expect(mockDb.insertInto).toHaveBeenCalledWith('messages');
  });
});
```

### Renderer Testing

**Component Tests with React Testing Library:**
```typescript
// src/renderer/components/Chat/__tests__/ChatInterface.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInterface } from '../ChatInterface';

describe('ChatInterface', () => {
  it('should send a message when form is submitted', async () => {
    // Render
    render(<ChatInterface sessionId="test-session" />);

    // Act
    const input = screen.getByPlaceholderText('Type a message...');
    const button = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(button);

    // Assert
    expect(input).toHaveValue('');
  });
});
```

### Integration Testing

**IPC Communication Tests:**
```typescript
// src/integration/chat-flow.test.ts
import { describe, it, expect } from 'vitest';

describe('Chat Flow', () => {
  it('should send message and receive response', async () => {
    // Test full IPC flow
    const response = await window.electronAPI.chat.sendMessage(
      'Hello',
      'test-session'
    );

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- chat-service.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests by type
npm run test:main        # Main process tests
npm run test:renderer    # Renderer tests
npm run test:integration # Integration tests
```

### Test Coverage Requirements

- **Main Process**: >90% coverage
- **Renderer**: >90% coverage
- **Integration**: >80% coverage

Run `npm run test:coverage` to generate coverage reports.

## Documentation

### When to Update Documentation

Always update documentation when:
- Adding new features
- Changing APIs
- Modifying architecture
- Adding new tests
- Creating new services

### Documentation Standards

**1. Code Comments**
```typescript
// ✅ Document public APIs
/**
 * Creates a chat service with the specified dependencies.
 *
 * @param dependencies - Service dependencies
 * @returns Chat service instance
 *
 * @example
 * ```typescript
 * const chatService = createChatService({
 *   db,
 *   loggerService,
 *   aiService
 * });
 * ```
 */
export function createChatService(
  dependencies: Dependencies
): ChatService {
  // Implementation
}

// ✅ Document complex logic
/**
 * Calculates the learning progress percentage.
 *
 * Formula: (mastered_concepts / total_concepts) * 100
 *
 * Important: This calculation excludes deprecated concepts.
 */
function calculateProgress(): number {
  // Implementation
}
```

**2. README Updates**
- Feature additions → Update relevant README section
- New commands → Update command reference
- Configuration changes → Update configuration guide

**3. API Documentation**
```typescript
// Document Electron API changes
/**
 * Chat API - Handle messaging and conversation
 *
 * Methods:
 * - sendMessage: Send a message and get AI response
 * - getHistory: Retrieve conversation history
 * - deleteMessage: Remove a message
 *
 * @example
 * ```typescript
 * await window.electronAPI.chat.sendMessage('Hello!');
 * ```
 */
```

### Docstrings Format

We use **JSDoc** format:

```typescript
/**
 * Brief description of the function/class
 *
 * Longer description if needed. Can span multiple lines
 * and include examples.
 *
 * @param paramName - Description of the parameter
 * @returns Description of the return value
 *
 * @example
 * ```typescript
 * const result = myFunction('input');
 * console.log(result); // 'output'
 * ```
 *
 * @throws {Error} When the input is invalid
 */
```

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
   ```bash
   npm test
   ```

2. **Verify code quality**
   ```bash
   npm run lint
   npm run type-check
   ```

3. **Update documentation**
   - README files
   - Code comments
   - API documentation

4. **Add tests** for new functionality

5. **Run build** to ensure no errors
   ```bash
   npm run build
   ```

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Commit messages follow conventions
- [ ] PR description is clear and detailed

### PR Description Template

```markdown
## Description

Brief description of changes and motivation.

## Type of Change

- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] This change requires a documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

Include screenshots for UI changes.

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have made corresponding changes
- [ ] I have added tests that prove my fix works or my feature works
- [ ] New and existing tests pass locally
```

### PR Review Process

1. **Automated Checks**
   - CI must pass all tests
   - Build must complete successfully
   - Linting must pass

2. **Code Review**
   - At least one maintainer review required
   - Address all feedback
   - Request re-review when ready

3. **Merge**
   - Squash and merge preferred
   - Use descriptive commit message
   - Delete feature branch after merge

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. We:

- **Respect** all contributors
- **Listen** to different perspectives
- **Help** each other learn and grow
- **Focus** on constructive feedback
- **Welcome** newcomers warmly

### Communication

- **Be respectful** and professional
- **Provide constructive feedback** on PRs
- **Ask questions** if something is unclear
- **Share knowledge** freely
- **Help review** pull requests

### Getting Help

- **GitHub Issues** - Report bugs or request features
- **GitHub Discussions** - Ask questions and share ideas
- **Documentation** - Check docs first
- **Existing Issues** - Search before creating new ones

### Recognition

Contributors are recognized through:
- **Contributors.md** file
- **Release notes** attribution
- **GitHub contributors** page

## Tips for Contributors

### 1. Start Small

**Good first issues:**
- Fix typos in documentation
- Add tests for existing code
- Refactor small functions
- Improve error messages

### 2. Ask Questions

Don't hesitate to ask:
- Questions on GitHub Discussions
- Clarification in issue comments
- Help in code review process

### 3. Be Patient

Code review takes time:
- One review cycle minimum
- Maintainers are volunteers
- Thorough review ensures quality

### 4. Stay Updated

Keep informed:
- Watch the repository
- Read release notes
- Follow discussions
- Check for project updates

## Common Issues & Solutions

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check for type errors
npm run type-check

# Fix common errors:
# - Missing type annotations
# - Incorrect interface implementation
# - Missing null checks
```

### Tests Failing

```bash
# Run specific failing test
npm test -- test-name.test.ts

# Check test coverage
npm run test:coverage
```

## Resources

### Documentation
- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Kysely Docs](https://kysely.dev)
- [Vite Docs](https://vitejs.dev)

### Tools
- [VSCode](https://code.visualstudio.com)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Electron DevTools](https://www.electronjs.org/docs/latest/tutorial/devtools-extension)

## Questions?

If you have questions about contributing:

1. Check this guide
2. Search existing GitHub issues
3. Ask in GitHub Discussions
4. Reach out to maintainers

## Thank You!

Thank you for contributing to Learning Catalyst! Your efforts help make this project better for everyone. Every contribution, no matter how small, is valued and appreciated.

---

**Happy coding! 🚀**

