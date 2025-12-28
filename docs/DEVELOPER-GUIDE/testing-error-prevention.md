# Testing Error Prevention Guide

This guide documents common error patterns in the Learning Catalyst application and provides strategies to prevent them from reaching production.

## Overview

Learning Catalyst implements a comprehensive multi-layered error handling system to ensure the application never crashes and users can always recover from errors. This guide focuses on testing strategies to catch these errors before they reach users.

## Common Error Patterns

### 1. "Objects are not valid as a React child"

**Problem**: Components accidentally render objects instead of primitive values, causing React to throw runtime errors.

**Example of the error**:
```javascript
Error: Objects are not valid as a React child (found: object with keys {success, data, timestamp})
  at LocalProjectExplorer -> ContentDiscovery -> DiscoveryPage
```

**Root cause**: API responses or error objects are rendered directly without extracting string properties.

**Bad pattern**:
```tsx
// ❌ This will crash
const Component = ({ data }) => <div>{data}</div>;
<Component data={{ success: true, timestamp: Date.now() }} />

// ❌ Rendering error objects directly
const ErrorComponent = ({ error }) => <div>{error}</div>;
<ErrorComponent error={{ type: 'IPC_ERROR', code: 'NO_HANDLER' }} />
```

**Good pattern**:
```tsx
// ✅ Extract specific properties
const Component = ({ data }) => (
  <div>
    <span>Success: {String(data.success)}</span>
    <span>Data: {data.data}</span>
  </div>
);

// ✅ Extract error message
const ErrorComponent = ({ error }) => (
  <div>Error: {error.message}</div>
);
```

### 2. "No handler registered for 'catalyst:list-agents'"

**Problem**: Deprecated IPC methods are called but have no corresponding handlers in the main process.

**Root cause**: The preload API exposes methods that were removed from the main process IPC handlers.

**Detection**: The IPC contract tests (`src/renderer/__tests__/electron-api.contract.test.ts`) document these deprecated methods.

**Solution**: Either implement the missing IPC handlers or remove the deprecated methods from the preload API.

### 3. Error Object Propagation

**Problem**: Error objects with nested structures leak through the component tree and are accidentally rendered.

**Example**:
```tsx
// ❌ Error object with nested structure
{
  success: false,
  error: {
    type: 'IPC_ERROR',
    code: 'NO_HANDLER',
    message: 'No handler registered',
    details: { channel: 'test' }
  },
  timestamp: Date.now()
}

// If this object is rendered directly, React will crash
```

**Prevention**:
- Always extract specific string properties from error objects
- Use type guards to validate data before rendering
- Create helper functions to safely extract values

## Testing Strategies

### 1. Render Safety Tests

**Location**: `src/renderer/__tests__/render-safety.test.tsx`

**Purpose**: Document React render constraints and catch invalid data types before production.

**Key tests**:
- Validates that components reject objects as children
- Documents safe vs unsafe rendering patterns
- Tests API response handling
- Validates type safety requirements

**Running**:
```bash
npm run test:render-safety
```

### 2. IPC Contract Tests

**Location**: `src/renderer/__tests__/electron-api.contract.test.ts`

**Purpose**: Verify renderer-main communication contracts and catch missing handlers.

**Key tests**:
- Validates electronAPI surface matches actual IPC handlers
- Documents deprecated methods that need removal
- Tests error shape for IPC failures
- Ensures filesystem utilities are available

**Running**:
```bash
npm run test:contracts
```

### 3. Component Error Scenario Tests

Enhanced test suites for critical components:

- **LocalProjectExplorer**: `src/renderer/features/discovery/ui/__tests__/LocalProjectExplorer.test.tsx`
  - Tests malformed directory data handling
  - Validates error message rendering
  - Tests mixed success/error scenarios

- **ProgressPage**: `src/renderer/pages/progress/__tests__/ProgressPage.test.tsx`
  - Tests missing IPC handler scenarios
  - Validates deprecated method handling
  - Tests error object propagation prevention

- **ErrorBoundary**: `src/renderer/shared/ui/__tests__/ErrorBoundary.test.tsx`
  - Tests error boundary with invalid data
  - Validates retry mechanisms
  - Tests crash error handling

### 4. Realistic Mock Utilities

**Location**: `src/test/utils/services-provider-stubs.ts`

**Purpose**: Provide realistic error scenarios for testing.

**Available utilities**:
- `createIPCErrorMock()` - Creates realistic IPC error objects
- `createNoHandlerError(channel)` - Creates "No handler registered" errors
- `createProblematicDataObjects()` - Objects that would break rendering
- `createFileServiceWithErrors()` - File service with error scenarios
- `createCatalystServiceWithDeprecatedMethods()` - Service with deprecated methods

