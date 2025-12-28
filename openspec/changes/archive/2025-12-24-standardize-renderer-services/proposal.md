# Proposal: Consistent Renderer Service Layer

**Change ID**: `standardize-renderer-services`
**Status**: Applied
**Created**: 2025-12-24
**Updated**: 2025-12-24

## Summary

Establish a consistent renderer service layer architecture where:
1. All services use `unwrapAPI` for IPC communication
2. All UI components/adapters use services instead of calling `electronAPI` directly

This eliminates two sources of bugs:
- Services that don't unwrap IPC responses (causing nested API response objects)
- Adapters that bypass the service layer (violating separation of concerns)

## Why

The renderer service layer architecture has two inconsistencies that cause bugs and violate separation of concerns:

1. **Services not using `unwrapAPI`**: Some services manually unwrap IPC responses or don't unwrap at all, causing nested `{success, data, timestamp}` objects to leak into component code. This caused the FileTree component crash where a full API response object was rendered as a React child.

2. **Adapters bypassing the service layer**: `useThreadListAdapter` and `IpcChatTransport` call `electronAPI` directly instead of using services. This violates the architectural pattern where services encapsulate business logic and data access.

These inconsistencies make the codebase harder to maintain, test, and extend.

## What Changes

### Services Updated to Use unwrapAPI

- **file-service.ts**: All IPC methods now use `unwrapAPI` (readDirectory, getWorkspacePath, readFile, writeFile, existsFile)
- **concept-parsing-service.ts**: Replaced manual `result.success` checks with `unwrapAPI`
- **session-service.ts**: Added `unwrapAPI` to `getGlobalStatistics()` and `searchSessions()` methods

### Adapters Refactored to Use Services

- **useThreadListAdapter.tsx**: Now accepts `{ sessionService, chatService }` and uses services for all operations
- **ReadyApp.tsx**: Creates `threadListAdapter` with services instead of raw `electronAPI`
- **ThreadHistoryProvider**: Receives `chatService` for message loading via adapter context

### Service Extensions

- **chat-service.ts**: Added `getMessages(threadId, options)` method for thread history loading

## Problem Statement

### Current State - Two Issues

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ISSUE 1: SERVICES NOT USING unwrapAPI                                           │
└─────────────────────────────────────────────────────────────────────────────────┘

✅ SERVICES USING unwrapAPI CORRECTLY:
  - analytics-service.ts    → All methods use unwrapAPI
  - configuration-service.ts → All methods use unwrapAPI
  - chat-service.ts          → All methods use unwrapAPI
  - discovery-service.ts     → All methods use unwrapAPI
  - catalyst-service.ts      → Most methods use unwrapAPI

❌ SERVICES NOT USING unwrapAPI (MANUAL UNWRAPPING):
  - file-service.ts           → Direct electronAPI calls, no unwrapping
  - concept-parsing-service.ts → Manual response.success checks
  - session-service.ts         → getGlobalStatistics() missing unwrapAPI


┌─────────────────────────────────────────────────────────────────────────────────┐
│ ISSUE 2: UI ADAPTERS BYPASSING SERVICE LAYER                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

❌ ADAPTERS CALLING electronAPI DIRECTLY (should use services):
  - useThreadListAdapter.tsx  → Calls api.sessions.*, api.chat.* directly
  - IpcChatTransport.ts        → Calls api.chat.sendChatStream() directly
  - ReadyApp.tsx               → Passes raw electronAPI to adapters

✅ CORRECT PATTERN (for reference):
  - Most feature components    → Use services via useService()
  - App infrastructure         → Use electronAPI for lifecycle only
```

### Impact - Issue 1: Services Not Using unwrapAPI

**FileTree Crash Bug**:
```
electronAPI.getWorkspacePath() returns: {success, data, timestamp}
       ↓
file-service treats it as raw path (not unwrapping)
       ↓
FileTree sets currentPath = {success, data, timestamp} object
       ↓
React tries to render object in <span>{currentPath}</span>
       ↓
💥 CRASH: "Objects are not valid as a React child"
```

### Impact - Issue 2: Adapters Bypassing Service Layer

**Architectural Violation**:
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ VIOLATED ARCHITECTURE                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘

Component/Adapter          Service Layer                  electronAPI
     (UI)                        (Business Logic)              (IPC)

useThreadListAdapter  ─────────────────────────────────────────→  api.sessions.*
IpcChatTransport      ─────────────────────────────────────────→  api.chat.*

Should Be:

useThreadListAdapter  ─────────→  sessionService  ─────────→  api.sessions.*
IpcChatTransport      ─────────→  chatService      ─────────→  api.chat.*
```

