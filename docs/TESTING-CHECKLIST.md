# Testing Error Prevention Checklist

This checklist should be used during code review and before merging any pull requests to ensure errors are caught before they reach production.

## Pre-Merge Checklist

### General Testing Requirements

- [ ] All tests pass: `npm run test:complete`
- [ ] Test coverage meets threshold (≥90%): `npm run test:coverage`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`

### Render Safety Tests

Run these commands to validate render safety:

- [ ] Render safety tests pass: `npm run test:render-safety`
- [ ] No "Objects are not valid as a React child" errors in test output
- [ ] All components validate data types before rendering

**What to check:**
- Are objects rendered directly in JSX? (❌ reject)
- Are API responses destructured properly? (✅ required)
- Are error objects converted to strings? (✅ required)
- Are dates formatted before rendering? (✅ required)

### IPC Contract Tests

Run these commands to validate IPC contracts:

- [ ] Contract tests pass: `npm run test:contracts`
- [ ] No deprecated methods are used
- [ ] All IPC handlers have corresponding preload methods

**What to check:**
- Are deprecated methods (listAgents, getActiveExecutions) used? (❌ reject)
- Does every preload method have a corresponding IPC handler? (✅ required)
- Are error shapes consistent across the codebase? (✅ required)

### Component-Specific Tests

#### LocalProjectExplorer
- [ ] Tests pass: `npm run test:renderer:file -- LocalProjectExplorer.test.tsx`
- [ ] Error scenarios are tested (malformed data, missing fields)
- [ ] Render safety tests included

#### ProgressPage
- [ ] Tests pass: `npm run test:renderer:file -- ProgressPage.test.tsx`
- [ ] Error scenarios are tested (service failures, missing data)
- [ ] Deprecated methods are not used

#### ErrorBoundary
- [ ] Tests pass: `npm run test -- ErrorBoundary.test.tsx`
- [ ] Error boundaries tested with realistic error data
- [ ] Retry mechanisms validated

### Error Scenario Coverage

For any new component or feature, ensure:

- [ ] **Success path tested**: Component works with valid data
- [ ] **Error path tested**: Component handles errors gracefully
- [ ] **Partial data tested**: Component handles missing optional fields
- [ ] **Invalid data tested**: Component rejects invalid data types
- [ ] **Empty state tested**: Component shows appropriate empty state
- [ ] **Loading state tested**: Component shows loading indicator

### Common Error Patterns to Prevent

#### 1. Object Rendering Errors

**❌ Bad - Rendering objects directly:**
```tsx
const Component = ({ data }) => <div>{data}</div>;
```

**✅ Good - Extracting specific properties:**
```tsx
const Component = ({ data }) => (
  <div>
    <span>Status: {String(data.success)}</span>
    <span>Message: {data.message}</span>
  </div>
);
```

#### 2. API Response Errors

**❌ Bad - Rendering entire API response:**
```tsx
const Component = ({ response }) => <div>{response}</div>;
```

**✅ Good - Extracting safe values:**
```tsx
const Component = ({ response }) => (
  <div>Error: {response.error?.message || 'Unknown error'}</div>
);
```

#### 3. Date Rendering Errors

**❌ Bad - Rendering Date objects:**
```tsx
const Component = ({ timestamp }) => <div>{timestamp}</div>;
```

**✅ Good - Formatting dates:**
```tsx
const Component = ({ timestamp }) => (
  <div>{new Date(timestamp).toLocaleString()}</div>
);
```

#### 4. Deprecated IPC Methods

**❌ Bad - Using deprecated methods:**
```typescript
// These methods no longer have IPC handlers
electronAPI.catalyst.listAgents()
electronAPI.catalyst.getActiveExecutions()
```

**✅ Good - Using supported methods:**
```typescript
// Use the agents API instead
electronAPI.agents.getAvailableAgents()
```

## Code Review Checklist

### When Reviewing Someone Else's Code

- [ ] **Render Safety**: Check for direct object rendering in JSX
- [ ] **Error Handling**: Verify error objects are converted to strings
- [ ] **Data Validation**: Ensure data types are checked before rendering
- [ ] **Test Coverage**: Verify new code has corresponding tests
- [ ] **IPC Contracts**: Check that new IPC methods have handlers
- [ ] **Deprecated Methods**: Ensure no deprecated methods are used

### When Writing New Code

#### Component Development

- [ ] Define TypeScript interfaces for all props
- [ ] Add type guards for runtime type checking
- [ ] Test with invalid/malformed data
- [ ] Test with null/undefined values
- [ ] Document expected data shapes

#### API Integration

- [ ] Use `unwrapAPI()` for IPC calls
- [ ] Handle both success and error cases
- [ ] Extract specific properties from responses
- [ ] Don't render entire objects
- [ ] Add error boundaries where appropriate

#### Test Writing

- [ ] Write tests for success scenarios
- [ ] Write tests for error scenarios
- [ ] Write tests for edge cases (empty, null, undefined)
- [ ] Use realistic mock data from `services-provider-stubs.ts`
- [ ] Test render safety constraints

## CI/CD Validation

The following checks run automatically in CI:

### Required Checks

1. **Unit Tests** - All main and renderer tests
2. **Render Safety Tests** - Validates React render constraints
3. **IPC Contract Tests** - Validates electronAPI contracts
4. **Integration Tests** - Cross-process communication
5. **Performance Tests** - Memory and performance validation
6. **Coverage Validation** - Ensures ≥90% coverage
7. **Build Validation** - Builds on all platforms (Ubuntu, Windows, macOS)

### Quality Gates

- [ ] All tests pass
- [ ] Coverage ≥90%
- [ ] No linting errors
- [ ] No type errors
- [ ] Build succeeds on all platforms

## Common Issues and Solutions

### Issue: "Objects are not valid as a React child"

**Symptoms:**
- Component crashes with rendering error
- Error message mentions objects with keys

**Solution:**
1. Find where object is rendered in JSX
2. Extract specific string properties
3. Use `String()` or `toString()` for primitives
4. Add type guard before rendering

### Issue: "No handler registered for 'catalyst:XXX'"

**Symptoms:**
- Console error about missing IPC handler
- Method exists in preload but not in main process

**Solution:**
1. Check if method is documented as deprecated
2. If deprecated: Remove from preload and update callers
3. If not deprecated: Implement missing IPC handler
4. Update contract tests to reflect changes

### Issue: Test Failures After Data Structure Changes

**Symptoms:**
- Tests fail with "cannot find property" errors
- Tests work but don't validate new structure

**Solution:**
1. Update mock data to match new structure
2. Add tests for new fields
3. Test edge cases and invalid data
4. Run full test suite to verify

## Quick Reference

### Running Tests

```bash
# All tests
npm run test:complete

