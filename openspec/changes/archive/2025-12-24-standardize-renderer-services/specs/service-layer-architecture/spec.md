# Spec: Service Layer Architecture

**Capability**: Service Layer Architecture
**Change ID**: `standardize-renderer-services`

## Purpose

Establish a consistent service layer architecture where all UI components and adapters use services instead of calling `electronAPI` directly. This ensures proper separation of concerns, centralized business logic, and consistent error handling.

## ADDED Requirements

### Requirement: UI Components Must Use Services
All UI components and adapters MUST use services for business logic instead of calling `electronAPI` directly.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- Separation of concerns - UI should handle presentation, services handle logic
- Centralized business logic - easier to maintain and test
- Consistent error handling across the application
- Easier to test - mock services instead of electronAPI

**Allowed Exceptions:**
- App infrastructure (AppContent, SetupPage) may use electronAPI for lifecycle operations (awaitReady, awaitConfigChange, onIPCError)
- Hooks that provide services (useElectronAPI) for dependency injection

**Implementation:**
```typescript
// ❌ DON'T: Direct electronAPI in UI component
const MyComponent = () => {
  const api = useElectronAPI();
  const data = await api.sessions.list();  // Violates separation
};

// ✅ DO: Use service layer
const MyComponent = () => {
  const sessionService = useService('sessionService');
  const sessions = await sessionService.listSessions();
};
```

**Validation:**
- No direct `api.domain.*()` calls in feature components
- Adapters use services instead of electronAPI
- Only app infrastructure uses electronAPI for lifecycle

#### Scenario: Feature Component Uses Service
**Given** User views analytics dashboard
**When** AnalyticsDashboard component renders
**Then** Component calls `analyticsService.getDashboard()`
**And** Service handles IPC communication
**And** Component only handles presentation logic ✅

#### Scenario: Adapter Uses Service Layer
**Given** Thread list loads in chat sidebar
**When** ThreadListAdapter fetches sessions
**Then** Adapter calls `sessionService.listSessions()`
**And** Service handles IPC via unwrapAPI
**And** Adapter doesn't call `api.sessions.*()` directly ✅

---

### Requirement: Adapters Use Services for Data Access
UI adapters (like ThreadListAdapter, IpcChatTransport) MUST use services instead of calling `electronAPI` directly.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale:**
- Adapters are part of the UI layer and should follow same pattern as components
- Prevents duplication of business logic
- Centralizes error handling
- Makes testing easier

**Implementation:**
```typescript
// ❌ DON'T: Adapter calls electronAPI directly
export function createThreadListAdapter(api: ElectronAPI) {
  return {
    async list() {
      const data = await unwrapAPI(api.sessions.list(...));
      // Business logic mixed with data access
    }
  };
}

// ✅ DO: Adapter receives and uses services
export function createThreadListAdapter(
  sessionService: SessionService,
  chatService: ChatService
) {
  return {
    async list() {
      const sessions = await sessionService.listSessions();
      // Adapter only handles adapter-specific logic
    }
  };
}
```

**Validation:**
- ThreadListAdapter uses sessionService
- IpcChatTransport uses chatService
- No direct `api.sessions.*()` or `api.chat.*()` calls in adapters

#### Scenario: ThreadListAdapter Uses Session Service
**Given** User opens chat page
**When** ThreadListAdapter initializes
**Then** Adapter receives sessionService via useService() hook
**And** Adapter calls `sessionService.listSessions()`
**And** No direct `api.sessions.*()` calls in adapter code ✅

#### Scenario: IpcChatTransport Uses Chat Service
**Given** User sends chat message
**When** IpcChatTransport streams response
**Then** Transport uses chatService for streaming
**And** No direct `api.chat.sendChatStream()` call ✅

---

### Requirement: Services Expose Methods for Adapters
Services MUST expose all methods needed by adapters, including methods that may only be used by adapters.

**Priority**: P1 (High)
**Effort**: M

**Rationale:**
- Adapters are consumers like any other component
- No need for separate "adapter services"
- Consolidates all domain logic in one place

**Implementation:**
```typescript
// chat-service.ts should expose:
export interface ChatService {
  // ... existing methods

  // NEW: For ThreadListAdapter
  getMessages(threadId: string): Promise<ChatHistoryMessage[]>;

  // For IpcChatTransport
  streamChat(request: StreamChatRequest): Promise<MessagePort>;
}
```

**Validation:**
- chatService has `getMessages(threadId)` method
- sessionService has all methods needed by ThreadListAdapter
- No business logic duplicated in adapters

