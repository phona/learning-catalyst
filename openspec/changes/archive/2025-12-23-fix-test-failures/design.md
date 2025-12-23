# Fix Test Failures - Technical Design

## Architectural Decisions

### Decision 1: Dependency Injection Over Mocking

**Context**: Tests currently mock stateless utilities like `createChunkEmitter`, violating the DI principle.

**Decision**: Use dependency injection pattern - mock stateful dependencies, use real stateless utilities.

**Rationale**:
1. **Maintainability**: Real utilities are maintained in one place, not duplicated in tests
2. **Reliability**: Tests validate actual implementation, not mock behavior
3. **Type Safety**: Real utilities provide proper TypeScript types
4. **Updates**: Utility updates automatically reflected in tests

**Trade-offs**:
- ✅ Tests are more realistic
- ✅ Easier to refactor production code
- ❌ Slightly more complex test setup (injection)

**Pattern Example**:
```typescript
// ❌ OLD: Mock stateless utility
vi.mock('../../../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn(() => mockEmitter)
}));

// ✅ NEW: Use real utility, inject stateful dependency
import { createChunkEmitter } from '../../../utils/chunk-emitter';

const config = { writer: vi.fn() };
const emitter = createChunkEmitter(config);
await node(state, config);
expect(config.writer).toHaveBeenCalled();
```

### Decision 2: renderWithServices Over Manual Mocks

**Context**: Renderer tests manually mock dependencies like Assistant UI components.

**Decision**: Use `renderWithServices` utility for all renderer component tests.

**Rationale**:
1. **Consistency**: Standardized way to inject dependencies
2. **Completeness**: Automatically handles providers, context, etc.
3. **Isolation**: Tests focus on component, not infrastructure
4. **Maintainability**: Single place to update mocking strategy

**Trade-offs**:
- ✅ Cleaner test code
- ✅ Better integration testing
- ❌ Requires utility to be well-maintained

**Pattern Example**:
```typescript
// ❌ OLD: Manual mocks
vi.mock('@assistant-ui/react', () => ({
  ThreadListPrimitive: { ... }
}));

// ✅ NEW: DI with renderWithServices
renderWithServices(<Component />, {
  electronAPI: mockAPI,
  providers: [...],
});
```

### Decision 3: Update Vitest Instead of Downgrade Coverage

**Context**: Vitest v3.2.4 vs @vitest/coverage-v8 v4.0.16 version mismatch.

**Decision**: Update Vitest to v4 to match coverage provider.

**Rationale**:
1. **Features**: Latest Vitest has better performance and features
2. **Future-proof**: Avoid accumulating technical debt
3. **Compatibility**: Coverage v8 v4 is the current version
4. **Support**: Better community support for latest versions

**Trade-offs**:
- ✅ Access to latest features
- ✅ Better performance
- ⚠️ Potential breaking changes (low risk in patch update)

**Implementation**:
```bash
npm install -D vitest@^4.0.0
npm test  # Verify compatibility
```

### Decision 4: Remove Legacy Test Files

**Context**: `agent-manager-basic.test.ts` tests non-existent architecture.

**Decision**: Remove test file entirely.

**Rationale**:
1. **Technical Debt**: Tests for removed features add confusion
2. **Maintenance**: No value in maintaining tests for dead code
3. **Clarity**: Removing makes intent clear
4. **Metrics**: Reduces false failure count

**Trade-offs**:
- ✅ Cleaner test suite
- ✅ Better metrics
- ❌ Loses historical test coverage (acceptable, feature removed)

## System Design

### Test Infrastructure Layers

```
┌─────────────────────────────────────────┐
│           Test Execution Layer          │
│  (npm run test:main, test:renderer)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        Test Configuration Layer         │
│  (vitest.config.ts, test setup files)   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Test Utilities Layer            │
│  - renderWithServices                    │
│  - createIpcPair                         │
│  - createMockElectronAPI                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Implementation Layer            │
│  - Real utilities (chunk-emitter, etc)  │
│  - Mocked dependencies (LLM, writer)    │
└─────────────────────────────────────────┘
```

