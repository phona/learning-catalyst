# Testing Guide

Comprehensive testing strategy for Learning Catalyst covering main process, renderer, integration, and performance testing.

## Test Structure

Tests are co-located with the code they test for easy discovery and maintenance:

```
src/
├── main/
│   ├── services/
│   │   └── domain/
│   │       └── chat/
│   │           ├── chat-service.ts
│   │           └── __tests__/
│   │               └── chat-service.test.ts
│   └── handlers/
│       └── __tests__/
│           └── chat-handlers.test.ts
├── renderer/
│   └── components/
│       ├── Chat/
│       │   ├── ChatInterface.tsx
│       │   └── __tests__/
│       │       └── ChatInterface.test.tsx
└── test/                    # Shared test utilities
    ├── setup/               # Test environment setup
    ├── utils/               # Shared test helpers
    ├── fixtures/            # Test data
    └── integration/         # Integration tests
```

## Running Tests

### Quick Start
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for TDD
npm run test:coverage      # With coverage report
```

### By Scope
```bash
npm run test:main          # Main process tests only
npm run test:renderer      # Renderer tests only
npm run test:integration   # Integration tests only
npm run test:performance   # Performance tests only
```

### By File
```bash
npm run test:main:file -- chat-service.test.ts
npm run test:renderer:file -- ChatInterface.test.tsx
```

### Coverage Reports
```bash
npm run test:coverage      # All tests with coverage
npm run test:main:coverage # Main process coverage only
npm run test:renderer:coverage # Renderer coverage only
```

### UI Mode
```bash
npm run test:main:ui       # Main process tests in Vitest UI
npm run test:renderer:ui   # Renderer tests in Vitest UI
npm run test:integration:ui # Integration tests in Vitest UI
```

## Test Types

### Unit Tests
Tests individual functions, services, and components in isolation.

**Main Process:**
```typescript
describe('ChatService', () => {
  it('should send message', async () => {
    const mockDB = createMockDB();
    const chatService = createChatService({ db: mockDB });
    const result = await chatService.sendMessage('Hello');
    expect(result).toBeDefined();
  });
});
```

**Renderer:**
```typescript
describe('ChatInterface', () => {
  it('renders message input', () => {
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });
});
```

### Integration Tests
Tests service interactions and IPC communication.

```typescript
describe('Chat Integration', () => {
  it('should persist message to database', async () => {
    const { chatService, db } = await setupServices();
    await chatService.sendMessage('Test message');
    const messages = await db.selectFrom('messages').execute();
    expect(messages).toHaveLength(1);
  });
});
```

### Behavior Tests
Tests user interactions and component behavior.

```typescript
describe('SettingsPanel behavior', () => {
  it('should update provider on selection', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    await user.selectOptions(screen.getByLabelText('Provider'), 'OpenAI');
    expect(screen.getByDisplayValue('OpenAI')).toBeInTheDocument();
  });
});
```

### Performance Tests
Tests memory leaks and performance characteristics.

```typescript
describe('Memory leaks', () => {
  it('should not leak memory in chat service', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    await runChatWorkload();
    await forceGarbageCollection();
    const finalMemory = process.memoryUsage().heapUsed;
    expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // 10MB
  });
});
```

## Test Environment

### Main Process Tests
- **Environment:** Node.js with JSDOM
- **Framework:** Vitest with custom Electron main setup
- **Database:** In-memory SQLite for tests
- **Isolation:** Each test gets fresh database instance

### Renderer Tests
- **Environment:** JSDOM with React Testing Library
- **Framework:** Vitest with jsdom environment
- **Browser API:** Polyfilled for testing
- **Components:** Rendered in isolated DOM

### Integration Tests
- **Environment:** Full Electron app simulation
- **IPC:** Real IPC communication via test harness
- **Database:** Test database with fixtures

## Test Utilities

### Setup Files
- `src/test/setup/global.ts` - Global test configuration
- `src/test/setup/main-process.ts` - Main process test setup
- `src/test/setup/renderer.ts` - Renderer test setup
- `src/test/setup/integration.ts` - Integration test setup

### Helper Functions
```typescript
// Service testing
createMockDB()                    // Create in-memory test database
createMockLogger()                // Create test logger
createMockAIService()             // Create mock AI service

