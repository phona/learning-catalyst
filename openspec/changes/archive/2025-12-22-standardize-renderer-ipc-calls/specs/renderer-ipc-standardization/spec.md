# Spec: Standardize Renderer IPC Calls

**Capability**: Renderer IPC Call Standardization
**Change ID**: `standardize-renderer-ipc-calls`

## Purpose

Standardize all renderer IPC calls to use the `unwrapAPI` helper from `@/renderer/hooks/useElectronAPI`, eliminating manual unwrapping patterns and ensuring consistent error handling across all services. This improves code quality, reduces runtime errors, and provides better user experience through automatic error handling.

## ADDED Requirements

### Requirement: unwrapAPI Helper for All IPC Calls
All renderer services MUST use the `unwrapAPI` helper instead of manual response unwrapping.

**Priority**: P0 (Critical)
**Effort**: L

**Rationale:**
- Eliminates runtime errors from improper unwrapping
- Provides consistent error handling across all services
- Reduces code duplication
- Automatic error toast notifications

**Implementation:**
```typescript
// ❌ DON'T: Manual unwrapping
const response = await electronAPI.sessions.list();
const sessions = response?.data || [];

// ✅ DO: Use unwrapAPI
const sessions = await unwrapAPI(electronAPI.sessions.list());
```

**Validation:**
- All service files use `unwrapAPI`
- No manual `response?.data` patterns remain
- Error toasts display automatically on failures

#### Scenario: Chat Service Uses unwrapAPI
**Given** User sends a message in chat
**When** ChatService calls `electronAPI.chat.getMessages(threadId)`
**Then** unwrapAPI unwraps the response automatically
**And** Messages array is returned directly
**And** No manual response.data access needed
**And** Chat interface displays messages correctly ✅

---

### Requirement: Automatic Error Handling
The `unwrapAPI` helper MUST automatically display error toasts and throw structured IPCError for programmatic handling.

**Priority**: P0 (Critical)
**Effort**: M

**Behavior:**
- Success: Returns unwrapped data
- Failure: Shows toast notification (unless silent mode) and throws IPCError
- Silent mode: Suppresses toast for background operations

**Implementation:**
```typescript
try {
  const data = await unwrapAPI(electronAPI.someMethod(...));
  // Use data directly
} catch (error) {
  if (error instanceof IPCError) {
    // Handle specific error codes
    switch (error.code) {
      case 'NOT_FOUND':
        // Handle not found
        break;
    }
  }
}
```

**Validation:**
- Error toasts appear for user-visible failures
- Silent mode suppresses background error toasts
- IPCError provides code and message for error handling

#### Scenario: Session Service Error Handling
**Given** User tries to access deleted session
**When** SessionService calls `unwrapAPI(electronAPI.sessions.get(sessionId))`
**Then** Error toast displays "Session not found"
**And** IPCError thrown with code 'NOT_FOUND'
**And** UI shows error message to user ✅

#### Scenario: Silent Mode for Background Operations
**Given** Background sync operation fails
**When** Service calls `unwrapAPI(operation, { silent: true })`
**Then** No error toast displayed
**And** IPCError still thrown for programmatic handling
**And** Background error doesn't interrupt user ✅

---

### Requirement: Type Safety with Generics
The `unwrapAPI` helper MUST use TypeScript generics to ensure type-safe unwrapping.

**Priority**: P1 (High)
**Effort**: S

**Implementation:**
```typescript
const sessions: SessionDisplay[] = await unwrapAPI(
  electronAPI.sessions.list()
);
```

**Validation:**
- TypeScript compilation succeeds
- Generic types properly inferred
- No type assertion needed in most cases

#### Scenario: Analytics Service Type Safety
**Given** Analytics service retrieves dashboard data
**When** Service calls `unwrapAPI(electronAPI.analytics.getDashboard())`
**Then** Data typed as `DashboardDisplay`
**And** TypeScript validates property access
**And** No runtime type errors ✅

---

### Requirement: Consistent Service Patterns
All renderer services MUST follow the same pattern for IPC calls and error handling.

**Priority**: P1 (High)
**Effort**: M

**Service Pattern:**
```typescript
try {
  const data = await unwrapAPI(electronAPI.domain.method(params));
  return { success: true, data };
} catch (error) {
  return { success: false, error: error.message };
}
```

**Validation:**
- All services use consistent error handling
- No mixed patterns (some manual, some unwrapAPI)
- Code review confirms pattern adherence

#### Scenario: Discovery Service Consistency
**Given** Discovery service searches knowledge
**When** Service calls multiple IPC methods
**Then** All calls use unwrapAPI
**And** Error handling follows same pattern
**And** Service returns consistent response shape ✅

---

### Requirement: Documentation and Comments
All service files MUST include comments explaining the unwrapAPI pattern.

