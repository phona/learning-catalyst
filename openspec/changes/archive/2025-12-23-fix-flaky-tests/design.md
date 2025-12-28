# Fix Flaky Tests - Design Document

## Architectural Reasoning

### Root Cause Analysis

The flaky test failures stem from **three core violations** of the test-infrastructure specification:

#### 1. Violation: Mocking Stateless Utilities
**Problem**: Tests mock `chunk-emitter` utility using `vi.mock()`
**Impact**: Creates mock pollution when multiple tests mock the same module
**Spec Violation**: test-infrastructure §2.1 (No Mocking of Stateless Utilities)

```typescript
// ❌ WRONG - Current circuitBreaker test
vi.mock('../../../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn(() => mockEmitter)
}));
```

**Why This Fails**:
- Module caching causes mocks to persist across test files
- Different test files define different mock implementations
- When tests run together, last mock wins, breaking earlier tests
- Creates order-dependent failures

#### 2. Violation: Direct Interrupt Node Calls
**Problem**: Tests call interrupt nodes directly instead of using StateGraph
**Impact**: `interrupt()` cannot work outside graph context, causes test failures
**Spec Violation**: Testing guide §4.4 (Interrupt Testing Pattern)

```typescript
// ❌ WRONG - Current handleQuestion test
const result = await node(state, config); // Node calls interrupt()
expect(interrupt).toHaveBeenCalled(); // Fails - interrupt() doesn't work here
```

**Why This Fails**:
- `interrupt()` is a LangGraph control flow mechanism
- Must be called within a compiled StateGraph with checkpointer
- Direct node calls bypass graph runtime
- Tests need to use `graph.stream()` with `streamMode: 'updates'`

#### 3. Violation: Missing Test Isolation
**Problem**: No `vi.clearAllMocks()` in beforeEach
**Impact**: Mock state leaks between tests
**Spec Violation**: test-infrastructure §1.1 (Dependency Injection Pattern)

```typescript
// ❌ WRONG - Missing isolation
describe('workflow tests', () => {
  it('test 1', () => {
    mockFn.mockReturnValue('value1');
  });
  it('test 2', () => {
    mockFn(); // Still has 'value1' from test 1!
  });
});
```

**Why This Fails**:
- Vitest doesn't automatically reset mocks between tests
- Previous test state pollutes subsequent tests
- Creates intermittent failures based on execution order

---

## Solution Design

### Pattern 1: Real Utility + Mock Injection (DI Pattern)

**Implementation**:
```typescript
// ✅ CORRECT - circuitBreaker test fix
import { createChunkEmitter } from '../../../utils/chunk-emitter'; // Real import

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(), // Mock only the writer function
} as any);

describe('circuitBreakerNode', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Isolate each test
  });

  it('streams message via emitter', async () => {
    const config = createMockConfig();
    await node(state, config);

    // Verify the real chunk-emitter called our mock writer
    expect(config.writer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text-start' })
    );
  });
});
```

**Why This Works**:
- Real `createChunkEmitter` maintains correct implementation
- Only `writer` function is mocked (stateful dependency)
- No module-level mocks = no pollution
- Follows DI pattern from spec

### Pattern 2: StateGraph Streaming for Interrupts

**Implementation**:
```typescript
// ✅ CORRECT - handleQuestion test fix
import { StateGraph, MemorySaver, START, END } from '@langchain/langgraph';
import { isInterruptEvent, extractInterrupt } from '../../../interrupt';

describe('handleQuestion node', () => {
  it('should use interrupt to wait for follow-up', async () => {
    const graph = new StateGraph(PracticeAnnotation)
      .addNode('handleQuestion', handleQuestionNode(mockDeps))
      .addEdge(START, 'handleQuestion')
      .addEdge('handleQuestion', END)
      .compile({ checkpointer: new MemorySaver() });

    // Use streaming mode to capture interrupt events
    const stream = await graph.stream(
      initialState,
      {
        configurable: { thread_id: 'test-thread' },
        streamMode: 'updates' as const,
      }
    );

    let gotInterrupt = false;
    for await (const evt of stream) {
      if (isInterruptEvent(evt)) {
        gotInterrupt = true;
        const interruptValue = extractInterrupt(evt);
        expect(interruptValue.type).toBe('teach_followup');
        break;
      }
    }

    expect(gotInterrupt).toBe(true);
  });
});
```

