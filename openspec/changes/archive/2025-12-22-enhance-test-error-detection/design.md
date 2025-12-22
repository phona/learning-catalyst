# Design: Test Error Detection Enhancement

## Architectural Reasoning

### Why Current Tests Fail to Catch Production Errors

#### Problem 1: Overly Optimistic Mocking Strategy
Current tests use **static, clean mocks** that never reflect real failure modes:

```typescript
// Current test mock - always succeeds with clean data
mockFileService.readDirectory.mockResolvedValue({
  success: true,
  data: [{ name: 'readme.md', ... }]  // Always strings, never objects
});
```

**Why this doesn't catch errors:**
- Tests never simulate IPC failures
- Error objects never flow through component tree
- Components never receive malformed data
- Success path only, no error paths tested

#### Problem 2: Missing Contract Validation
The API surface is defined but not validated:

```typescript
// Preload exposes these (lines 604-605)
listAgents: () => ipcRenderer.invoke('catalyst:list-agents'),
getActiveExecutions: () => ipcRenderer.invoke('catalyst:get-active-executions'),
```

**Why this doesn't catch errors:**
- No tests verify handlers exist in main process
- Deprecated methods remain in code
- API contract not validated before deployment

#### Problem 3: No Render Safety Validation
React's type constraints not tested:

```typescript
// Component receives object but expects string
{item.name}  // If name is {success: false, ...} → Runtime error
```

**Why this doesn't catch errors:**
- Tests always provide valid types
- No validation of data flowing through component tree
- No tests for React's "Objects are not valid as a React child" constraint

## Solution Architecture

### Layer 1: Render Safety Testing (Low-Level Validation)

**Purpose**: Document and enforce React's type constraints

**Design Pattern**:
```typescript
describe('Render Safety - Type Validation', () => {
  it('should reject objects as React children', () => {
    const objectData = { success: false, error: 'boom' };
    expect(() => render(<div>{objectData}</div>))
      .toThrow('Objects are not valid as a React child');
  });
});
```

**Benefits**:
- Documents React's constraints explicitly
- Fails fast when invalid types used
- Provides reference for component developers

**Trade-offs**:
- Minimal runtime overhead
- Must be kept in sync with React version
- Tests implementation details (React internals)

### Layer 2: IPC Contract Testing (API Validation)

**Purpose**: Validate renderer-main communication contract

**Design Pattern**:
```typescript
describe('ElectronAPI Contract', () => {
  it('should NOT call deprecated catalyst methods', () => {
    const electronAPI = { catalyst: { listAgents: vi.fn() } };
    expect(electronAPI.catalyst.listAgents).toBeUndefined();
  });
});
```

**Benefits**:
- Catches missing handlers before production
- Enforces API surface hygiene
- Prevents deprecated method usage

**Trade-offs**:
- Tests implementation (API surface)
- Requires maintenance when API changes
- May be brittle to refactoring

### Layer 3: Realistic Failure Testing (Integration)

**Purpose**: Test with data that mirrors production failures

**Design Pattern**:
```typescript
describe('LocalProjectExplorer - Error Scenarios', () => {
  it('should handle IPC error objects gracefully', () => {
    mockFileService.readDirectory.mockResolvedValue({
      success: false,
      error: { code: 'IPC_ERROR', message: 'Handler not found' },
      timestamp: Date.now(),  // Object flows through
    });

    render(<LocalProjectExplorer />);

    // Should show error state, not crash
    expect(screen.getByText(/Error:/)).toBeInTheDocument();
  });
});
```

**Benefits**:
- Catches real production errors
- Tests error boundary behavior
- Validates graceful degradation

**Trade-offs**:
- More complex mocks required
- Tests may be slower
- Requires understanding of error flows

## Test Organization Strategy

### Directory Structure
```
src/renderer/
├── __tests__/
│   ├── render-safety.test.tsx          # Layer 1: Type constraints
│   ├── electron-api.contract.test.ts    # Layer 2: API contract
│   └── integration-failures.test.tsx    # Layer 3: Realistic failures
├── features/
│   └── discovery/
│       └── ui/
│           └── __tests__/
│               ├── LocalProjectExplorer.test.tsx      # Success + failures
│               └── LocalProjectExplorer.errors.test.tsx # Additional failures
└── shared/
    └── __tests__/
        └── ErrorBoundary.render-safety.test.tsx      # Boundary testing
```

