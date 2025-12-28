# Proposal: Eliminate IPC Double-Wrapping

**Change ID**: `eliminate-ipc-double-wrapping`
**Status**: Proposed
**Created**: 2025-12-24
**Author**: AI Assistant

## Summary

Fix empty history sessions bug by removing manual response wrappers from IPC handlers. The `ipc-main-proxy` already wraps all responses in `APIResponse<T>` format, but some handlers also manually wrap their responses, causing double-wrapping that breaks the renderer's response parsing.

## Why

**User-Visible Issue**: History sessions sidebar shows empty list despite sessions existing in the database.

**Root Cause**: Three handler files manually wrap their responses in `APIResponse<T>` format, but the `ipc-main-proxy` also wraps all handler responses. This creates a nested response structure:

```json
{
  "success": true,
  "data": {
    "success": true,    // ← Nested wrapper
    "data": {
      "sessions": [...]
    }
  }
}
```

The renderer's `unwrapAPI` extracts `response.data`, giving it `{ success: true, data: {...} }` instead of the expected `{ sessions: [...] }`.

## Affected Code

### Handlers with Manual Wrappers (Need Fixing)

| File | Issue | Count |
|------|-------|-------|
| `src/main/handlers/sessions-handlers.ts` | `createSuccessResponse`/`createErrorResponse` functions | ~19 calls |
| `src/main/handlers/chat-handlers.ts` | `createSuccessResponse`/`createErrorResponse` functions | ~2 calls |
| `src/main/handlers/concept-parsing-handlers.ts` | Inline error responses | 2 places |

### Handlers Already Correct (No Action Needed)

| File | Pattern |
|------|---------|
| `src/main/handlers/knowledge-handlers.ts` | Returns raw data ✅ |
| `src/main/handlers/settings-handlers.ts` | Returns raw data ✅ |
| `src/main/handlers/analytics-complete-handlers.ts` | Returns raw data ✅ |
| `src/main/handlers/filesystem-handlers.ts` | Returns raw data ✅ |
| `src/main/handlers/system-handlers.ts` | Returns raw data ✅ |

## What Changes

**Remove all manual response wrappers from handlers.** Let the `ipc-main-proxy` be the single source of truth for response wrapping.

### Pattern Change

**Before:**
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

**After:**
```typescript
ipcMainInstance.handle('sessions:list', async (event, options) => {
  const sessions = await service.getRecentSessions();
  return { sessions, total: sessions.length };  // Raw data, proxy wraps it
});
```

### Key Changes

1. **Remove wrapper function definitions** (`createSuccessResponse`, `createErrorResponse`)
2. **Replace wrapper calls with direct returns**
3. **Simplify error handling** - let proxy catch and wrap errors
4. **Remove `APIResponse` type imports** (no longer needed in handlers)

## Implementation

### Scope

- **Files Changed**: 3 handler files
- **Lines Changed**: ~25 lines total
- **Tests Updated**: Handler tests to expect raw data
- **Breaking Changes**: Internal only (renderer's `unwrapAPI` unchanged)

### Phases

1. **Phase 1**: `sessions-handlers.ts` (most complex, ~19 changes)
2. **Phase 2**: `chat-handlers.ts` (simple, ~2 changes)
3. **Phase 3**: `concept-parsing-handlers.ts` (simple, 2 changes)

### Testing

- Update handler tests to expect raw data instead of wrapped responses
- Verify history sessions display correctly
- Run full test suite to catch regressions
- Manual testing of affected features (sessions list, chat, concept parsing)

## Impact

### User-Facing Benefits

- ✅ History sessions display correctly
- ✅ No response parsing errors
- ✅ Consistent error handling

### Developer Benefits

- ✅ Simpler handler code (less boilerplate)
- ✅ Consistent pattern across all handlers
- ✅ Single source of truth for wrapping logic

### Risks

- **Test Failures**: Expected - tests will need updates for new pattern
- **Error Codes**: Need to ensure error information is still preserved through proxy
- **Regressions**: Low risk - isolated to handler return values

## Dependencies

### Related Specs

- `renderer-ipc-standardization` - Defines `unwrapAPI` pattern
- `ipc-contract-testing` - Validates IPC handlers

### Prerequisites

None - this is a standalone refactor

### Sequencing

Should be completed before creating any new handler files to establish correct pattern.

## Success Criteria

1. ✅ All 3 handler files return raw data
2. ✅ History sessions display in sidebar
3. ✅ All tests pass (updated for new pattern)
4. ✅ No regressions in existing features
5. ✅ Error handling still works correctly

## Alternatives Considered

### Alternative 1: Remove Proxy Wrapping

**Approach**: Remove wrapping from `ipc-main-proxy`, keep manual wrappers in handlers.

**Rejected Because**:
- Loses centralized logging and error handling
- Each handler would need to implement wrapping consistently
- More code duplication across handlers

### Alternative 2: Keep Both Wrappers, Fix Renderer

**Approach**: Update `unwrapAPI` to handle double-wrapped responses.

**Rejected Because**:
- Band-aid solution that doesn't fix root cause
- More complex parsing logic
- Doesn't establish consistent pattern

### Alternative 3: Selective Wrapping

**Approach**: Only wrap in handlers that "need" it, proxy detects and skips.

**Rejected Because**:
- Adds complexity to proxy logic
- Inconsistent patterns across handlers
- Difficult to determine which handlers "need" it

## Open Questions

None - the solution is straightforward and well-defined.

## Documentation Updates

After implementation:
1. Add handler pattern guide to developer documentation
2. Update IPC handler examples in docs
3. Add comment in handler files pointing to proxy for wrapping logic
