# Tasks: Enhance Test Error Detection

## Implementation Order

### Phase 1: Foundation & Documentation

#### 1. Create Render Safety Test Suite
**Deliverable**: `src/renderer/__tests__/render-safety.test.tsx`
- [ ] Add test documenting "Objects are not valid as a React child" error
- [ ] Test rejection of objects as React children
- [ ] Test rejection of arrays with objects
- [ ] Test acceptance of valid types (strings, numbers, null, undefined)
- [ ] Document type safety requirements

**Validation**: Run `npm run test -- render-safety.test.tsx` - all tests should pass and document React constraints

#### 2. Create IPC Contract Test Suite
**Deliverable**: `src/renderer/__tests__/electron-api.contract.test.ts`
- [ ] Test that deprecated catalyst methods don't exist
- [ ] Validate error shape for IPC failures
- [ ] Test missing handler detection
- [ ] Document API contract requirements

**Validation**: Run `npm run test -- electron-api.contract.test.ts` - should catch deprecated method usage

#### 3. Create Realistic Mock Utilities
**Deliverable**: `src/test/utils/realistic-mocks.ts`
- [ ] Create `createIPCErrorMock()` function
- [ ] Create `createFileServiceWithErrors()` function
- [ ] Create `createCatalystServiceWithDeprecatedMethods()` function
- [ ] Export type definitions for error scenarios

**Validation**: Import and use mocks in existing tests - should compile without errors

### Phase 2: Component Test Enhancements

#### 4. Enhance LocalProjectExplorer Tests
**Deliverable**: `src/renderer/features/discovery/ui/__tests__/LocalProjectExplorer.test.tsx`
- [ ] Add "should NOT render error objects" test
- [ ] Add "should handle malformed directory data" test
- [ ] Add "should handle IPC failures gracefully" test
- [ ] Update mocks to use realistic failure scenarios

**Validation**: `npm run test:renderer:file -- LocalProjectExplorer.test.tsx` - all tests pass including error scenarios

#### 5. Enhance ProgressPage Tests
**Deliverable**: `src/renderer/pages/progress/__tests__/ProgressPage.test.tsx`
- [ ] Add "should handle missing IPC handlers gracefully" test
- [ ] Add "should handle deprecated method calls" test
- [ ] Update catalyst service mocks to reflect actual API

**Validation**: `npm run test:renderer:file -- ProgressPage.test.tsx` - tests catch missing handlers

#### 6. Enhance Error Boundary Tests
**Deliverable**: `src/renderer/shared/__tests__/ErrorBoundary.render-safety.test.tsx`
- [ ] Test error boundary with invalid data rendering
- [ ] Test error boundary with error objects
- [ ] Test retry mechanism functionality

**Validation**: `npm run test -- ErrorBoundary.render-safety.test.tsx` - boundary catches rendering errors

### Phase 3: Integration & Automation

#### 7. Add Render Safety Test Suite to package.json
**Deliverable**: Updated `package.json`
- [ ] Add `test:render-safety` script
- [ ] Add `test:errors` script
- [ ] Add `test:contracts` script
- [ ] Document scripts in README

**Validation**: Run `npm run test:render-safety` - executes only render safety tests

#### 8. Update CI/CD Configuration
**Deliverable**: `.github/workflows/test.yml` or equivalent
- [ ] Add render safety test stage
- [ ] Add IPC contract test stage
- [ ] Configure failure reporting
- [ ] Set appropriate timeouts

**Validation**: CI pipeline runs new test suites and reports failures

#### 9. Create Test Documentation
**Deliverable**: `docs/DEVELOPER-GUIDE/testing-error-prevention.md`
- [ ] Document common error patterns
- [ ] Document render safety requirements
- [ ] Document IPC contract requirements
- [ ] Provide examples of good/bad test patterns

**Validation**: Documentation reviewed and approved by team

### Phase 4: Validation & Cleanup

#### 10. Remove Deprecated IPC References
**Deliverable**: Updated codebase
- [ ] Remove `catalyst:list-agents` from preload
- [ ] Remove `catalyst:get-active-executions` from preload
- [ ] Remove deprecated method calls from ProgressPage
- [ ] Remove deprecated methods from catalyst service

**Validation**: `npm run test:contracts` passes (no deprecated methods found)

#### 11. Run Full Test Suite
**Deliverable**: All tests passing
- [ ] Run `npm run test:complete`
- [ ] Fix any failures in new or existing tests
- [ ] Ensure test execution time is acceptable
- [ ] Update test coverage reports

**Validation**: `npm run test:coverage` shows improved coverage or maintained coverage

#### 12. Create Prevention Checklist
**Deliverable**: `docs/TESTING-CHECKLIST.md`
- [ ] Checklist for new component tests
- [ ] Checklist for error scenario coverage
- [ ] Checklist for IPC contract validation
- [ ] Integration with PR review process

**Validation**: Checklist used in code review process

## Verification Steps

After each phase:
1. Run affected tests: `npm run test -- <filename>`
2. Check for test failures: Should fail appropriately for invalid scenarios
3. Verify test execution time: Should complete within reasonable timeout
4. Review test output: Should clearly indicate what was tested and what failed

## Success Metrics

- **0** "Objects are not valid as a React child" errors in production
- **0** "No handler registered" errors for deprecated methods
- **100%** of new tests pass on first run
- **<5 minutes** additional test execution time for render safety suite
- **100%** deprecated method removal validated via contract tests