### Dependency Injection Flow

```
Test Setup
    ↓
Create Mock Dependencies (stateful)
    ↓
Inject via Configuration
    ↓
Use Real Utilities (stateless)
    ↓
Execute Test
    ↓
Verify Injected Mocks Called
```

**Example Workflow Node Test**:
```typescript
// 1. Create stateful mocks
const writer = vi.fn();
const config = { writer };  // Inject

// 2. Use real utility (stateless)
const emitter = createChunkEmitter(config);

// 3. Execute with real implementation
await remediatePracticeNode(deps)(state, config);

// 4. Verify injection was used
expect(writer).toHaveBeenCalledWith({
  type: 'text-start',
  id: expect.any(String)
});
```

### Renderer Test Architecture

```
Component Test
    ↓
renderWithServices (DI Container)
    ↓
Injected Dependencies
    ├─ electronAPI (mocked)
    ├─ Providers (mocked/real)
    └─ Context (test-specific)
    ↓
Actual Component Implementation
    ↓
Assertions on DOM/Behavior
```

**Example Renderer Test**:
```typescript
renderWithServices(
  <ThreadListSidebar open={true} />,
  {
    electronAPI: {
      sessions: { list: vi.fn().mockResolvedValue([]) },
      // ... other API methods
    },
    providers: [
      // Test-specific providers
    ]
  }
);

expect(screen.getByTestId('thread-list')).toBeInTheDocument();
```

## Implementation Patterns

### Pattern 1: Workflow Node Test

**Use Case**: Testing LangGraph workflow nodes

**Template**:
```typescript
import { createChunkEmitter } from '../../../utils/chunk-emitter';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

describe('Workflow Node', () => {
  // Create mock config (stateful dependency)
  const createMockConfig = (): LangGraphRunnableConfig => ({
    writer: vi.fn(),
  } as any);

  it('should execute node with streaming', async () => {
    // Use real utility
    const node = workflowNode(mockDeps);
    const state = { /* test state */ };

    // Execute with injected config
    const result = await node(state, createMockConfig());

    // Verify injection was used
    expect(createMockConfig().writer).toHaveBeenCalled();
  });
});
```

### Pattern 2: Renderer Component Test

**Use Case**: Testing React components with dependencies

**Template**:
```typescript
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('Component', () => {
  it('should render with dependencies', () => {
    // Use DI instead of mocking
    renderWithServices(<Component />, {
      electronAPI: mockElectronAPI,
      // Inject other dependencies
    });

    // Test actual component behavior
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Pattern 3: Contract Test

**Use Case**: Testing IPC contracts between renderer and main

**Template**:
```typescript
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';

