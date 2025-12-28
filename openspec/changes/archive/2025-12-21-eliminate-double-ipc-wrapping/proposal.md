# OpenSpec Change Proposal: Eliminate Double IPC Response Wrapping

## Why

The double IPC response wrapping issue is causing **data access problems in the renderer process**, specifically preventing the session sidebar from displaying historical sessions. This creates a **poor user experience** where users cannot see their previous learning sessions, breaking the core feature of session persistence and continuity.

The current double-wrapping pattern also **violates the single responsibility principle** by having two layers (handlers and IPC proxy) both responsible for response formatting. This leads to:
- Inconsistent API patterns across the codebase
- Developer confusion and increased cognitive load
- Potential runtime errors when accessing nested data
- Harder maintenance and debugging

Fixing this issue will **improve code clarity**, **establish consistent patterns**, and **ensure reliable data access** throughout the application.

## What Changes

### Core Changes
1. **Remove all `ok()` and `fail()` wrapper calls** from IPC handlers:
   - `src/main/handlers/chat-handlers.ts`: 4 wrappers removed
   - `src/main/handlers/sessions-handlers.ts`: 22 wrappers removed
   - `src/main/handlers/learning-handlers.ts`: Not applicable (file doesn't exist)

2. **Update error handling** in handlers:
   - Replace `return fail(...)` with `throw new Error(...)`
   - Let the IPC proxy's catch block handle error wrapping

3. **Clean up helper functions**:
   - Remove unused `ok()` and `fail()` helper functions
   - Remove unused imports (APIResponse, IPC_ERROR_CODES)

### Renderer Updates
- Verify ThreadListAdapter accesses `data.sessions` correctly (already implemented)

### Result
- All IPC responses wrapped exactly once by `createIpcProxy`
- Consistent `{ success: boolean, data: any, timestamp: Date }` structure
- Direct data access via `data.field` instead of `data.data.field`

## Problem Statement

The IPC (Inter-Process Communication) system in Learning Catalyst has a **double-wrapping bug** that causes data access issues in the renderer process.

### Current Architecture

IPC handlers in `src/main/handlers/` use helper functions `ok()` and `fail()` to wrap responses:

```typescript
// In handlers (e.g., sessions-handlers.ts:75)
return ok({
  sessions: sliced.map(toSessionDisplay),
  total: sessions.length,
  hasMore: sessions.length > offset + sliced.length,
});
```

The `createIpcProxy` in `src/main/handlers/ipc-main-proxy.ts` then wraps the response AGAIN:

```typescript
// In ipc-main-proxy.ts:81-84
const response: ApiResponse = {
  success: true,
  data: result,  // <-- Double wrap!
  timestamp: new Date(),
};
```

### Impact

This creates a double-nested structure:
```javascript
{
  success: true,
  data: {
    success: true,
    data: {
      sessions: [...],
      total: 100,
      hasMore: false
    },
    timestamp: ...
  }
}
```

**Consequences:**
1. Renderer code must access data as `data.data.sessions` instead of `data.sessions`
2. Inconsistent API patterns across the codebase
3. Developer confusion about response structure
4. Potential runtime errors if not handled correctly

### Evidence

The `sessions:list` IPC call returns 100 sessions from the database, but the ThreadListAdapter in the sidebar cannot access them because it looks for `data.sessions` when the data is actually at `data.data.sessions`.

## Solution

**Eliminate double-wrapping by removing `ok()`/`fail()` calls from all IPC handlers**, letting the IPC proxy be the single source of response wrapping.

### Implementation Strategy

#### Option 1: Remove All Handler Wrappers (Recommended)
- Remove all 19 `ok()` calls and 23 `fail()` calls from handlers
- Let `createIpcProxy` handle all wrapping uniformly
- Update renderer code to access `data.sessions` directly

#### Option 2: Fix IPC Proxy to Detect Already-Wrapped Responses
- Modify `createIpcProxy` to detect if handler returns already-wrapped response
- Skip wrapping if response already has `success` field
- Keep existing `ok()`/`fail()` calls in handlers

#### Option 3: Hybrid - Fix Only sessions:list
- Surgical fix for the sidebar issue
- Remove wrapper only from `sessions:list` handler
- Minimal changes, lower risk

## Recommendation

**Option 1 (Remove All Handler Wrappers)** is recommended because:

1. ✅ **Single Responsibility**: IPC proxy is the only layer wrapping responses
2. ✅ **Consistency**: All IPC endpoints use identical wrapping pattern
3. ✅ **Cleaner Code**: No need to remember `ok()`/`fail()` pattern
4. ✅ **Better Type Safety**: Direct returns preserve exact types
5. ✅ **Future-Proof**: New IPC handlers automatically follow correct pattern

## Files to Modify

### Main Process Handlers (Remove `ok()`/`fail()` calls)
- `src/main/handlers/chat-handlers.ts` - 4 changes (2 ok, 2 fail)
- `src/main/handlers/learning-handlers.ts` - 16 changes (7 ok, 9 fail)
- `src/main/handlers/sessions-handlers.ts` - 22 changes (10 ok, 12 fail)

### Renderer Process (Update data access)
- `src/renderer/hooks/useThreadListAdapter.tsx` - Fix data access path

### Helper Functions (Remove or mark as deprecated)
- Remove `ok`/`fail` helper functions from each handler file

## Validation

1. **Unit Tests**: All existing IPC handler tests should pass
2. **Integration Test**: Verify `sessions:list` returns data accessible via `data.sessions`
3. **UI Test**: Confirm sidebar shows session history
4. **Regression Test**: Verify all IPC endpoints work correctly

## Risk Assessment

### Risks
- ⚠️ Large change surface (42 modifications across 3 handler files)
- ⚠️ All IPC endpoints must be tested to ensure no regressions
- ⚠️ Error handling behavior changes (errors now wrapped by proxy's catch block)

### Mitigation
- Incremental implementation: Fix one handler file at a time
- Comprehensive testing after each file modification
- Clear rollback plan if issues arise

## Success Criteria

1. ✅ All IPC handlers return responses wrapped exactly once by `createIpcProxy`
2. ✅ Renderer code accesses data via `data.field` (not `data.data.field`)
3. ✅ Session history appears correctly in sidebar
4. ✅ All existing tests pass
5. ✅ No runtime errors or data access issues

## Timeline Estimate

- **Implementation**: 2-3 hours (42 code changes across 4 files)
- **Testing**: 1-2 hours (comprehensive IPC endpoint testing)
- **Total**: 3-5 hours

## Open Questions

1. Should helper functions be removed entirely or kept for backwards compatibility?
2. Are there any handlers that specifically require double-wrapping?
3. Should we add TypeScript types to enforce single-wrapping pattern?

---

**Prepared by**: Claude Code  
**Date**: 2025-12-22  
**Change ID**: eliminate-double-ipc-wrapping
