# Fix Test Failures - Proposal

## Change ID
`fix-test-failures`

## Executive Summary

The test suite currently has **138 failing tests** across main process and renderer, with critical issues preventing proper validation of the codebase. This change proposes to fix all failing tests by:

1. **Main Process (4 failures)**:
   - Remove legacy agent-manager test file (18 tests)
   - Fix remediatePractice node test using proper DI pattern (3 tests)

2. **Renderer (134 failures)**:
   - Refactor Assistant UI tests to use `renderWithServices` DI pattern
   - Fix ErrorBoundary test environment issues
   - Replace Jest globals with Vitest
   - Fix service integration tests

3. **Coverage Infrastructure**:
   - Resolve Vitest/coverage provider version mismatch
   - Enable coverage reporting

## Problem Statement

### Current Test State
- **Main Process**: 39/43 tests passing (90.7%)
- **Renderer**: 700/834 tests passing (83.9%)
- **Integration**: 2/2 tests passing ✅
- **Coverage**: Failed (version mismatch)

### Root Causes Identified

1. **Dependency Injection Anti-Patterns**:
   - Tests mock stateless utilities (e.g., `createChunkEmitter`)
   - Tests use monkey patching instead of dependency injection
   - Violates principle: "Mock stateful, use real stateless"

2. **Legacy Architecture Tests**:
   - `agent-manager-basic.test.ts` tests non-existent architecture
   - Agent system migrated to ProviderFactory pattern

3. **Missing Test Utilities Usage**:
   - Tests use manual mocks instead of `renderWithServices`
   - Tests don't use `createIpcPair` for contract testing
   - Tests use Jest globals instead of Vitest

4. **Infrastructure Issues**:
   - Vitest v3.2.4 vs @vitest/coverage-v8 v4.0.16 mismatch
   - Coverage generation blocked

## Goals & Success Criteria

### Functional Goals
- [ ] **100% test pass rate** across all suites (main, renderer, integration)
- [ ] **Coverage reporting** generates successfully
- [ ] **No monkey patching** in tests
- [ ] **All tests use DI pattern** (mock stateful, use real stateless)

### Quality Goals
- [ ] Tests validate actual implementation, not mocks
- [ ] Tests are maintainable and follow established patterns
- [ ] Test infrastructure is stable and reliable
- [ ] Developer experience improved with proper utilities

### Technical Goals
- [ ] All workflow node tests use real utilities
- [ ] All renderer tests use `renderWithServices`
- [ ] All contract tests use `createIpcPair`
- [ ] Version consistency across test tooling

## Proposed Solution

### Phase 1: Critical Main Process Fixes

**Target**: 4 failing tests

1. **Remove Legacy Test File**
   - Delete `src/main/services/agent/__tests__/agent-manager-basic.test.ts`
   - Remove entire `__tests__` directory if empty
   - Rationale: Tests non-existent architecture

2. **Fix remediatePractice Test with DI**
   - Remove `vi.mock` of `createChunkEmitter` (stateless utility)
   - Use real `createChunkEmitter` with injected `writer` mock
   - Update assertions to verify `writer` calls
   - Follow pattern from `assess-node.test.ts`

### Phase 2: Renderer Tests Refactor

**Target**: 134 failing tests

1. **Assistant UI Tests**
   - Replace manual `@assistant-ui/react` mocks with `renderWithServices`
   - Use injected `electronAPI` instead of window patching
   - Focus on `ThreadListSidebar.test.tsx` (29 failures)

2. **ErrorBoundary Tests**
   - Ensure proper environment setup
   - Use `renderWithServices` for DI
   - Fix cross-environment rendering

3. **Service Integration Tests**
   - Fix `concept-parsing-service` tests (timeout issues)
   - Fix `chat-service` tests (async handling)
   - Fix `history-loading` tests (session management)

4. **Replace Jest with Vitest**
   - Replace `jest.fn()` with `vi.fn()`
   - Replace `jest.mock()` with `vi.mock()`
   - Replace `vi.restoreAllMocks()` with `vi.clearAllMocks()`

### Phase 3: Coverage Infrastructure

1. **Fix Version Mismatch**
   - Update Vitest to v4: `npm install -D vitest@^4.0.0`
   - Or downgrade coverage: `npm install -D @vitest/coverage-v8@^3.0.0`
   - Recommendation: Update Vitest for latest features