### Naming Conventions
- `*.contract.test.ts` - API surface validation
- `*.render-safety.test.tsx` - Type safety validation
- `*.failures.test.tsx` - Error scenario testing
- `*.integration.test.tsx` - Cross-component testing

## Mock Strategy

### Hierarchical Mocking

**Level 1: Pure Mocks** (for unit tests)
```typescript
const mockService = {
  method: vi.fn().mockResolvedValue({ success: true, data: 'clean' })
};
```

**Level 2: Realistic Failure Mocks** (for integration tests)
```typescript
const mockServiceWithErrors = {
  method: vi.fn().mockResolvedValue({
    success: false,
    error: 'Real error message',
    timestamp: Date.now()
  })
};
```

**Level 3: Actual Implementation** (for E2E tests)
```typescript
// Use real services with injected failures
const service = createRealService({ failOnNextCall: true });
```

### Reusable Mock Utilities

```typescript
// src/test/utils/realistic-mocks.ts
export const createIPCErrorMock = () => ({
  success: false,
  error: {
    code: 'IPC_HANDLER_NOT_FOUND',
    message: "No handler registered for 'test:method'",
    details: { timestamp: Date.now() },
  },
  timestamp: Date.now(),
});

export const createFileServiceWithErrors = () => ({
  readDirectory: vi.fn().mockResolvedValue(createIPCErrorMock()),
  getWorkspacePath: vi.fn().mockRejectedValue(new Error('No workspace')),
});
```

## CI/CD Integration

### Test Execution Strategy

```yaml
# .github/workflows/test.yml
- name: Run Render Safety Tests
  run: npm run test:render-safety
  timeout-minutes: 2

- name: Run Contract Tests
  run: npm run test:contracts
  timeout-minutes: 2

- name: Run Component Tests
  run: npm run test:components
  timeout-minutes: 5
```

### Failure Reporting

```typescript
// Test failures should clearly indicate:
1. What was being tested (component/method)
2. What type of error (render safety, IPC contract, integration)
3. How to fix it (specific guidance)
4. What tests to add (prevention checklist)
```

## Error Prevention Checklist

### For New Components
- [ ] Add render safety test with invalid data
- [ ] Add error boundary test with realistic errors
- [ ] Test with both success and failure scenarios
- [ ] Document expected data types

### For New IPC Methods
- [ ] Verify handler exists in main process
- [ ] Add contract test for method existence
- [ ] Test error shape for failures
- [ ] Document IPC flow

### For Service Mocks
- [ ] Provide realistic failure scenario
- [ ] Use actual error object structure
- [ ] Test both success and failure paths
- [ ] Clear mocks between tests

## Trade-off Analysis

### Test Coverage vs Speed
- **More realistic tests** = slower execution
- **More mock layers** = more maintenance
- **Balance**: Focus realistic tests on critical paths only

### Test Brittleness vs Safety
- **Strict contracts** = brittle to changes
- **Loose tests** = miss errors
- **Balance**: Use contracts for stable APIs only

### Test Complexity vs Value
- **Complex error scenarios** = hard to maintain
- **Simple happy paths** = miss production bugs
- **Balance**: Start simple, add complexity where bugs found

## Future Enhancements

### Property-Based Testing
Consider adding fast-check for generating random invalid data:
```typescript
it('should handle any invalid data gracefully', () => {
  fc.assert(
    fc.property(fc.any(), (data) => {
      expect(() => render(<Component data={data} />)).not.toThrow();
    })
  );
});
```

### Visual Regression Testing
Add screenshot-based testing for error states:
```typescript
it('should render error state correctly', async () => {
  render(<Component error={createIPCErrorMock()} />);
  expect(await screen.findByTestId('error-state')).toMatchSnapshot();
});
```

### Mutation Testing
Use stryker-mutator to verify test effectiveness:
```typescript
// Automatically tests that our tests actually catch bugs
// If tests pass even when code is broken → tests are inadequate
```
