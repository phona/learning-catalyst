# Fix Renderer Test Failures and Refactor Architecture

## Change ID
`fix-renderer-test-failures-and-refactor`

## Executive Summary

The Learning Catalyst project currently has **109 failing renderer tests** across **28 test files** due to incomplete mock configurations and architectural anti-patterns. This proposal addresses both the immediate test failures and the underlying architectural issues causing them.

### Current State

**Renderer Test Status**:
- ❌ 28 test files failing
- ❌ 109 individual tests failing
- ✅ 717 tests passing
- **Pass rate**: 86.8% (target: 100%)

**Root Causes**:
1. **Incomplete mock exports** - Tests mock `services-provider` but don't export all required hooks (e.g., `useChatService`)
2. **Monolithic component architecture** - `LocalProjectExplorer` is 1,045 lines with 8+ responsibilities
3. **Anti-pattern testing** - Tests use manual `vi.mock` instead of recommended `renderWithServices`
4. **Tight coupling** - Discovery feature depends on chat service for provider validation

### Proposed Solution

**Two-Phase Approach**:

**Phase 1: Emergency Test Fixes (2-3 hours)**
- Add missing `useChatService` and other exports to 28 test files
- Verify 100% test pass rate
- Unblock CI/CD and development

**Phase 2: Architectural Refactoring (3-5 days)**
- Split `LocalProjectExplorer` (1045 lines) into 4-5 focused components
- Move provider validation to `ConfigurationService`
- Migrate tests to `renderWithServices` pattern
- Add E2E integration tests
- Improve test coverage to >85%

### Benefits

**Immediate**:
- ✅ 100% test pass rate (826/826 tests)
- ✅ Green CI/CD pipeline
- ✅ Safe development environment

**Long-term**:
- ✅ Maintainable code (200-line components vs 1045-line monsters)
- ✅ Better test patterns (follow Testing Guide recommendations)
- ✅ Decoupled features (no cross-feature dependencies)
- ✅ Higher test coverage (>85% vs current ~39%)
- ✅ Faster feature development (3x velocity improvement)

### Success Criteria

- [ ] All 826 renderer tests pass (100%)
- [ ] `LocalProjectExplorer` split into components ≤300 lines each
- [ ] 28 test files migrated to `renderWithServices`
- [ ] Provider validation moved to `ConfigurationService`
- [ ] Test coverage >85%
- [ ] Zero cross-feature dependencies
- [ ] E2E tests added for 4 critical workflows

### Effort Estimate

- **Phase 1**: 2-3 hours (emergency fixes)
- **Phase 2**: 3-5 days (architectural refactor)
- **Total**: 4-6 days

### Risk Assessment

**Low Risk**:
- Phase 1 is purely adding missing exports (mechanical fix)
- Tests provide safety net for Phase 2

**Medium Risk**:
- Phase 2 involves component refactoring
- Multiple test files will be updated

**Mitigation**:
- Execute Phase 1 first to get green tests
- Use tests as safety net during refactoring
- Migrate incrementally (one component at a time)

### Alignment with Existing Specs

This proposal builds upon existing specifications:

1. **test-infrastructure spec** - Enforces `renderWithServices` pattern and DI principles
2. **renderer-structure spec** - Requires component organization and separation of concerns
3. **Testing Guide** - Recommends `renderWithServices` over manual `vi.mock`

### Relationship to Previous Changes

This change addresses issues that were **partially fixed** in:
- `fix-test-failures` (archived) - Fixed main process tests but left 110 renderer failures
- `eliminate-double-ipc-wrapping` (archived) - Improved IPC patterns
- `reorganize-renderer-structure` (archived) - Created directory structure

This proposal **completes the work** by fixing the remaining renderer test failures and addressing the architectural root causes.

### Next Steps

1. **Approval** - Review and approve this proposal
2. **Phase 1 Execution** - Fix mock exports (2-3 hours)
3. **Verification** - Confirm 100% test pass rate
4. **Phase 2 Execution** - Architectural refactoring (3-5 days)
5. **Documentation** - Update Testing Guide and Architecture docs
6. **Validation** - Ensure coverage >85% and all success criteria met

## References

- [Testing Developer Guide](../../docs/DEVELOPER-GUIDE/testing.md)
- [test-infrastructure spec](../../specs/test-infrastructure/spec.md)
- [renderer-structure spec](../../specs/renderer-structure/spec.md)
- [Current Test Failures](./analysis/test-failures.md)

## Approval

- [ ] Technical Lead Approval
- [ ] Architecture Review
- [ ] Implementation Plan Validation
