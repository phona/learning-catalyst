# Test Infrastructure - Specification Delta

## Purpose
Define requirements for fixing 138 failing tests by establishing Dependency Injection as the primary testing pattern, replacing monkey patching and manual mocks.

## ADDED Requirements

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

const result = await node(state, createMockConfig());
expect(createMockConfig().writer).toHaveBeenCalled();

// ❌ INCORRECT
vi.mock('../../../utils/chunk-emitter', () => ({
  createChunkEmitter: vi.fn(() => mockEmitter)
}));
```

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

### Requirement: No Mocking of Stateless Utilities

Tests MUST NOT mock utilities that are stateless and provide pure functions.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: chunk-emitter Utility Not Mocked
**Given** a test that uses `createChunkEmitter`
**When** the test executes
**Then** the test MUST use the real implementation
**And** MUST NOT have `vi.mock` for `chunk-emitter` module

**Validation**:
```bash
grep -r "vi.mock.*chunk-emitter" src/ --include="*.test.ts"
# Expected: No results
```

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
**Then** all 43 tests MUST pass
**And** no tests MUST be skipped (except intentionally)

**Metrics**:
- Passed: 43/43 (100%)
- Failed: 0
- Skipped: 0 (or minimal, justified)

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
**And** execution time SHOULD be < 2 minutes

**Metrics**:
- Total: 879/879 passed (100%)
- Main: 43/43
- Renderer: 834/834
- Integration: 2/2

## MODIFIED Requirements

### Modified Requirement: Test Organization

**From**: Tests can use any mocking strategy
**To**: Tests MUST use dependency injection pattern

**Rationale**: Enforce consistency and maintainability

**Impact**:
- All test files must be refactored
- Test utilities must be properly used
- Developer training required

### Modified Requirement: Test Utilities Usage

**From**: Manual mocks are acceptable
**To**: Official test utilities MUST be used

**Rationale**: Standardize testing approach

**Impact**:
- `renderWithServices` required for renderer tests
- `createIpcPair` required for contract tests
- Manual mocks prohibited

### Modified Requirement: Test Dependencies

**From**: Version mismatches acceptable
**To**: Test tooling versions MUST be compatible

**Rationale**: Reliable test execution

**Impact**:
- Vitest and coverage provider versions aligned
- No version conflicts
- Consistent behavior

## REMOVED Requirements

### Removed Requirement: Manual Mocking Allowed

**Rationale**: Replaced with dependency injection pattern

**Replacement**: Tests must use DI pattern (see ADDED requirements)

### Removed Requirement: Legacy Architecture Tests

**Rationale**: Agent manager architecture removed

**Replacement**: Tests for current ProviderFactory pattern

## Implementation Notes

### Files Affected

**Main Process**:
- `src/main/services/agent/__tests__/agent-manager-basic.test.ts` (REMOVED)
- `src/main/services/domain/workflow/subgraphs/practice/nodes/__tests__/remediatePractice-node.test.ts` (MODIFIED)

**Renderer** (31 files):
- `src/renderer/widgets/layout/__tests__/ThreadListSidebar.test.tsx`
- `src/renderer/shared/ui/__tests__/ErrorBoundary.test.tsx`
- `src/renderer/shared/ui/__tests__/SidebarTrigger.test.tsx`
- `src/renderer/services/concept-parsing/__tests__/`
- `src/renderer/services/chat/__tests__/`
- `src/renderer/pages/chat/__tests__/`
- `src/renderer/features/knowledge/ui/__tests__/`
- Others identified in audit

**Infrastructure**:
- `package.json` (Vitest version update)
- Test configuration files

### Validation Commands

```bash
# Check test pass rate
npm run test:complete 2>&1 | grep "Test Files"

# Check coverage
npm run test:coverage 2>&1 | tail -20

# DI compliance
grep -r "vi.mock.*chunk-emitter" src/ --include="*.test.ts"
# Expected: No results

# Jest globals check
grep -r "jest\." src/ --include="*.test.ts" --include="*.test.tsx"
# Expected: No results
```

### Rollback Strategy

If issues arise:

1. Revert package.json: `git checkout HEAD -- package*.json && npm install`
2. Restore test files: `git checkout HEAD -- src/...`
3. Verify tests return to previous state

**Note**: Rollback should only be used for critical production issues, not test failures.

## Dependencies

- Test utilities (`renderWithServices`, `createIpcPair`)
- Vitest v4.0.0
- @vitest/coverage-v8 v4.0.0+
- Assistant UI library
- LangChain/LangGraph testing patterns

## Related Capabilities

- `render-safety-testing` - Error boundary patterns
- `renderer-structure` - Component testing
- `ipc-contract-testing` - Contract test patterns

## Acceptance Criteria

All requirements MUST be met:

- [ ] 100% test pass rate (879/879)
- [ ] Coverage generates successfully
- [ ] No mocking of stateless utilities
- [ ] All tests use DI pattern
- [ ] No Jest globals
- [ ] Legacy test file removed
- [ ] Test execution < 2 minutes
- [ ] Documentation updated

## Priority Definitions

- **P0 (Critical)**: Must fix for basic functionality
- **P1 (High)**: Important for quality
- **P2 (Medium)**: Nice to have
- **P3 (Low)**: Future consideration

## Effort Definitions

- **S**: < 1 day
- **M**: 1-3 days
- **L**: 3-5 days
- **XL**: > 5 days
