# Eliminate Test Isolation Issues Through Dependency Injection

## Change ID
`eliminate-test-isolation-issues-with-di`

## Executive Summary

The Learning Catalyst project suffers from **flaky, non-deterministic tests** caused by poor test isolation practices. Tests pass/fail inconsistently across runs due to shared mock state, time-dependent logic, and module-scope monkey patching. This proposal eliminates test isolation issues by **mandating dependency injection patterns** and **banning module-scope mocking**.

### Current State

**Test Isolation Problems**:
- ❌ **Non-deterministic failures**: Same test passes in Run #1, fails in Run #2
- ❌ **Shared mock state**: Module-scope `vi.mock()` causes global contamination
- ❌ **Time-dependent tests**: `Date.now()` scattered throughout, causing race conditions
- ❌ **Message ID non-determinism**: `'m1'` expected, `'msg_1766478769663'` received
- ❌ **Async race conditions**: `waitFor` timeouts on network error handling
- ❌ **Workflow test flakiness**: LangGraph recursion errors appearing/disappearing between runs

**Test Failure Statistics**:
- Renderer: 25 failed files, 99 failed tests (765 passed)
- Main Process: 2 failed tests (LangGraph recursion)
- **Root Cause**: Test isolation violations, NOT logic bugs

### Proposed Solution

**Core Principle**: **Dependency Injection Over Monkey Patching**

1. **Ban module-scope `vi.mock()`** - Move all mocking inside test functions
2. **Inject dependencies as parameters** - Services, components, and utilities accept dependencies
3. **Control time deterministically** - Use `vi.setSystemTime()` consistently
4. **Clear state between tests** - Mandatory `beforeEach/afterEach` with `vi.clearAllMocks()`
5. **Factory pattern everywhere** - Create services with injected dependencies

**Benefits**:
- ✅ **Deterministic tests**: Pass consistently across multiple runs
- ✅ **No flakiness**: Each test isolated from others
- ✅ **Maintainable**: Clear dependencies, no hidden coupling
- ✅ **Fast**: No module re-initialization overhead
- ✅ **Aligned with Testing Guide**: Follows established DI patterns

### Architectural Changes

#### 1. Test Infrastructure Requirements
```typescript
// MANDATORY in every test file
describe('test suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
```

#### 2. Service Factory DI Pattern
```typescript
// ✅ Current (hard to test)
export const createChatService = (apiClient: ElectronAPI) => {
  return {
    sendMessage: async (...) => {
      return {
        id: data.messageId ?? `msg_${Date.now()}`, // ❌ Non-deterministic!
      };
    },
  };
};

// ✅ DI Refactor (testable)
interface ChatServiceOptions {
  idGenerator?: () => string;
  timeService?: { now: () => number };
}

export const createChatService = (
  apiClient: ElectronAPI,
  options: ChatServiceOptions = {}
) => {
  const generateId = options.idGenerator ?? (() => `msg_${options.timeService?.now() ?? Date.now()}`);

  return {
    sendMessage: async (...) => {
      return {
        id: data.messageId ?? generateId(), // ✅ Injected, testable
      };
    },
  };
};

// ✅ Test (no mocking needed!)
const service = createChatService(mockAPI, {
  idGenerator: () => 'm1',
});
```

#### 3. Component Props DI Pattern
```typescript
// ✅ Component accepts dependencies
interface ProviderStatusProps {
  configurationService: () => ConfigurationService;
}

export const ProviderStatus = ({ configurationService }: ProviderStatusProps) => {
  const config = configurationService();
  return <div>Status: {config.status}</div>;
};

// ✅ Test (direct injection, no vi.mock())
test('renders configuration status', () => {
  const mockConfig = { status: 'ready' };

  render(<ProviderStatus configurationService={() => mockConfig} />);

  expect(screen.getByText('Status: ready')).toBeInTheDocument();
});
```

### Phased Implementation

#### Phase 1: Emergency Test Isolation (2-3 hours)
**Priority**: P0 (Critical)
**Goal**: Make all tests deterministic within 1 run

1. Add mandatory `beforeEach/afterEach` cleanup to top 10 failing test files
2. Use `vi.setSystemTime()` for all time-dependent tests
3. Move module-scope `vi.mock()` inside test functions
4. Verify tests pass consistently (run 3x, pass 3x)