// Component testing
renderWithProviders(<Component/>) // Render with all providers
createTestStore(initialState)     // Create Zustand test store

// IPC testing
mockIPC(channel, handler)         // Mock IPC handler
awaitIPC(channel, timeout)        // Wait for IPC call
```

### Factories
```typescript
// Database factory
const testDB = createTestDatabase();

// Agent factory
const mockAgent = createMockAgent('learning');

// Chat message factory
const message = createChatMessage({
  role: 'user',
  content: 'Test message'
});
```

### Fixtures
```typescript
// Configuration fixtures
import { defaultConfig } from '@/test/utils/fixtures/config';

// Mock data
import { mockConversations } from '@/test/utils/fixtures/conversations';

// Sample content
import { sampleConcepts } from '@/test/utils/fixtures/concepts';
```

## Best Practices

### ✅ DO
- Keep tests focused on single behavior
- Use descriptive test names (should/when/it pattern)
- Set up fresh state for each test
- Use factories for test data creation
- Mock external dependencies (database, AI services)
- Test error cases, not just happy paths
- Use async/await for async operations
- Clean up resources after tests

### ❌ DON'T
- Share state between tests
- Use global state without cleanup
- Mock too much (test integration points)
- Write tests that only test implementation details
- Use `any` type in tests (maintain type safety)
- Skip error handling tests
- Create brittle tests with over-specific selectors

## Coverage Targets

- **Main Process Services:** >90%
- **Renderer Components:** >90%
- **IPC Handlers:** >85%
- **Integration Tests:** >80%
- **Overall Project:** >85%

Coverage includes:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

## Debugging Tests

### Verbose Output
```bash
npm run test -- --reporter=verbose
```

### Debug Specific Test
```typescript
it('should debug this', () => {
  debugger; // Breakpoint in Node.js inspector
  expect(value).toBe(expected);
});
```

Then run:
```bash
node --inspect-brk node_modules/.bin/vitest run --no-coverage
```

### Test Inspector
```bash
npm run test:ui  # Open Vitest UI for interactive debugging
```

## Common Patterns

### Testing Services
```typescript
describe('MyService', () => {
  let service: ReturnType<typeof createMyService>;
  let mockDB: MockDatabase;

  beforeEach(() => {
    mockDB = createMockDB();
    service = createMyService({ db: mockDB });
  });

  it('should process input', async () => {
    const result = await service.process(input);
    expect(result).toMatchObject({ status: 'success' });
  });

  it('should handle errors', async () => {
    mockDB.rejectNextOperation('Database error');
    await expect(service.process(input)).rejects.toThrow('Database error');
  });
});
```

### Testing Components
```typescript
describe('MyComponent', () => {
  it('renders with props', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls callback on click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing IPC
```typescript
describe('Chat Handlers', () => {
  it('should send message via IPC', async () => {
    const mockChatService = { sendMessage: vi.fn() };
    const handler = createChatHandler({ chatService: mockChatService });
    await handler('test message');
    expect(mockChatService.sendMessage).toHaveBeenCalledWith('test message');
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Daily scheduled runs

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    npm run test:coverage
    npm run test:integration
    npm run test:performance
```

## Performance Testing

```bash
npm run test:memory       # Memory leak detection
npm run test:performance  # Performance benchmarks
```

Tests check:
- Memory usage over time
- Event listener cleanup
- Database connection leaks
- IPC channel cleanup
- Component unmounting

## See Also

- [Developer Guide: Testing Strategy](../../docs/DEVELOPER-GUIDE/testing.md)
- [Testing Improvements](../../docs/TESTING-IMPROVEMENTS.md)
- [Testing Status](../../docs/TESTING-STATUS.md)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
