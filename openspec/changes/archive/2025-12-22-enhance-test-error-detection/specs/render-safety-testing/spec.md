# Spec Delta: Render Safety Testing

**Capability**: React Component Render Safety Validation
**Change ID**: `enhance-test-error-detection`

## ADDED Requirements

### Requirement: Document React Type Constraints
A render safety test suite MUST explicitly document React's type constraints and validate component adherence.

**Priority**: P1 (High)
**Effort**: L

#### Scenario: Basic Type Rejection
**Given** a React component that attempts to render an object
**When** the object contains nested properties like `{success: false, data: null, timestamp: Date.now()}`
**Then** the test should fail with "Objects are not valid as a React child" error
**And** the error should be explicitly documented in the test suite

**Test Implementation**:
```typescript
it('should reject objects as React children', () => {
  const objectData = { success: false, data: null, timestamp: Date.now() };
  expect(() => render(<div>{objectData}</div>))
    .toThrow('Objects are not valid as a React child');
});
```

#### Scenario: Array with Objects Rejection
**Given** a React component that attempts to render an array containing objects
**When** the array contains objects like `[{id: 1, name: 'item'}, {id: 2, name: 'item'}]`
**Then** the test should fail with an error about invalid React children
**And** this validates that arrays of objects cannot be rendered directly

**Test Implementation**:
```typescript
it('should reject arrays with objects', () => {
  const arrayData = [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }];
  expect(() => render(<div>{arrayData}</div>)).toThrow();
});
```

#### Scenario: Valid Types Acceptance
**Given** a React component that renders valid types
**When** the data includes strings, numbers, null, undefined, booleans
**Then** the component should render without errors
**And** this establishes what types are safe to render

**Test Implementation**:
```typescript
it('should accept valid types', () => {
  expect(() => {
    render(<div>{'string'}</div>);
    render(<div>{123}</div>);
    render(<div>{null}</div>);
    render(<div>{undefined}</div>);
    render(<div>{true}</div>);
  }).not.toThrow();
});
```

### Requirement: Error Boundary Render Safety
Tests MUST validate error boundaries can catch and handle rendering errors from invalid data.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Error Boundary Catches Object Rendering
**Given** a component that attempts to render an invalid object
**When** the component is wrapped in an ErrorBoundary
**Then** the ErrorBoundary should catch the error
**And** display appropriate error state instead of crashing
**And** provide a retry mechanism

**Test Implementation**:
```typescript
it('should catch object rendering errors', () => {
  const BadComponent = () => {
    const data = { success: false, error: 'boom' };
    return <div>{data}</div>;
  };

  render(
    <ErrorBoundary variant="inline">
      <BadComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  expect(screen.getByText(/Retry/)).toBeInTheDocument();
});
```

#### Scenario: Error Boundary with Complex Error Objects
**Given** a component that receives error objects from IPC failures
**When** the error contains nested structure like `{success: false, error: {...}, timestamp: Date.now()}`
**Then** the ErrorBoundary should handle it gracefully
**And** display a user-friendly error message
**And** not expose internal error structure

### Requirement: Component Data Flow Validation
Components MUST properly handle data type checking before rendering.

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: File Explorer with Invalid Data
**Given** LocalProjectExplorer component
**When** file service returns error objects instead of clean data
**Then** component should detect invalid data types
**And** either display error state or sanitize data before rendering
**And** not attempt to render objects as text

**Test Implementation**:
```typescript
it('should handle invalid file data gracefully', () => {
  mockFileService.readDirectory.mockResolvedValue({
    success: false,
    error: { code: 'IPC_ERROR', message: 'Handler not found' },
    timestamp: Date.now(),
  });

  render(<LocalProjectExplorer />);

  // Should show error state, not crash
  expect(screen.getByText(/Error:/)).toBeInTheDocument();
});
```

#### Scenario: Progress Page with Malformed Agent Data
**Given** ProgressPage component
**When** catalyst service returns objects where strings expected
**Then** component should validate data before rendering
**And** display appropriate fallback or error state
**And** log warning about invalid data structure

### Requirement: Test Utilities and Helpers
Reusable utilities MUST support render safety testing.

**Priority**: P2 (Medium)
**Effort**: L

#### Scenario: Type Validation Helper
**Given** developers writing new component tests
**When** they need to validate render safety
**Then** they can use `validateRenderSafety` helper function
**And** the helper automatically tests multiple invalid data types
**And** provides clear error messages for failures

**Implementation**:
```typescript
export function validateRenderSafety(Component: React.ComponentType<any>) {
  it('should safely handle invalid data types', () => {
    const invalidData = [
      { success: false, data: null },
      [{ id: 1, name: 'item' }],
      () => 'function',
      Symbol('symbol'),
    ];

    invalidData.forEach((data) => {
      expect(() => render(<Component data={data} />)).not.toThrow();
    });
  });
}
```

#### Scenario: Data Sanitization Helper
**Given** components that may receive invalid data
**When** they need to sanitize data before rendering
**Then** they can use `sanitizeForRender` utility
**And** the utility converts objects to safe representations
**And** provides fallback values for invalid types

## Modified Requirements

### Modified: Component Test Structure
**Changed File**: `src/renderer/features/discovery/ui/__tests__/LocalProjectExplorer.test.tsx`

**Previous**: Tests only success scenarios with clean data
**Updated**: Tests include error scenarios with realistic failure data

**Changes**:
- Add test for IPC error object propagation
- Add test for malformed directory data
- Add test for missing handler errors
- Update mocks to use realistic failure scenarios

**Validation**: All tests pass, including error scenarios

### Modified: Error Boundary Test Coverage
**Changed File**: `src/renderer/shared/__tests__/ErrorBoundary.render-safety.test.tsx`

**Previous**: Basic error boundary functionality tests
**Updated**: Comprehensive render safety tests with realistic error objects

**Changes**:
- Test error boundary with object rendering errors
- Test error boundary with IPC error objects
- Test retry mechanism with various error types
- Test boundary variants (inline, full, minimal)

**Validation**: Error boundaries catch all rendering errors

## Removed Requirements

None - this spec only adds new test coverage, doesn't remove existing functionality.

## Dependencies

- Existing test infrastructure (Vitest, React Testing Library)
- No changes to production code required
- Can be implemented independently

## Validation

### Test Execution
```bash
# Run render safety tests
npm run test:render-safety

# Expected: All tests pass
# Failure: Tests catch invalid data rendering
```

### Success Criteria
- [ ] All render safety tests pass
- [ ] Invalid data types properly rejected
- [ ] Error boundaries catch rendering errors
- [ ] Component tests include error scenarios
- [ ] Test utilities documented and reusable

### Failure Modes
If tests fail:
1. Check if component attempts to render invalid data
2. Verify data sanitization is in place
3. Ensure error boundaries properly configured
4. Review mock data for realism