**Why This Works**:
- StateGraph provides proper runtime for `interrupt()`
- `streamMode: 'updates'` exposes interrupt events
- `isInterruptEvent` and `extractInterrupt` safely handle events
- No direct node calls = no runtime violations

### Pattern 3: Consistent Mock Isolation

**Implementation**:
```typescript
// ✅ CORRECT - All workflow tests
describe('workflow tests', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset ALL mocks before each test
  });

  it('test 1', () => {
    mockFn.mockReturnValue('value1');
    // Test logic
  });

  it('test 2', () => {
    mockFn(); // Fresh mock, no pollution from test 1
  });
});
```

**Why This Works**:
- `vi.clearAllMocks()` resets all mock call history
- Each test starts with clean slate
- No order-dependent failures
- Consistent with spec §1.1

---

## Trade-offs and Decisions

### Decision 1: Real Utilities vs. Complete Mocking
**Options**:
- A. Mock everything (current, broken)
- B. Use real utilities with injected mocks (proposed)

**Choice**: B
**Rationale**:
- Real utilities catch implementation bugs
- Only stateful dependencies need mocking
- Follows established DI pattern
- Aligns with test-infrastructure spec

**Risk**: Minimal - utilities are stateless, pure functions
**Mitigation**: Mock only `writer`, `config`, etc. where needed

### Decision 2: StateGraph Streaming vs. Direct Calls
**Options**:
- A. Call nodes directly (current, broken)
- B. Use StateGraph streaming (proposed)

**Choice**: B
**Rationale**:
- `interrupt()` requires graph runtime
- Streaming is documented pattern in testing guide
- Catches real integration issues
- More realistic test scenario

**Risk**: Test complexity increases
**Mitigation**: Reuse patterns from existing working tests (askQuestion-node.test.ts)

### Decision 3: Global vi.clearAllMocks vs. Selective
**Options**:
- A. Add to all test files (proposed)
- B. Add only to failing tests

**Choice**: A
**Rationale**:
- Prevents future flaky tests
- Consistent pattern across suite
- Minimal effort for maximum benefit
- Defensive programming

**Risk**: None - clearing mocks is safe and fast
**Cost**: 30 minutes to update 15-20 files

---

## Validation Strategy

### Multi-Level Validation

1. **Unit Level**: Each fixed test passes in isolation
   ```bash
   npm run test:main:file -- <specific-test-file>
   ```

2. **Suite Level**: All tests in main/renderer pass
   ```bash
   npm run test:main
   npm run test:renderer
   ```

3. **Integration Level**: Cross-process tests pass
   ```bash
   npm run test:integration
   ```

4. **Order Independence**: Multiple runs in different orders
   ```bash
   # Run multiple times
   for i in {1..5}; do npm run test:main; done
   ```

5. **Complete Suite**: Full validation
   ```bash
   npm run test:complete
   ```

### Success Metrics
- **0 failing tests** across all suites
- **Consistent results** across multiple runs
- **No mock violations** detected by grep
- **Test execution time** remains < 15 seconds

---

## Future Prevention

### Pattern Enforcement
1. **Linting**: Add ESLint rule to detect `vi.mock` for chunk-emitter
2. **Code Review**: Check for proper DI pattern in new tests
3. **Testing Guide**: Add examples for common patterns
4. **Template**: Use existing working tests as templates

### Continuous Validation
1. **CI Pipeline**: Run tests in random order
2. **Pre-commit Hook**: Validate test patterns
3. **Test Coverage**: Ensure new code has tests following patterns

---

## References

- `openspec/specs/test-infrastructure/spec.md` - Core requirements
- `docs/DEVELOPER-GUIDE/testing.md` - Testing best practices
- `src/main/services/domain/workflow/nodes/__tests__/askQuestion-node.test.ts` - Working interrupt example
- `src/main/services/domain/workflow/utils/__tests__/chunk-emitter.test.ts` - Real chunk-emitter usage
