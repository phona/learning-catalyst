# Design: Eliminate IPC Double-Wrapping

## Problem Statement

History sessions are displaying as empty due to **double-wrapping** of IPC responses. Some handlers manually wrap their responses in `APIResponse<T>` format, while the `ipc-main-proxy` also wraps all responses, creating a nested structure that the renderer's `unwrapAPI` cannot correctly parse.

### Current Architecture

The codebase has **TWO** response wrapping layers:

1. **`ipc-main-proxy.ts`** - Auto-wraps ALL handler responses:
```typescript
// In createIpcProxy()
const response: ApiResponse = {
  success: true,
  data: result,  // ← Wraps whatever handler returns
  timestamp: new Date(),
};
```

2. **Manual wrappers in handlers** - Some handlers ALSO wrap responses:
```typescript
// In sessions-handlers.ts
const createSuccessResponse = <T>(data: T): APIResponse<T> => ({
  success: true,
  data,  // ← Manual wrap
});
```

### Result: Double-Wrapped Response

```json
{
  "success": true,
  "data": {
    "success": true,    // ← Nested! (from manual wrapper)
    "data": {
      "sessions": [...],
      "total": 10
    }
  },
  "timestamp": "..."
}
```

### Impact

The renderer's `unwrapAPI` returns `response.data`, which gives it:
```json
{
  "success": true,  // ← Inner wrapper
  "data": { "sessions": [...], "total": 10 }
}
```

When the adapter tries to access `data.sessions`, it gets `undefined` because `data` is `{ success: true, data: {...} }`, not `{ sessions: [...] }`.

## Root Cause Analysis

### Affected Handler Files

| File | Wrapping Pattern | Issue |
|------|------------------|-------|
| `sessions-handlers.ts` | `createSuccessResponse`/`createErrorResponse` functions | ~19 calls |
| `chat-handlers.ts` | `createSuccessResponse`/`createErrorResponse` functions | ~2 calls |
| `concept-parsing-handlers.ts` | Inline error responses | 2 places |

### Correct Handler Files (5 files)

| File | Pattern | Status |
|------|---------|--------|
| `knowledge-handlers.ts` | Returns raw data | ✅ Correct |
| `settings-handlers.ts` | Returns raw data | ✅ Correct |
| `analytics-complete-handlers.ts` | Returns raw data | ✅ Correct |
| `filesystem-handlers.ts` | Returns raw data | ✅ Correct |
| `system-handlers.ts` | Returns raw data | ✅ Correct |

### Why This Happened

The `ipc-main-proxy` was introduced later as a centralized wrapper for consistency and logging. However, some handlers already had their own wrapper functions for the `APIResponse` format. When these handlers were registered through the proxy, their responses got wrapped twice.

## Solution Design

### Approach: Remove Manual Wrappers

**Principle**: Handlers should return **raw data only**. The `ipc-main-proxy` is the **single source of truth** for response wrapping.

### Handler Pattern Change

**Before (Double-Wrapped):**
```typescript
ipcMainInstance.handle('sessions:list', async (event, options) => {
  try {
    const sessions = await service.getRecentSessions();
    return createSuccessResponse({ sessions, total: sessions.length });
  } catch (error) {
    return createErrorResponse('code', 'message');
  }
});
```

**After (Single-Wrapped by Proxy):**
```typescript
ipcMainInstance.handle('sessions:list', async (event, options) => {
  // Return raw data - proxy handles wrapping and errors
  const sessions = await service.getRecentSessions();
  return { sessions, total: sessions.length };
});
```

### Error Handling Strategy

The `ipc-main-proxy` already handles errors:

```typescript
// In createIpcProxy()
try {
  const result = await handler(event, params);
  return { success: true, data: result, timestamp: new Date() };
} catch (error) {
  return {
    success: false,
    error: errorInfo.message,
    timestamp: new Date(),
  };
}
```

**Implication**: Handlers don't need try-catch blocks for error wrapping. They can either:
1. Let errors propagate (proxy catches and wraps)
2. Use try-catch for logging only, then re-throw

### Implementation Strategy

#### Phase 1: sessions-handlers.ts (Most Complex)
- Remove `createSuccessResponse` and `createErrorResponse` function definitions
- Replace all `createSuccessResponse(data)` with direct `return data`
- Replace all `createErrorResponse(...)` with `throw new Error(...)`
- Remove `APIResponse` type import
- Simplify try-catch blocks to log and re-throw

#### Phase 2: chat-handlers.ts
- Same pattern as sessions-handlers
- Only 2 wrapper calls to fix

#### Phase 3: concept-parsing-handlers.ts
- Remove inline error response objects
- Simplify try-catch to log and re-throw

### Testing Strategy

1. **Unit Tests**: Update handler tests to expect raw data instead of wrapped responses
2. **Integration Tests**: Verify IPC communication still works correctly
3. **Manual Testing**: Confirm history sessions display properly
4. **Regression Tests**: Ensure no other features are affected

## Architectural Implications

### Benefits

1. **Consistency** - All handlers follow the same pattern
2. **Simplicity** - Less boilerplate code in handlers
3. **Single Responsibility** - Proxy handles ALL wrapping logic
4. **Correctness** - No more double-wrapping bugs

### Risks

1. **Breaking Changes** - Tests expect wrapped responses and will fail
2. **Error Handling** - Need to ensure error codes are still preserved
3. **Backward Compatibility** - None expected (internal refactor)

### Migration Path

The change is isolated to handler return values. The renderer's `unwrapAPI` remains unchanged - it still expects and unwraps `APIResponse<T>`. The proxy ensures this format is always provided.

## Dependencies and Relationships

### Related Specs

- `renderer-ipc-standardization` - Defines `unwrapAPI` pattern for renderer
- `ipc-contract-testing` - Validates IPC handler registration

### Sequencing

This change should be completed **before** any new handler files are created, to establish the correct pattern.

### Future Considerations

1. **Documentation Update** - Add handler pattern guide to developer docs
2. **Lint Rule** - Optionally add ESLint rule to detect manual wrapper usage
3. **Handler Template** - Create a template snippet for new handlers

## Acceptance Criteria

1. ✅ All handler files return raw data (no manual wrappers)
2. ✅ `unwrapAPI` correctly parses all responses
3. ✅ History sessions display in sidebar
4. ✅ All tests pass (updated for new pattern)
5. ✅ No regressions in existing features
6. ✅ Error handling still works correctly
