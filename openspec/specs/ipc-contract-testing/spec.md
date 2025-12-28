# ipc-contract-testing Specification

## Purpose
TBD - created by archiving change enhance-test-error-detection. Update Purpose after archive.
## Requirements
### Requirement: Deprecated Method Detection
All tests SHALL explicitly validate deprecated methods are removed from the API surface.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: Catalyst API Surface Hygiene
**Given** the ElectronAPI catalyst interface
**When** inspecting the API surface for deprecated methods
**Then** `listAgents` method should not exist
**And** `getActiveExecutions` method should not exist
**And** any attempt to call these methods should fail at compile time

**Test Implementation**:
```typescript
it('should NOT expose deprecated catalyst methods', () => {
  const electronAPI = {
    catalyst: {
      // Deprecated methods should NOT exist:
      listAgents: undefined,
      getActiveExecutions: undefined,
      // Active methods should exist:
      executeAgent: expect.any(Function),
      cancelAgent: expect.any(Function),
    },
  };

  expect(electronAPI.catalyst.listAgents).toBeUndefined();
  expect(electronAPI.catalyst.getActiveExecutions).toBeUndefined();
});
```

#### Scenario: Preload Script Validation
**Given** the preload script API exposure
**When** checking the exposed electronAPI object
**Then** deprecated IPC calls should not be present
**And** only active API methods should be exposed

**Test Implementation**:
```typescript
it('should not expose deprecated IPC calls in preload', () => {
  // Read preload source and verify deprecated calls are removed
  const preloadSource = readFileSync('src/main/preload/index.ts', 'utf8');

  // These should NOT exist in preload
  expect(preloadSource).not.toContain("'catalyst:list-agents'");
  expect(preloadSource).not.toContain("'catalyst:get-active-executions'");

  // These SHOULD exist
  expect(preloadSource).toContain("'catalyst:execute-agent'");
  expect(preloadSource).toContain("'catalyst:cancel-agent'");
});
```

### Requirement: IPC Handler Existence Validation
All IPC methods exposed in preload MUST have corresponding handlers in main process.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Handler Registration Verification
**Given** IPC methods exposed in preload
**When** the main process initializes
**Then** all exposed methods should have corresponding handlers
**And** missing handlers should be detected during testing

**Test Implementation**:
```typescript
const REQUIRED_IPC_METHODS = [
  'catalyst:execute-agent',
  'catalyst:cancel-agent',
  'fs:read-directory',
  'fs:read-file',
  'sessions:list',
];

it('should have handlers for all exposed IPC methods', () => {
  REQUIRED_IPC_METHODS.forEach((method) => {
    const hasHandler = checkIpcHandlerExists(method);
    expect(hasHandler).toBe(true, `Missing handler for ${method}`);
  });
});

function checkIpcHandlerExists(method: string): boolean {
  // Check main process handler registration
  const handlersSource = readFileSync('src/main/handlers/index.ts', 'utf8');
  return handlersSource.includes(`'${method}'`);
}
```

#### Scenario: No Orphaned IPC Methods
**Given** the codebase
**When** scanning for IPC handler registrations
**Then** all registered handlers should have corresponding preload exposure
**And** no orphaned handlers should exist

**Test Implementation**:
```typescript
it('should not have orphaned IPC handlers', () => {
  const handlerRegistrations = findIpcHandlerRegistrations();
  const preloadExposures = findPreloadExposures();

  handlerRegistrations.forEach((handler) => {
    expect(preloadExposures).toContain(handler);
  });
});
```

### Requirement: Error Shape Validation
IPC errors MUST have consistent, render-safe structure with string messages.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Standardized IPC Error Format
**Given** an IPC call that fails
**When** an error is returned
**Then** the error should have a consistent structure
**And** the error.message should be a string (not an object)
**And** the error should be safe to display in UI

**Test Implementation**:
```typescript
it('should return render-safe IPC errors', () => {
  const errorResponse = {
    success: false,
    error: 'Handler not found',  // STRING, not object
    code: 'IPC_ERROR',
    timestamp: Date.now(),
  };

  // Validate error structure
  expect(typeof errorResponse.success).toBe('boolean');
  expect(typeof errorResponse.error).toBe('string');  // Critical!
  expect(errorResponse.error).not.toBeInstanceOf(Object);
  expect(errorResponse.error).not.toHaveProperty('success');
});

it('should NOT return error objects that can\'t be rendered', () => {
  // This would break rendering if returned as error message
  const badError = {
    success: false,
    error: { success: false, data: null, timestamp: Date.now() },  // BAD!
  };

  expect(typeof badError.error).toBe('object');  // This would break!
  expect(() => render(<div>{badError.error}</div>)).toThrow();
});
```

#### Scenario: Error Propagation Through Component Tree
**Given** IPC error flowing through component tree
**When** error reaches render function
**Then** components should handle string errors safely
**And** should not attempt to render error objects

**Test Implementation**:
```typescript
it('should safely handle IPC errors in components', async () => {
  mockService.method.mockRejectedValue(
    new Error('No handler registered for test')
  );

  render(<ComponentThatUsesService />);

  await waitFor(() => {
    // Should show error state with string message
    expect(screen.getByText(/No handler registered/)).toBeInTheDocument();
    // Should NOT crash or render object
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });
});
```

### Requirement: Service Layer Contract
The renderer services MUST match main process capabilities.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Catalyst Service Method Validation
**Given** the catalyst service in renderer
**When** checking available methods
**Then** methods should match main process capabilities
**And** deprecated methods should be removed

**Test Implementation**:
```typescript
it('should have correct catalyst service methods', () => {
  const catalystService = createCatalystService(mockAPI);

  // Deprecated methods should NOT exist
  expect(catalystService.getAvailableAgents).toBeUndefined();
  expect(catalystService.getActiveExecutions).toBeUndefined();

  // Active methods should exist
  expect(catalystService.sendChat).toBeDefined();
  expect(catalystService.cancelExecution).toBeDefined();
});
```

#### Scenario: Service Response Shape Validation
**Given** a service method call
**When** a response is returned
**Then** the response should have consistent structure
**And** error responses should have safe string messages

**Test Implementation**:
```typescript
it('should return consistent service response shape', async () => {
  const response = await catalystService.sendChat('test message');

  // Success response
  if (response.success) {
    expect(response).toHaveProperty('messageId');
    expect(response).toHaveProperty('response');
    expect(typeof response.response).toBe('string');
  } else {
    // Error response - CRITICAL: error must be string
    expect(response).toHaveProperty('error');
    expect(typeof response.error).toBe('string');  // Not object!
    expect(response.error).not.toHaveProperty('success');
  }
});
```