**Usage**:
```tsx
import { createNoHandlerError } from '@/test/utils/services-provider-stubs';

it('should handle missing IPC handlers gracefully', async () => {
  service.getData.mockRejectedValue(
    createNoHandlerError('catalyst:list-agents')
  );

  render(<MyComponent />);

  // Should show error state, not crash
  await waitFor(() => {
    expect(screen.getByText(/Error:/)).toBeInTheDocument();
  });
});
```

## Test Execution

### Running Individual Test Suites

```bash
# Render safety tests only
npm run test:render-safety

# IPC contract tests only
npm run test:contracts

# Error-specific tests
npm run test:errors

# Component-specific tests
npm run test:renderer:file -- LocalProjectExplorer.test.tsx
npm run test:renderer:file -- ProgressPage.test.tsx
```

### Running All Tests

```bash
# Complete test suite
npm run test:complete

# With coverage
npm run test:complete:coverage
```

### CI/CD Integration

The CI pipeline includes dedicated stages for:
- **Render Safety Tests**: Validates React render constraints
- **IPC Contract Tests**: Validates electronAPI contracts
- **Error Detection**: Catches deprecated method usage
- **Full Test Suite**: Runs all tests with coverage

See `.github/workflows/ci-tests-quality-gates.yml`.

## Best Practices

### For Developers

1. **Always validate data types before rendering**
   - Check `typeof` before rendering
   - Use type guards for complex objects
   - Default to string conversion for unknown types

2. **Extract specific properties from API responses**
   - Don't render entire objects
   - Extract `message`, `code`, `data` properties individually
   - Use helper functions for safe extraction

3. **Use error boundaries strategically**
   - Wrap critical sections in error boundaries
   - Provide meaningful fallback UI
   - Include retry mechanisms

4. **Test error scenarios, not just success paths**
   - Test with malformed data
   - Test with missing properties
   - Test with invalid types

5. **Document deprecated IPC methods**
   - Keep the contract tests up to date
   - Remove or implement missing handlers
   - Validate in CI before merging

### For Code Review

**Checklist**:
- [ ] Are objects rendered directly? (❌ reject)
- [ ] Are error messages extracted as strings? (✅ required)
- [ ] Are API responses destructured properly? (✅ required)
- [ ] Are error scenarios tested? (✅ required)
- [ ] Are deprecated IPC methods used? (❌ reject)

## Prevention Checklist

### Before Writing New Components

- [ ] Define TypeScript interfaces for props and state
- [ ] Document what types are accepted as children
- [ ] Add render safety tests for unusual data types
- [ ] Plan error boundary placement

### Before Making API Changes

- [ ] Update IPC contract tests
- [ ] Verify all exposed methods have handlers
- [ ] Remove or implement deprecated methods
- [ ] Test error scenarios

### Before Merging PRs

- [ ] Run `npm run test:render-safety`
- [ ] Run `npm run test:contracts`
- [ ] Check for "Objects are not valid as a React child" errors
- [ ] Verify all new tests pass
- [ ] Review test coverage

## Troubleshooting

### "Objects are not valid as a React child" Error

**Diagnosis**:
1. Check the stack trace for the component name
2. Look for objects being rendered: API responses, error objects, dates
3. Find where data is passed to JSX without validation

**Fix**:
1. Extract specific string properties
2. Use `String()` or `toString()` for primitives
3. Add type guards before rendering
4. Add tests to prevent regression

### "No handler registered" Error

**Diagnosis**:
1. Check which method is being called
2. Verify if it exists in preload but not in main process
3. Check the contract tests for documentation

**Fix**:
1. Implement the missing IPC handler, OR
2. Remove the method from preload API, OR
3. Update the renderer code to use alternative methods

### Tests Failing After Data Changes

**Diagnosis**:
1. Check if the test uses realistic error scenarios
2. Verify mock data matches actual API shape
3. Look for hardcoded assumptions in tests

**Fix**:
1. Update mocks to match new data structure
2. Add tests for edge cases
3. Use realistic mock utilities from `services-provider-stubs.ts`

## Resources

- [React Error Boundaries Documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Testing Guide](./testing.md)
- [Error Handling Guide](./error-handling.md)
- [Error Codes Quick Reference](./error-codes-quick-reference.md)
- [Error Handling Examples](./error-handling-examples.md)

## Summary

By following these testing strategies and best practices, we can prevent common errors from reaching production:

✅ **Zero "Objects are not valid as a React child" errors** in production
✅ **Zero "No handler registered" errors** for deprecated methods
✅ **100% of error scenarios tested** before release
✅ **All deprecated methods validated** via contract tests

The combination of render safety tests, IPC contract tests, realistic mocks, and enhanced component tests creates a robust safety net that catches errors early in development and prevents them from reaching users.
