# Fix Test Failures - Tasks

## Task Checklist

### Phase 1: Critical Main Process Fixes

#### T1.1: Remove Legacy Agent Manager Test
- [ ] **File**: `src/main/services/agent/__tests__/agent-manager-basic.test.ts`
- [ ] **Action**: Delete test file
- [ ] **Validation**: Run `npm run test:main` - should reduce failures by 18
- [ ] **Notes**: Tests non-existent architecture (agent-manager)
- [ ] **Rollback**: Restore file from git if needed

#### T1.2: Fix remediatePractice Test - Remove Mock
- [ ] **File**: `src/main/services/domain/workflow/subgraphs/practice/nodes/__tests__/remediatePractice-node.test.ts`
- [ ] **Action**: Remove `vi.mock` of `createChunkEmitter` (line 35-38)
- [ ] **Validation**: `npm run test:main:file -- remediatePractice-node.test.ts`
- [ ] **Expected**: Should fail with missing mock

#### T1.3: Fix remediatePractice Test - Use Real Utility
- [ ] **File**: Same as T1.2
- [ ] **Action**: Use real `createChunkEmitter` with injected `writer` mock
- [ ] **Implementation**:
  ```typescript
  // Remove mock, use real import
  import { createChunkEmitter } from '../../../utils/chunk-emitter';

  // Keep mock config with writer
  const createMockConfig = (): LangGraphRunnableConfig => ({
    writer: vi.fn(),
  } as any);

  // Update assertions
  expect(createMockConfig().writer).toHaveBeenCalledWith({
    type: 'text-start',
    id: expect.any(String)
  });
  ```
- [ ] **Validation**: Test should pass with real utility

#### T1.4: Fix Coverage Tool Version Mismatch
- [ ] **Command**: `npm install -D vitest@^4.0.0`
- [ ] **Action**: Update Vitest to match coverage provider version
- [ ] **Validation**: `npm run test:coverage` should work
- [ ] **Alternative**: Downgrade coverage if update causes issues

#### T1.5: Validate Main Process Fixes
- [ ] **Command**: `npm run test:main 2>&1 | grep -A 5 "Test Files"`
- [ ] **Expected**: All main process tests passing
- [ ] **Metrics**: 43/43 tests passing (100%)

---

### Phase 2: Renderer Tests Refactor

#### T2.1: Audit Assistant UI Tests
- [ ] **Command**: `grep -r "vi.mock.*@assistant-ui/react" src/renderer --include="*.test.tsx"`
- [ ] **Action**: List all files using manual Assistant UI mocks
- [ ] **Target Files**:
  - [ ] `src/renderer/widgets/layout/__tests__/ThreadListSidebar.test.tsx`
  - [ ] `src/renderer/shared/ui/__tests__/SidebarTrigger.test.tsx`
  - [ ] Others identified in audit
- [ ] **Output**: List of files to refactor

#### T2.2: Refactor ThreadListSidebar Tests
- [ ] **File**: `src/renderer/widgets/layout/__tests__/ThreadListSidebar.test.tsx`
- [ ] **Action**: Replace manual mocks with `renderWithServices`
- [ ] **Implementation**:
  ```typescript
  // Remove manual vi.mock of @assistant-ui/react
  // Use:
  import { renderWithServices } from '@/test/utils/renderWithServices';

  renderWithServices(<ThreadListSidebar open={true} />, {
    electronAPI: mockElectronAPI,
  });
  ```
- [ ] **Validation**: `npm run test:renderer:file -- ThreadListSidebar.test.tsx`
- [ ] **Expected**: 24 passing tests (currently failing)

#### T2.3: Fix ErrorBoundary Tests
- [ ] **File**: `src/renderer/shared/ui/__tests__/ErrorBoundary.test.tsx`
- [ ] **Issues**: Cross-environment rendering, text assertions
- [ ] **Action**: Use `renderWithServices` for proper DI
- [ ] **Validation**: Test passes with actual ErrorBoundary component
- [ ] **Notes**: Don't mock ErrorBoundary, test real implementation

#### T2.4: Replace Jest with Vitest
- [ ] **Command**: `grep -r "jest\." src/renderer --include="*.test.tsx" | head -20`
- [ ] **Action**: Replace all Jest globals with Vitest
- [ ] **Replacements**:
  - `jest.fn()` → `vi.fn()`
  - `jest.mock()` → `vi.mock()`
  - `vi.restoreAllMocks()` → `vi.clearAllMocks()`
- [ ] **Files to Check**:
  - All `*.test.tsx` files
  - All `*.test.ts` files
- [ ] **Validation**: No "jest is not defined" errors

#### T2.5: Fix Service Integration Tests
- [ ] **Target**: `src/renderer/services/concept-parsing/__tests__/concept-parsing-service.success.test.ts`
- [ ] **Issues**: Timeout (1018ms), async handling
- [ ] **Action**: Fix async/await patterns, increase timeouts if needed
- [ ] **Validation**: Tests complete without timeout
- [ ] **Target**: `src/renderer/services/chat/__tests__/chat-service.cancel.test.ts`
- [ ] **Action**: Fix stream cancellation test
- [ ] **Validation**: Test passes

#### T2.6: Fix History Loading Tests
- [ ] **File**: `src/renderer/pages/chat/__tests__/history-loading-bug.test.tsx`
- [ ] **Issues**: Session management, message loading
- [ ] **Action**: Fix session switching and checkpoint integration
- [ ] **Validation**: All 6 tests pass