describe('IPC Contract', () => {
  it('should handle contract correctly', async () => {
    const { ipcMain, ipcRenderer } = createIpcPair();

    // Setup handler with real implementation
    setupHandlers(ipcMain, mockServices);

    // Invoke via renderer API
    const result = await ipcRenderer.invoke('domain:method', payload);

    // Verify contract
    expect(result.success).toBe(true);
  });
});
```

## Error Handling Strategies

### Strategy 1: Test-Specific Error Injection

**For testing error paths**:
```typescript
it('should handle error gracefully', async () => {
  // Inject error into mock dependency
  mockService.method.mockRejectedValue(new Error('Test error'));

  // Execute
  await expect(node(state, config)).rejects.toThrow('Test error');

  // Verify error handling
  expect(config.writer).toHaveBeenCalledWith({
    type: 'error',
    errorText: expect.any(String)
  });
});
```

### Strategy 2: Async Test Timeouts

**For tests with async operations**:
```typescript
it('should complete within timeout', async () => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 5000);
  });

  const testPromise = node(state, config);

  await expect(Promise.race([testPromise, timeoutPromise]))
    .resolves.toBeDefined();
}, 6000); // Jest/Vitest timeout
```

### Strategy 3: Cleanup After Tests

**To prevent test interference**:
```typescript
describe('Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  // Tests...
});
```

## Performance Considerations

### Optimizing Test Execution

1. **Parallel Execution**:
   - Vitest runs tests in parallel by default
   - Use `--run` flag for single run (faster)
   - Use `--reporter=verbose` for detailed output

2. **Targeted Testing**:
   - Use file-specific commands during development
   - Only run full suite in CI or final validation

3. **Mock Efficiency**:
   - Mock at boundaries, not internally
   - Reuse mocks across tests
   - Avoid complex setup in `beforeEach`

### Test Data Management

1. **Factory Pattern**:
   ```typescript
   const createMockState = (overrides = {}) => ({
     topic: 'JavaScript',
     messages: [],
     ...overrides
   });
   ```

2. **Shared Fixtures**:
   - Use test utilities for common data
   - Avoid duplicating test data setup

3. **Cleanup**:
   - Reset mocks after each test
   - Clear timers/intervals
   - Restore original implementations

## Testing Guidelines

### Do's ✅

- ✅ Use real utilities for stateless dependencies
- ✅ Mock stateful dependencies (LLM, database, API)
- ✅ Use `renderWithServices` for renderer tests
- ✅ Use `createIpcPair` for contract tests
- ✅ Provide clear test names and descriptions
- ✅ Test behavior, not implementation
- ✅ Use dependency injection pattern
- ✅ Keep tests isolated and independent

### Don'ts ❌

- ❌ Mock utilities like `createChunkEmitter`, `ChatPromptTemplate`
- ❌ Use manual mocks for Assistant UI
- ❌ Patch global objects or modules
- ❌ Share state between tests
- ❌ Test implementation details
- ❌ Use Jest globals in Vitest environment
- ❌ Leave mocks uncleaned
- ❌ Write tests that depend on other tests

## Migration Strategy

### Step 1: Identify (Audit)
- Find all `vi.mock` calls that mock utilities
- Find tests using manual mocks
- Identify Jest globals

### Step 2: Prioritize
- Critical path tests first (main process)
- High-failure-count files second
- Utility tests last

### Step 3: Migrate
- Apply patterns from this design
- One file at a time
- Validate after each change

### Step 4: Validate
- Run full test suite
- Verify DI compliance
- Check performance

### Step 5: Document
- Update testing guide
- Share patterns with team
- Add examples to codebase

## Future Considerations

### Potential Enhancements

1. **Test Data Factories**:
   - Centralized test data generation
   - Better maintainability
   - Consistent test scenarios

2. **Snapshot Testing**:
   - For stable UI components
   - Reduce assertion boilerplate
   - Catch unexpected changes

3. **Mutation Testing**:
   - Verify test effectiveness
   - Find gaps in test coverage
   - Improve test quality

4. **Performance Monitoring**:
   - Track test execution times
   - Identify slow tests
   - Optimize test suite

### Maintenance

1. **Regular Audits**:
   - Quarterly review of test patterns
   - Update utilities as needed
   - Remove deprecated approaches

2. **Team Training**:
   - Share DI patterns
   - Review test guidelines
   - Best practices workshops

3. **Tool Updates**:
   - Keep Vitest current
   - Update test utilities
   - Monitor for breaking changes

## Conclusion

This design establishes dependency injection as the primary testing pattern, replacing monkey patching and manual mocks. By using real utilities and injecting stateful dependencies, tests become more maintainable, reliable, and realistic.

The implementation follows a phased approach, starting with critical main process fixes and moving to renderer test refactoring. This ensures early wins while building toward comprehensive test quality improvement.

Success will be measured by 100% test pass rate, successful coverage reporting, and DI compliance across the entire test suite.