**Consequences**:
- No single responsibility - adapters mix data access and business logic
- Harder to test - must mock electronAPI instead of service
- Inconsistent error handling - each adapter implements own pattern
- Duplicated logic - session operations duplicated between session-service and adapter
- Cannot add business logic to services without updating adapters

## Root Cause

1. **Services not using unwrapAPI**: `ipc-main-proxy` auto-wraps all handler responses in `{success, data, timestamp}`, but some services were written before `unwrapAPI` pattern was established

2. **Adapters bypassing service layer**: `useThreadListAdapter` and `IpcChatTransport` were created before services existed, and never refactored to use them

## Solution

### Part 1: Fix Services to Use unwrapAPI

Update all renderer services to use `unwrapAPI` consistently:
1. **file-service.ts**: Use `unwrapAPI` for all IPC methods (readDirectory, getWorkspacePath, readFile, writeFile, existsFile)
2. **concept-parsing-service.ts**: Replace manual `result.success` checks with `unwrapAPI`
3. **session-service.ts**: Add `unwrapAPI` to `getGlobalStatistics()` method

### Part 2: Refactor Adapters to Use Services

Refactor UI adapters to use services instead of direct `electronAPI`:
1. **useThreadListAdapter.tsx**: Use `sessionService` for session operations, `chatService` for message operations
2. **IpcChatTransport.ts**: Use `chatService` for stream operations
3. **ReadyApp.tsx**: Pass services to adapters instead of raw `electronAPI`

### Design Decision - Keep Service Return Types

**For part 1**: Keep existing service return types (like `FileOperationResult<T>`) for backward compatibility:
```typescript
// Pattern: unwrapAPI internally, keep existing return type
const readDirectory = async (...): Promise<FileOperationResult<T[]>> => {
  try {
    const items = await unwrapAPI(electronAPI.readDirectory(...));
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: { code: ..., message: ... } };
  }
};
```

**For part 2**: Adapters may need service method additions if current services don't expose needed operations.

## Dependencies

- Builds on existing `unwrapAPI` helper from `@/renderer/hooks/useElectronAPI`
- Related to: `standardize-renderer-ipc-calls` OpenSpec
- Extends: `renderer-ipc-standardization` spec
- Requires: Updates to `session-service` and `chat-service` to support adapter needs

## Out of Scope

- UI feature component changes (already confirmed they use services correctly)
- App infrastructure using electronAPI for lifecycle (AppContent, SetupPage)
- Main process handler changes (already return raw data correctly)
- Removing service wrapper types like `FileOperationResult` (future refactoring)

## Alternatives Considered

### Alternative 1: Keep Adapters Directly Calling electronAPI
**Pros**: No changes to adapters
**Cons**: Violates service layer architecture, duplicated logic, harder to test
**Decision**: Rejected - architectural inconsistency

### Alternative 2: Remove Services Entirely
**Pros**: Simpler architecture
**Cons**: Lose separation of concerns, harder to test, no business logic layer
**Decision**: Rejected - violates established architecture pattern

### Alternative 3: Create New Services Just for Adapters
**Pros**: Clear separation
**Cons**: Code duplication between existing services and adapter services
**Decision**: Rejected - unnecessary duplication

## Success Criteria

1. ✅ All renderer services use `unwrapAPI` for IPC calls
2. ✅ All UI adapters use services instead of direct `electronAPI`
3. ✅ FileTree component loads directories without crash
4. ✅ No manual `response.success` or `response.data` checks in services
5. ✅ Thread list operations go through `sessionService`
6. ✅ Chat streaming goes through `chatService`
7. ✅ Existing tests pass with minimal changes
8. ✅ Error handling works consistently (IPCError thrown, toasts displayed)
9. ✅ TypeScript compilation succeeds

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing adapter consumers | Keep adapter interfaces stable, only internal implementation changes |
| Services don't expose methods adapters need | Add required methods to services as part of this change |
| Test failures from behavior changes | Tests mock services, minimal behavior change |
| Circular dependency issues | Adapters receive services via constructor or useService() hook |
| Performance regression | Service layer overhead is negligible (indirection) |