**Files**:
- `src/renderer/services/chat/__tests__/chat-service.test.ts`
- `src/renderer/features/discovery/ui/__tests__/LocalProjectExplorer.test.tsx`
- `src/renderer/features/config/ui/__tests__/UISettings.depth.test.tsx`
- `src/renderer/features/knowledge/ui/__tests__/KnowledgeGameMap.test.tsx`
- Plus 6 more critical test files

#### Phase 2: Service DI Refactoring (1-2 days)
**Priority**: P1 (High)
**Goal**: Inject dependencies into core services

1. **Chat Service**: Accept `idGenerator` and `timeService` dependencies
2. **Time Utilities**: Create injectable time service
3. **ID Generation**: Extract to injectable dependency
4. **Update Tests**: Use DI instead of mocking

**Files**:
- `src/renderer/services/chat/chat-service.ts`
- `src/renderer/utils/time-utils.ts` (new)
- `src/renderer/utils/id-generator.ts` (new)

#### Phase 3: Component DI Migration (2-3 days)
**Priority**: P1 (High)
**Goal**: Components accept dependencies as props

1. **Services Provider**: Convert to React Context DI
2. **Critical Components**: Accept service props
3. **Tests**: Use direct injection, no module mocking

**Files**:
- `src/renderer/services/services-provider.tsx`
- `src/renderer/features/discovery/ui/LocalProjectExplorer.tsx`
- `src/renderer/features/config/ui/ProviderStatus.tsx`

#### Phase 4: Validation & Coverage (1 day)
**Priority**: P0 (Critical)
**Goal**: Ensure 100% pass rate and coverage

1. Run complete test suite 3x - all must pass all 3 times
2. Verify test coverage >85%
3. Document DI patterns in Testing Guide
4. Create examples for future developers

### Success Criteria

**Immediate**:
- [ ] `npm run test:renderer` → 100% pass rate (864/864 tests)
- [ ] `npm run test:main` → 100% pass rate (1094/1094 tests)
- [ ] Tests deterministic (run 3x, pass 3x consistently)
- [ ] Zero module-scope `vi.mock()` calls

**Long-term**:
- [ ] All services use factory pattern with injectable dependencies
- [ ] All components accept dependencies via props/context
- [ ] Testing Guide updated with DI patterns
- [ ] Test coverage >85% overall, >90% for critical modules
- [ ] New tests automatically follow DI patterns (enforced by code review)

### Effort Estimate

- **Phase 1** (Emergency): 2-3 hours
- **Phase 2** (Service DI): 1-2 days
- **Phase 3** (Component DI): 2-3 days
- **Phase 4** (Validation): 1 day
- **Total**: 4-6 days

### Risk Assessment

**Low Risk**:
- Phase 1 is test infrastructure only (no production code changes)
- Tests provide safety net
- Reversible changes (can rollback if needed)

**Medium Risk**:
- Phase 2-3 modify service factories and components
- May require updates to production code usage

**Mitigation**:
- Execute Phase 1 first to establish baseline
- Use feature branches for each phase
- Validate after each phase before proceeding

### Alignment with Existing Specs

This proposal **extends and enforces** existing specifications:

1. **test-patterns spec** - Enforces `renderWithServices` and DI principles (this proposal adds isolation requirements)
2. **test-infrastructure spec** - Requires proper test setup (this proposal adds cleanup patterns)
3. **Testing Guide** - Recommends DI over mocking (this proposal makes it mandatory)

### Relationship to Previous Changes

This proposal **completes work** started by previous changes:

- `fix-renderer-test-failures-and-refactor` - Attempted mock fixes (this eliminates need for mocks)
- `fix-flaky-tests` - Tried to fix timing issues (this provides systematic solution)
- `eliminate-double-ipc-wrapping` - Improved IPC patterns (this improves test patterns)

This proposal provides the **architectural foundation** to prevent future test isolation issues.

### Why DI Over Mocking?

| Aspect | Module-Scope Mocking | Dependency Injection |
|--------|---------------------|---------------------|
| **Isolation** | ❌ Global state leaks | ✅ Each test isolated |
| **Determinism** | ❌ Order-dependent | ✅ Order-independent |
| **Speed** | ❌ Module re-initialization | ✅ No overhead |
| **Maintainability** | ❌ Must update mocks on changes | ✅ Works with refactoring |
| **Clarity** | ❌ Hidden dependencies | ✅ Clear dependencies |
| **Flakiness** | ❌ Pass/fail inconsistent | ✅ Always deterministic |

**DI makes tests simpler, faster, and more reliable!**