**Priority**: P2 (Medium)
**Effort**: S

**Implementation:**
```typescript
/**
 * This service uses the unwrapAPI pattern for consistent IPC error handling.
 *
 * All IPC calls use unwrapAPI() from @/renderer/hooks/useElectronAPI which:
 * - Automatically unwraps APIResponse<T> to T
 * - Shows error toasts on failures
 * - Throws IPCError for programmatic error handling
 *
 * Electron IPC contract lives in code:
 * - Types: `src/shared/types/electron-api/*`
 * - Preload bridge: `src/main/preload/index.ts`
 * - Main registrations: `src/main/handlers/*`
 */
```

**Validation:**
- All service files have unwrapAPI pattern comments
- Developer guide includes usage documentation
- Code comments reference the OpenSpec change

#### Scenario: Service Comments Present
**Given** Developer reviews chat service code
**When** Developer reads service file header
**Then** unwrapAPI pattern explanation is visible
**And** Reference to documentation is provided
**And** Developer understands the pattern ✅

---

## ADDED Requirements

### Requirement: Test Provider Updates
Test providers MUST wrap components with ElectronAPIProvider for proper context.

**Priority**: P0 (Critical)
**Effort**: S

**Implementation:**
```typescript
<ElectronAPIProvider api={electronAPI}>
  <ServicesProvider apiClient={electronAPI}>
    {children}
  </ServicesProvider>
</ElectronAPIProvider>
```

**Validation:**
- Integration tests pass without context errors
- useElectronAPI hook works in test environment
- ThreadListAdapter receives proper API client

#### Scenario: Integration Tests Pass
**Given** Integration test renders chat interface
**When** Test calls `renderWithServices(<App />)`
**Then** ElectronAPIProvider provides context
**And** useElectronAPI hook succeeds
**And** No "must be used within" errors ✅

---

### Requirement: Developer Guide Updates
The Electron API documentation MUST include unwrapAPI usage guidelines.

**Priority**: P1 (High)
**Effort**: M

**Implementation:**
- Comprehensive unwrapAPI section
- Usage examples and patterns
- Migration guide from manual unwrapping
- Error handling best practices

**Validation:**
- Documentation is in code (types + preload + handlers)
- Examples demonstrate correct usage
- Migration guide helps existing code

#### Scenario: Documentation Helps New Developer
**Given** New developer learns IPC patterns
**When** Developer reads the Electron IPC contract in code
**Then** unwrapAPI section explains the pattern
**And** Examples show correct and incorrect usage
**And** Developer implements pattern correctly ✅

---

### Requirement: unwrapAPI Documentation Enhancement
The unwrapAPI function MUST have comprehensive JSDoc documentation.

**Priority**: P2 (Medium)
**Effort**: S

**Implementation:**
```typescript
/**
 * Helper to unwrap API responses
 *
 * This is the STANDARDIZED way to call IPC methods in the renderer.
 * All services should use unwrapAPI instead of manual response unwrapping.
 *
 * @param responsePromise - Promise that resolves to APIResponse<T>
 * @param options - Options for unwrapping behavior
 * @returns Promise that resolves to unwrapped data T
 *
 * @example
 * // Basic usage
 * const data = await unwrapAPI(electronAPI.sessions.list());
 */
export function unwrapAPI<T>(
  responsePromise: Promise<APIResponse<T>>,
  options: IPCCallOptions = {}
): Promise<T>
```

**Validation:**
- JSDoc includes examples
- Function purpose clearly stated
- Usage patterns documented

#### Scenario: unwrapAPI JSDoc Present
**Given** Developer uses unwrapAPI
**When** Developer hovers over function in IDE
**Then** Comprehensive documentation appears
**And** Examples demonstrate usage
**And** Developer understands how to use it ✅

---

## Acceptance Criteria

1. ✅ All Priority 1 services use unwrapAPI (File, Chat, Session, Settings, Analytics)
2. ✅ Integration tests pass without errors
3. ✅ Manual testing confirms no runtime errors
4. ✅ ESLint validation passes
5. ✅ Developer guide documentation updated
6. ✅ Code comments added to service files
7. ✅ No manual unwrapping patterns remain
8. ✅ Error toasts display correctly
9. ✅ Silent mode works for background operations
10. ✅ TypeScript compilation succeeds
11. ✅ ThreadListAdapter uses unwrapAPI correctly
12. ✅ Test providers include ElectronAPIProvider

## Notes

- This is a refactor to improve code quality and consistency
- unwrapAPI helper already existed, this change standardizes its usage
- Some APIs (filesystem operations) return raw data and do not use unwrapAPI
- Migration was completed incrementally by service priority
- Error handling behavior is preserved, only implementation pattern changed