#### T2.7: Fix Knowledge Game Map Tests
- [ ] **File**: `src/renderer/features/knowledge/ui/__tests__/KnowledgeGameMap.test.tsx`
- [ ] **Issues**: Graph rendering, network errors
- [ ] **Action**: Fix component lifecycle and error handling
- [ ] **Validation**: All 3 tests pass

#### T2.8: Validate Renderer Tests
- [ ] **Command**: `npm run test:renderer 2>&1 | grep -A 5 "Test Files"`
- [ ] **Expected**: All renderer tests passing
- [ ] **Metrics**: 834/834 tests passing (100%)

---

### Phase 3: Full Validation

#### T3.1: Run Complete Test Suite
- [ ] **Command**: `npm run test:complete`
- [ ] **Expected Output**:
  ```
  Main: 43/43 passed (100%)
  Renderer: 834/834 passed (100%)
  Integration: 2/2 passed (100%)
  ```
- [ ] **All Tests**: 879/879 passed (100%)

#### T3.2: Generate Coverage Report
- [ ] **Command**: `npm run test:coverage`
- [ ] **Expected**: Report generates successfully
- [ ] **Metrics**: Overall >80% coverage
- [ ] **Files**: Coverage reports in `coverage/` directory

#### T3.3: DI Compliance Audit
- [ ] **Command**: `grep -r "vi.mock.*chunk-emitter" src/ --include="*.test.ts"`
- [ ] **Expected**: No results (all tests use real utilities)
- [ ] **Command**: `grep -r "vi.mock.*ChatPromptTemplate" src/ --include="*.test.ts"`
- [ ] **Expected**: No results (stateless utilities not mocked)

#### T3.4: Test Execution Performance
- [ ] **Command**: Time `npm run test:complete`
- [ ] **Expected**: < 2 minutes total execution
- [ ] **Metrics**:
  - Main: < 30 seconds
  - Renderer: < 90 seconds
  - Integration: < 10 seconds

#### T3.5: Update Documentation
- [ ] **File**: `docs/DEVELOPER-GUIDE/testing.md`
- [ ] **Action**: Add DI pattern examples
- [ ] **Content**:
  - Example: Testing workflow nodes with real utilities
  - Example: Using `renderWithServices` for renderer tests
  - Anti-pattern: Don't mock stateless utilities
- [ ] **Validation**: Documentation matches implemented patterns

---

### Post-Implementation Tasks

#### T4.1: Monitor CI/CD
- [ ] **Action**: Verify tests pass in CI environment
- [ ] **Check**: GitHub Actions, Jenkins, or other CI
- [ ] **Duration**: Monitor for 1 week after merge

#### T4.2: Developer Experience
- [ ] **Action**: Verify `npm run test:renderer:ui` works
- [ ] **Action**: Verify `npm run test:main:ui` works
- [ ] **Action**: Test targeted file commands work
- [ ] **Feedback**: Collect team feedback on test experience

#### T4.3: Performance Baseline
- [ ] **Action**: Establish baseline metrics
- [ ] **Metrics**:
  - Test execution time
  - Coverage percentages
  - Flaky test count
- [ ] **Goal**: Zero flaky tests, stable metrics

---

## Parallelization Opportunities

These tasks can be done in parallel:

- **T1.1** (Remove legacy test) - Independent
- **T1.4** (Fix coverage tool) - Independent
- **T2.1** (Audit Assistant UI) - Independent

These tasks should be done sequentially:

- **T1.2** → **T1.3** (remediatePractice fix)
- **T2.2** → **T2.3** → **T2.4** (renderer refactor)
- **T2.5** → **T2.6** → **T2.7** (service tests)
- **T3.1** → **T3.2** → **T3.3** (validation)

## Success Metrics

### Quantitative
- [ ] **Test Pass Rate**: 100% (879/879)
- [ ] **Coverage**: >80% overall
- [ ] **Execution Time**: < 2 minutes
- [ ] **Flaky Tests**: 0

### Qualitative
- [ ] **DI Compliance**: All tests use dependency injection
- [ ] **Maintainability**: Tests follow clear patterns
- [ ] **Developer Experience**: Easy to run, debug, and add tests
- [ ] **Documentation**: Clear guidance for writing tests

## Rollback Plan

If issues arise:

1. **Revert Coverage Tool**: `git checkout HEAD -- package*.json && npm install`
2. **Restore Legacy Test**: `git checkout HEAD -- src/main/services/agent/__tests__/agent-manager-basic.test.ts`
3. **Revert Renderer Changes**: `git checkout HEAD -- src/renderer/...`
4. **Revert Main Process Changes**: `git checkout HEAD -- src/main/...`

Note: Rollback should only be needed if critical production issues arise. Test fixes should not affect production code.

## Validation Commands

Use these commands to validate progress:

```bash
# Check specific test file
npm run test:main:file -- <file>
npm run test:renderer:file -- <file>

# Check all main tests
npm run test:main 2>&1 | grep -A 5 "Test Files"

# Check all renderer tests
npm run test:renderer 2>&1 | grep -A 5 "Test Files"

# Check coverage
npm run test:coverage 2>&1 | tail -20

# Full validation
npm run test:complete
```