# Specific test suites
npm run test:render-safety
npm run test:contracts
npm run test:renderer:file -- ComponentName.test.tsx

# With coverage
npm run test:complete:coverage
```

### Test Files Location

- **Render Safety**: `src/renderer/__tests__/render-safety.test.tsx`
- **IPC Contracts**: `src/renderer/__tests__/electron-api.contract.test.ts`
- **Components**: `src/renderer/**/__tests__/*.test.tsx`
- **Services**: `src/renderer/services/**/__tests__/*.test.tsx`

### Mock Utilities

Located in `src/test/utils/services-provider-stubs.ts`:

- `createIPCErrorMock()` - Creates realistic IPC errors
- `createNoHandlerError(channel)` - "No handler registered" errors
- `createProblematicDataObjects()` - Objects that break rendering
- `createFileServiceWithErrors()` - File service with error scenarios
- `createCatalystServiceWithDeprecatedMethods()` - Deprecated method mocks

## Success Metrics

After implementing this checklist, we should achieve:

- ✅ **0** "Objects are not valid as a React child" errors in production
- ✅ **0** "No handler registered" errors for deprecated methods
- ✅ **100%** of new components have error scenario tests
- ✅ **100%** deprecated method removal validated via contract tests
- ✅ **≥90%** test coverage maintained across all modules

## Integration with PR Review Process

### PR Description Template

When opening a PR, include:

```markdown
## Testing Checklist

- [ ] All tests pass
- [ ] Render safety tests pass
- [ ] IPC contract tests pass
- [ ] No deprecated methods used
- [ ] Error scenarios tested
- [ ] TypeScript validation passed
- [ ] Linting passed

## Changes Made

- What was changed
- Why it was changed
- How it was tested
```

### Reviewer Actions

1. **Run checklist** before approving
2. **Check test coverage** for new code
3. **Validate render safety** by reviewing JSX
4. **Check for deprecated methods** in diff
5. **Verify error handling** in new code
6. **Test locally** if uncertain

## Summary

This checklist ensures that:
1. Errors are caught during development, not production
2. All components handle error scenarios gracefully
3. No deprecated methods are accidentally introduced
4. Render safety constraints are maintained
5. IPC contracts remain consistent

By following this checklist consistently, we maintain a robust error prevention system that keeps the application stable and provides a great user experience.