2. **Validate Coverage**
   - Run `npm run test:coverage`
   - Verify report generation
   - Confirm >80% coverage in critical areas

## Impact Assessment

### Affected Components

**Main Process**:
- `src/main/services/agent/` - Remove test directory
- `src/main/services/domain/workflow/subgraphs/practice/nodes/__tests__/remediatePractice-node.test.ts` - Fix DI pattern
- Coverage infrastructure

**Renderer**:
- `src/renderer/widgets/layout/__tests__/ThreadListSidebar.test.tsx`
- `src/renderer/shared/ui/__tests__/ErrorBoundary.test.tsx`
- `src/renderer/shared/ui/__tests__/SidebarTrigger.test.tsx`
- `src/renderer/services/concept-parsing/__tests__/`
- `src/renderer/services/chat/__tests__/`
- `src/renderer/pages/chat/__tests__/`
- All tests using Assistant UI

### Risks

**Low Risk**:
- Removing legacy test (already failing, no production impact)
- Updating test dependencies (already version mismatch)

**Medium Risk**:
- Refactoring renderer tests (many files, complex mocks)
- Service integration tests (async timing issues)

**Mitigation**:
- Work in small batches, validate after each fix
- Use targeted test commands: `npm run test:main:file -- <file>`
- Maintain test coverage during refactoring

### Dependencies

1. **Test Utilities**: Ensure `renderWithServices` and `createIpcPair` exist and work
2. **Documentation**: Update `docs/DEVELOPER-GUIDE/testing.md` if patterns change
3. **CI/CD**: Verify test commands work in CI environment

## Validation Strategy

### Testing Approach

1. **Incremental Validation**:
   - Fix one test file at a time
   - Run `npm run test:main:file -- <file>` or `npm run test:renderer:file -- <file>`
   - Validate pass before moving to next

2. **Full Suite Validation**:
   - After all fixes: `npm run test:complete`
   - Verify 100% pass rate
   - Generate coverage report

3. **DI Compliance Audit**:
   - Search for `vi.mock` calls that mock utilities
   - Verify all tests inject dependencies, not patch
   - Check workflow node tests don't mock chunk-emitter

### Acceptance Criteria

**Must Have**:
- [ ] All 138 failing tests pass
- [ ] Coverage report generates successfully
- [ ] No `vi.mock` of stateless utilities
- [ ] All renderer tests use `renderWithServices` or equivalent DI

**Should Have**:
- [ ] Test execution time < 2 minutes
- [ ] Clear error messages for failures
- [ ] Documentation updated

## Timeline Estimate

**Phase 1 (Critical)**: 2-4 hours
- Remove legacy test: 30 minutes
- Fix remediatePractice: 2 hours
- Fix coverage tool: 30 minutes
- Validation: 1 hour

**Phase 2 (Renderer)**: 8-12 hours
- Assistant UI tests: 4-6 hours
- ErrorBoundary tests: 1-2 hours
- Service tests: 2-3 hours
- Jest → Vitest: 1 hour

**Phase 3 (Validation)**: 1-2 hours
- Full suite runs: 30 minutes
- Coverage generation: 30 minutes
- Documentation: 1 hour

**Total**: 11-18 hours (2-3 days)

## Related Capabilities

**Referenced Specifications**:
- `render-safety-testing` - Error boundary patterns
- `renderer-structure` - Component testing guidelines
- `ipc-contract-testing` - Contract test patterns

**Dependencies**:
- Test utilities (`renderWithServices`, `createIpcPair`)
- Assistant UI library integration
- Vitest test runner

## Questions & Clarifications

1. **Priority**: Should we fix all tests or focus on critical path tests first?
   - **Recommendation**: Fix all to ensure 100% pass rate

2. **Test Utilities**: Should we enhance existing utilities or create new ones?
   - **Recommendation**: Use existing utilities, enhance only if gaps found

3. **Backward Compatibility**: Any concerns about breaking existing test patterns?
   - **Answer**: Tests are being fixed to match current implementation, not preserving broken patterns

4. **Documentation**: Should we update testing guide with new patterns?
   - **Recommendation**: Yes, update `docs/DEVELOPER-GUIDE/testing.md` with DI examples
