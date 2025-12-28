# test-infrastructure Specification

## Purpose
TBD - created by archiving change fix-test-failures. Update Purpose after archive.
## Requirements
### Requirement: All Tests Use Dependency Injection Pattern

All test files MUST use dependency injection pattern where stateful dependencies are mocked and stateless utilities are used directly.

**Priority**: P0 (Critical)
**Effort**: XL

#### Scenario: Workflow Node Tests Use Real Utilities
**Given** a workflow node test file
**When** the test imports and uses `createChunkEmitter`
**Then** the test MUST import the real utility, not mock it
**And** the test MUST inject `config.writer` as a mock function
**And** assertions MUST verify the injected mock was called

**Implementation**:
```typescript
// ✅ CORRECT
import { createChunkEmitter } from '../../../utils/chunk-emitter';

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

const config = createMockConfig();
await node(state, config);
expect(config.writer).toHaveBeenCalled();

// ❌ INCORRECT - VIOLATION
vi.mock('../../../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn(() => mockEmitter)
}));
```

**Files Affected**:
- `src/main/services/domain/workflow/subgraphs/practice/nodes/__tests__/circuitBreaker.test.ts`

#### Scenario: Workflow Tests Have Mock Isolation
**Given** a workflow test file
**When** tests execute
**Then** the file MUST have `vi.clearAllMocks()` in beforeEach block
**And** each test MUST start with clean mock state
**And** test execution order MUST NOT affect results

**Implementation**:
```typescript
// ✅ CORRECT
describe('workflow tests', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // REQUIRED
  });

  it('test 1', () => { /* fresh mocks */ });
  it('test 2', () => { /* fresh mocks */ });
});

// ❌ INCORRECT - VIOLATION
describe('workflow tests', () => {
  it('test 1', () => { /* uses mocks */ });
  it('test 2', () => { /* polluted by test 1 */ });
});
```

**Files Affected**:
- All workflow test files in `src/main/services/domain/workflow/`
- Specifically: circuitBreaker.test.ts, gradeQuiz-node.test.ts, edges-routing.test.ts

#### Scenario: Renderer Tests Use renderWithServices
**Given** a React component test file
**When** testing components with dependencies
**Then** the test MUST use `renderWithServices` for DI
**And** MUST NOT use manual `vi.mock` for dependencies
**And** MUST inject `electronAPI` and other dependencies

**Implementation**:
```typescript
// ✅ CORRECT
import { renderWithServices } from '@/test/utils/renderWithServices';

renderWithServices(<Component />, {
  electronAPI: mockElectronAPI,
});

// ❌ INCORRECT
vi.mock('@assistant-ui/react', () => ({
  ThreadListPrimitive: { ...mock }
}));
```

#### Scenario: Contract Tests Use createIpcPair
**Given** an IPC contract test
**When** testing renderer ↔ main communication
**Then** the test MUST use `createIpcPair` utility
**And** MUST NOT manually mock IPC channels
**And** MUST test actual contract behavior

**Implementation**:
```typescript
// ✅ CORRECT
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';

const { ipcMain, ipcRenderer } = createIpcPair();
setupHandlers(ipcMain, mockServices);
const result = await ipcRenderer.invoke('domain:method', payload);

// ❌ INCORRECT
vi.mock('electron', () => ({
  ipcRenderer: { invoke: vi.fn() }
}));
```

#### Scenario: Interrupt Nodes Tested with StateGraph Streaming
**Given** a workflow node that calls `interrupt()`
**When** testing interrupt behavior
**Then** the test MUST use a compiled StateGraph
**And** MUST use `streamMode: 'updates'` to capture events
**And** MUST NOT call the node directly

**Implementation**:
```typescript
// ✅ CORRECT
import { StateGraph, MemorySaver, START, END } from '@langchain/langgraph';

const graph = new StateGraph(PracticeAnnotation)
  .addNode('node', interruptNode(deps))
  .addEdge(START, 'node')
  .addEdge('node', END)
  .compile({ checkpointer: new MemorySaver() });

const stream = await graph.stream(initialState, {
  configurable: { thread_id: 'test' },
  streamMode: 'updates' as const,
});

for await (const evt of stream) {
  if (isInterruptEvent(evt)) {
    const value = extractInterrupt(evt);
    expect(value.type).toBe('expected-type');
  }
}

// ❌ INCORRECT - VIOLATION
const result = await interruptNode(deps)(state);
expect(interrupt).toHaveBeenCalled(); // interrupt() doesn't work here!
```

**Files Affected**:
- `src/main/services/domain/workflow/subgraphs/teach/__tests__/handleQuestion-node.test.ts`

### Requirement: No Mocking of Stateless Utilities

Tests MUST NOT mock utilities that are stateless and provide pure functions.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: chunk-emitter Utility Not Mocked
**Given** a test that uses `createChunkEmitter`
**When** the test executes
**Then** the test MUST use the real implementation
**And** MUST NOT have `vi.mock` for `chunk-emitter` module
**And** MUST provide mock `config.writer` for injection

