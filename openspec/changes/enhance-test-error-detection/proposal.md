# Proposal: Enhance Test Error Detection for Object Propagation Issues

## Problem Statement

Current test suite has critical gaps that allow production errors to pass undetected:

1. **Missing IPC Handler Errors**: Tests don't catch "No handler registered for 'catalyst:list-agents'" errors because deprecated methods are still referenced in code but have no main process handlers
2. **Error Object Propagation**: Components attempt to render objects like `{success, data, timestamp}` instead of strings, causing "Objects are not valid as a React child" runtime errors
3. **Overly Optimistic Mocks**: Tests always mock success scenarios with clean data, never testing error flows where objects leak into rendering contexts

## Current State

### Test Coverage Issues
- `LocalProjectExplorer.test.tsx` only tests success scenarios with string data
- `ProgressPage.test.tsx` mocks catalyst service methods that don't exist in main process
- No tests for IPC failure scenarios
- No render safety tests for type validation
- Error boundaries tested but not with realistic error data

### Production Failures
```
Error: Objects are not valid as a React child (found: object with keys {success, data, timestamp})
  at LocalProjectExplorer -> ContentDiscovery -> DiscoveryPage
```

```
Error: No handler registered for 'catalyst:list-agents'
Error: No handler registered for 'catalyst:get-active-executions'
```

## Proposed Solution

Implement comprehensive test improvements across three dimensions:

### 1. Render Safety Testing
Add tests that explicitly validate React component safety with invalid data types:
- Document what causes "Objects are not valid as a React child" errors
- Test error boundary behavior with realistic error objects
- Validate component resilience to malformed data

### 2. IPC Contract Testing
Create contract tests that verify renderer-main communication:
- Ensure deprecated methods are removed from API surface
- Catch missing handlers before production
- Validate error shape for IPC failures

### 3. Realistic Failure Scenarios
Replace optimistic mocks with realistic failure data:
- Test with error objects that flow through component tree
- Simulate actual IPC failures and malformed responses
- Validate graceful error handling

## Scope

### In Scope
- Adding new test files for render safety and IPC contracts
- Updating existing tests to include error scenarios
- Creating realistic mock utilities
- Adding CI/CD integration for new test suites

### Out of Scope
- Fixing production code bugs (only test improvements)
- Refactoring existing test infrastructure
- Adding new features or functionality

## Success Criteria

1. **Zero "Objects are not valid as a React child" errors** in test suite (tests catch these before production)
2. **All deprecated IPC methods removed** and validated via contract tests
3. **Error object propagation caught** in tests before reaching UI
4. **New test suites integrated** into CI/CD pipeline
5. **Documentation** of common error patterns and prevention strategies

## Risks & Mitigations

### Risk: Test Maintenance Overhead
**Mitigation**: Create reusable mock utilities and test patterns that can be shared across components

### Risk: Test Execution Time
**Mitigation**: Structure new tests to run in parallel, use fast timeouts, and focus on critical paths

### Risk: False Positives
**Mitigation**: Carefully design tests to reflect real failure scenarios, not artificial edge cases

## Dependencies

- None - this is pure test infrastructure work
- Can be implemented in parallel with other features

## Timeline

Estimated effort: 2-3 days for complete implementation including tests and CI integration
