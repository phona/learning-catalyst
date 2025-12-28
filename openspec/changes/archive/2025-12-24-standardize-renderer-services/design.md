# Design: Consistent Renderer Service Layer

**Change ID**: `standardize-renderer-services`

## Overview

This document describes the architectural design for establishing a consistent renderer service layer in the Learning Catalyst application.

## Current Architecture Problems

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PROBLEM 1: INCONSISTENT SERVICE IPC HANDLING                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

Some services use unwrapAPI:
  analytics-service.ts    ✅ unwrapAPI(electronAPI.analytics.*())
  configuration-service.ts ✅ unwrapAPI(electronAPI.settings.*())
  chat-service.ts          ✅ unwrapAPI(electronAPI.chat.*())

Others don't:
  file-service.ts           ❌ await electronAPI.readDirectory(...)
                              → returns {success, data, timestamp}
                              → treated as raw data
                              → BUG: nested response objects


┌─────────────────────────────────────────────────────────────────────────────────┐
│ PROBLEM 2: ADAPTERS BYPASS SERVICE LAYER                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │  React UI Layer │
                           └────────┬────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
         ┌──────────▼──────────┐         ┌─────────▼────────┐
         │ useThreadListAdapter│         │ IpcChatTransport  │
         └──────────┬──────────┘         └─────────┬────────┘
                    │                               │
                    │  ❌ DIRECT CALL               │  ❌ DIRECT CALL
                    └───────────────┬───────────────┘
                                    │
                           ┌───────▼────────┐
                           │  electronAPI   │
                           │   (IPC Layer)   │
                           └───────┬────────┘
                                   │
                           ┌───────▼────────┐
                           │ Main Process   │
                           └────────────────┘

VIOLATION: Adapters skip the service layer entirely!
```

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CONSISTENT SERVICE LAYER ARCHITECTURE                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: React UI Components/Adapters                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
  - Feature components (use services via useService())
  - Adapters (use services via constructor or useService())
  - App infrastructure (use electronAPI for lifecycle only)


┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Service Layer (Business Logic + IPC Unwrapping)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
  - All services use unwrapAPI for IPC calls
  - Services return domain types or service result types
  - Services handle business logic, validation, transformations


┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: electronAPI (IPC Transport)                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
  - Provides IPC methods to main process
  - Returns ApiResponse<T> = {success, data, timestamp}


┌─────────────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: Main Process                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
  - Handlers return raw data
  - ipc-main-proxy wraps in ApiResponse


DATA FLOW (Correct Pattern):
═════════════════════════════════════════════════════════════════════════════════

React Component ──→ Service ──→ unwrapAPI ──→ electronAPI ──→ Main
     (UI)           (Business    (Extract     (IPC        (Handlers
                   Logic +     response.data  Transport)   return
                   unwrapping)                 raw data)
```

## Design Decisions

### Decision 1: Keep Service Result Types

**Question**: Should services return raw domain types or keep wrapper types like `FileOperationResult<T>`?

**Options**:
1. Return raw domain types (like analytics-service does)
2. Keep wrapper types (like file-service currently does)

**Decision**: Keep existing wrapper types for backward compatibility

**Rationale**:
- Minimizes breaking changes to existing consumers
- FileOperationResult is already used throughout file-service consumers
- Can migrate to raw types in a future refactoring

**Pattern**:
```typescript
// Services unwrap internally, but return wrapper type
const readDirectory = async (...): Promise<FileOperationResult<T[]>> => {
  try {
    const items = await unwrapAPI(electronAPI.readDirectory(...));
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: {...} };
  }
};
```

### Decision 2: Adapter Service Injection Pattern

**Question**: How should adapters receive services?

**Options**:
1. Via `useService()` hook (React context)
2. Via constructor parameter (dependency injection)
3. Via global electronAPI (current - broken)

**Decision**: Mix of both, based on context

**Rationale**:
- `useThreadListAdapter` is called in `ReadyApp` component → use `useService()` hook
- `IpcChatTransport` is a class instantiated outside React → pass service via constructor

**Pattern**:
```typescript
// In React component (ReadyApp)
const sessionService = useService('sessionService');
const chatService = useService('chatService');
const adapter = useMemo(() => createThreadListAdapter(sessionService, chatService), [sessionService, chatService]);

// Class constructor
class IpcChatTransport {
  constructor(private chatService: ChatService) {}
}
```

### Decision 3: Service Method Additions for Adapters

**Question**: Should we add methods to existing services or create new adapter-specific services?

**Options**:
1. Add methods to existing services (session-service, chat-service)
2. Create new adapter-specific services
3. Keep direct electronAPI calls in adapters

**Decision**: Add methods to existing services

**Rationale**:
- Adapters are just another type of consumer
- No need for separate "adapter services"
- Consolidates business logic in one place per domain

**Additions needed**:
- `chatService.getMessages(threadId: string)` - currently only in adapter

## Component Interactions

### Before (Current - Broken)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ useThreadListAdapter (Hook/Factory)                                            │
└─────────────────────────────────────────────────────────────────────────────────┘

Creates adapter that:
  - Calls api.sessions.list() directly
  - Calls api.sessions.create() directly
  - Calls api.chat.getMessages() directly
  - Has its own error handling logic
  - Duplicates logic from session-service


┌─────────────────────────────────────────────────────────────────────────────────┐
│ IpcChatTransport (Class)                                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

Receives electronAPI, then:
  - Calls api.chat.sendChatStream() directly
  - No business logic layer
```

### After (Target)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ useThreadListAdapter (Hook/Factory)                                            │
└─────────────────────────────────────────────────────────────────────────────────┘

Creates adapter that:
  - Receives sessionService via useService() hook
  - Calls sessionService.listSessions()
  - Calls sessionService.createSession()
  - Calls chatService.getMessages()
  - Delegates error handling to services
  - No duplicated logic


┌─────────────────────────────────────────────────────────────────────────────────┐
│ IpcChatTransport (Class)                                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

Receives chatService, then:
  - Calls chatService.streamChat() or similar method
  - Business logic in service layer
```

## Migration Path

### Phase 1: Services (No Breaking Changes)
1. Update file-service, concept-parsing-service, session-service to use unwrapAPI
2. Keep existing return types
3. Component code unchanged

### Phase 2: Service Additions
1. Add `getMessages()` to chat-service
2. Add any other methods needed by adapters

### Phase 3: Adapters (Internal Refactoring)
1. Update useThreadListAdapter to use services
2. Update IpcChatTransport to use chat-service
3. Update ReadyApp to pass services

### Phase 4: Testing
1. Run all tests
2. Manual verification of chat/thread functionality

## Error Handling

### Current (Inconsistent)

```typescript
// In adapter (useThreadListAdapter)
const data = await unwrapAPI(api.sessions.list(...));

// In file-service (broken)
const items = await electronAPI.readDirectory(...);  // Returns ApiResponse!
return { success: true, data: items };  // items is ApiResponse, not array!
```

### Target (Consistent)

```typescript
// In all services
const items = await unwrapAPI(electronAPI.readDirectory(...));
return { success: true, data: items };

// In adapters - just call service, no unwrap needed
const sessions = await sessionService.listSessions();
return { threads: sessions.map(...) };
```

## Testing Strategy

### Unit Tests
- Mock services instead of electronAPI
- Test business logic in services
- Test adapter behavior with service mocks

### Integration Tests
- Test full flow from adapter → service → electronAPI → handler
- Verify unwrapAPI works correctly
- Verify error handling

### Manual Tests
- FileTree loads without crash
- Chat streaming works
- Thread list loads
- Thread history loads