#### Scenario: Chat Service Exposes getMessages
**Given** ThreadListAdapter needs message history
**When** Adapter calls `chatService.getMessages(threadId)`
**Then** Method exists and returns messages
**And** No need to call `api.chat.getMessages()` directly ✅

---

### Requirement: Service Injection Pattern
Services MUST be injected into adapters using dependency injection patterns appropriate to the context.

**Priority**: P1 (High)
**Effort**: S

**Patterns:**
- In React components/hooks: Use `useService()` hook
- In classes instantiated outside React: Pass via constructor
- In factories: Pass as function parameters

**Implementation:**
```typescript
// In React component (ReadyApp)
const sessionService = useService('sessionService');
const chatService = useService('chatService');
const adapter = useMemo(
  () => createThreadListAdapter(sessionService, chatService),
  [sessionService, chatService]
);

// Class constructor
class IpcChatTransport {
  constructor(private chatService: ChatService) {}
}
```

**Validation:**
- Adapters don't call `useElectronAPI()` to get services
- Services passed as constructor parameters or via useService()
- No global service access

#### Scenario: Adapter Receives Services via Constructor
**Given** IpcChatTransport is instantiated
**When** Transport is created
**Then** chatService passed via constructor
**And** Transport doesn't call `useElectronAPI()` internally ✅

#### Scenario: Adapter Receives Services via Hook
**Given** ThreadListAdapter is created in ReadyApp
**When** Adapter factory is called
**Then** Services retrieved via `useService()` hook
**And** Passed to factory as parameters ✅

---

### Requirement: No Direct electronAPI in Feature Code
Feature code (components, adapters, hooks) MUST NOT call `electronAPI` methods directly, except for lifecycle operations.

**Priority**: P1 (High)
**Effort**: L

**Allowed electronAPI Usage:**
- `awaitReady()` - Wait for main process initialization
- `awaitConfigChange()` - Wait for configuration changes
- `onIPCError()` - Subscribe to error events
- `getErrorBuffer()` / `clearErrorBuffer()` - Error state management

**Prohibited electronAPI Usage:**
- `api.sessions.*()` - Use sessionService
- `api.chat.*()` - Use chatService
- `api.analytics.*()` - Use analyticsService
- `api.knowledge.*()` - Use knowledgeService
- `api.catalyst.*()` - Use catalystService
- `api.settings.*()` - Use configService

**Validation:**
- ESLint rule checks for prohibited patterns
- Code review confirms no direct domain API calls
- Only lifecycle methods used in feature code

#### Scenario: Component Uses Service Instead of electronAPI
**Given** Developer creates new feature component
**When** Component needs session data
**Then** Developer uses `sessionService.listSessions()`
**And** Does NOT call `api.sessions.list()` ✅

---

## MODIFIED Requirements

### Requirement: Service Layer Consistency
All renderer services MUST use `unwrapAPI` for IPC communication and provide consistent business logic interfaces.

**Priority**: P0 (Critical)
**Effort**: L

**Modified to Add:**
- Services MUST use `unwrapAPI` for all IPC calls (existing requirement)
- Services MUST expose methods needed by adapters (new requirement)
- Services MUST NOT call electronAPI methods that should be in other services (cross-service calls go through services)

**Validation:**
- All services use unwrapAPI
- No manual response.success checks
- Services have methods for all adapter needs

#### Scenario: Service Uses unwrapAPI for All IPC
**Given** Service needs data from main process
**When** Service calls electronAPI method
**Then** Uses `unwrapAPI(electronAPI.method(...))`
**And** Returns unwrapped data or service result type ✅

#### Scenario: Service Exposes Adapter Methods
**Given** Adapter needs domain operation
**When** Adapter checks service interface
**Then** Method exists on service
**And** Adapter doesn't need to call electronAPI directly ✅

---

## Acceptance Criteria

1. ✅ All UI feature components use services
2. ✅ ThreadListAdapter uses sessionService and chatService
3. ✅ IpcChatTransport uses chatService
4. ✅ Services expose methods needed by adapters
5. ✅ No direct `api.domain.*()` calls in feature code
6. ✅ Only lifecycle methods use electronAPI directly
7. ✅ Services injected via useService() or constructor
8. ✅ Tests pass with new architecture
9. ✅ TypeScript compilation succeeds
10. ✅ No circular dependency errors

## Notes

- App infrastructure (AppContent, SetupPage) may use electronAPI for lifecycle
- Services may call each other's methods (not electronAPI) for cross-domain logic
- This spec extends `renderer-ipc-standardization` by adding service layer requirements