**Validation**:
```bash
grep -r "vi.mock.*chunk-emitter" src/ --include="*.test.ts"
# Expected: No results - VIOLATION if found
```

**Files Affected**:
- `src/main/services/domain/workflow/subgraphs/practice/nodes/__tests__/circuitBreaker.test.ts`

#### Scenario: ChatPromptTemplate Not Mocked
**Given** a test that uses LangChain prompts
**When** testing prompt construction
**Then** the test MUST use real `ChatPromptTemplate`
**And** MUST NOT mock the prompt module

**Validation**:
```bash
grep -r "vi.mock.*prompt" src/ --include="*.test.ts"
# Expected: No results (or minimal for specific reasons)
```

### Requirement: Legacy Test File Removal

The legacy agent-manager test file MUST be removed as it tests non-existent architecture.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Agent Manager Test File Deleted
**Given** the codebase
**When** the test suite runs
**Then** `src/main/services/agent/__tests__/agent-manager-basic.test.ts` MUST NOT exist
**And** running tests MUST NOT show errors for missing module

**Implementation**:
```bash
rm src/main/services/agent/__tests__/agent-manager-basic.test.ts
```

#### Scenario: Agent Directory Cleanup
**Given** the agent test directory
**When** after removing test files
**Then** empty `__tests__` directories SHOULD be removed
**And** the file structure MUST remain clean

### Requirement: Vitest Globals Only

All test files MUST use Vitest globals, not Jest globals.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: No Jest Globals
**Given** a test file
**When** the file is executed
**Then** it MUST NOT reference `jest` global object
**And** MUST use `vi` from Vitest instead

**Implementation**:
```typescript
// ✅ CORRECT
import { vi } from 'vitest';
const mockFn = vi.fn();

// ❌ INCORRECT
const mockFn = jest.fn();
```

**Validation**:
```bash
grep -r "jest\." src/ --include="*.test.ts" --include="*.test.tsx"
# Expected: No results
```

#### Scenario: Proper Mock Functions
**Given** test files creating mock functions
**When** mocks are needed
**Then** they MUST use `vi.fn()` not `jest.fn()`

**Replacements**:
- `jest.fn()` → `vi.fn()`
- `jest.mock()` → `vi.mock()`
- `vi.restoreAllMocks()` → `vi.clearAllMocks()`

### Requirement: Coverage Infrastructure Fixed

Test coverage MUST generate successfully with consistent tool versions.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Vitest Version Match
**Given** the test dependencies
**When** coverage is generated
**Then** Vitest and @vitest/coverage-v8 versions MUST be compatible
**And** running `npm run test:coverage` MUST succeed

**Implementation**:
```bash
npm install -D vitest@^4.0.0
# Or
npm install -D @vitest/coverage-v8@^3.0.0
```

#### Scenario: Coverage Report Generated
**Given** test suite runs with coverage
**When** `npm run test:coverage` executes
**Then** it MUST generate HTML and JSON reports
**And** overall coverage MUST be >80%

**Validation**:
```bash
npm run test:coverage
# Expected: Success with report in coverage/ directory
ls coverage/
# Expected: index.html, final.json, etc.
```

### Requirement: 100% Test Pass Rate

All tests MUST pass after fixes are applied.

**Priority**: P0 (Critical)
**Effort**: XL

#### Scenario: Main Process Tests All Pass
**Given** main process test suite
**When** `npm run test:main` executes
**Then** all tests MUST pass
**And** results MUST be consistent across multiple runs
**And** execution order MUST NOT affect pass/fail

**Metrics**:
- Passed: 1076/1076 (100%)
- Failed: 0
- Flaky: 0 (order-independent)

**Validation**:
```bash
# Run multiple times to verify stability
for i in {1..5}; do
  npm run test:main
  if [ $? -ne 0 ]; then
    echo "FAILED on iteration $i"
    exit 1
  fi
done
echo "All runs passed - tests are stable"
```

#### Scenario: Renderer Tests All Pass
**Given** renderer test suite
**When** `npm run test:renderer` executes
**Then** all 834 tests MUST pass
**And** all 31 previously failing files MUST pass

**Metrics**:
- Passed: 834/834 (100%)
- Failed: 0
- Skipped: 0 (or minimal, justified)

#### Scenario: Integration Tests All Pass
**Given** integration test suite
**When** `npm run test:integration` executes
**Then** all tests MUST continue to pass
**And** no regressions introduced

**Metrics**:
- Passed: 2/2 (100%)
- Failed: 0

#### Scenario: Complete Test Suite Passes
**Given** all test suites
**When** `npm run test:complete` executes
**Then** the result MUST show 100% pass rate
**And** no test file MAY have order-dependent failures

**Metrics**:
- Total: 100% passed
- Main: 100%
- Renderer: 100%
- Integration: 100%


