# Design Document: Eliminate Double IPC Response Wrapping

## Architecture Overview

### Current Architecture (Broken)

```
┌─────────────────────────────────────────────────────────┐
│  IPC Handler (sessions-handlers.ts)                     │
│  return ok({ sessions: [...], total: 100 })             │
│  └─ Returns: { success: true, data: { sessions: [...] } }│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  IPC Proxy (ipc-main-proxy.ts)                          │
│  Auto-wraps response again                              │
│  └─ Returns: { success: true,                          │
│              data: { success: true,                     │
│                      data: { sessions: [...] } },       │
│              timestamp: ... }                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Renderer (useThreadListAdapter.tsx)                    │
│  unwrapAPI() removes outer wrapper →                    │
│  data = { success: true, data: { sessions: [...] } }   │
│  ❌ Bug: Accessing data.sessions returns undefined      │
│  ✅ Workaround: data.data.sessions works                │
└─────────────────────────────────────────────────────────┘
```

### Target Architecture (Fixed)

```
┌─────────────────────────────────────────────────────────┐
│  IPC Handler (sessions-handlers.ts)                     │
│  return { sessions: [...], total: 100 }                 │
│  └─ Returns: { sessions: [...], total: 100 }            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  IPC Proxy (ipc-main-proxy.ts)                          │
│  Single wrapping                                        │
│  └─ Returns: { success: true,                          │
│              data: { sessions: [...], total: 100 },     │
│              timestamp: ... }                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Renderer (useThreadListAdapter.tsx)                    │
│  unwrapAPI() removes wrapper →                          │
│  data = { sessions: [...], total: 100 }                │
│  ✅ Correct: data.sessions works!                       │
└─────────────────────────────────────────────────────────┘
```

## Design Decisions

### Decision 1: Remove Handler Wrappers (Not Fix Proxy)

**Options Considered:**
1. ✅ **Remove all `ok()`/`fail()` calls from handlers**
2. Modify IPC proxy to detect already-wrapped responses
3. Hybrid approach (fix only `sessions:list`)

**Decision:** Option 1 - Remove handler wrappers

**Rationale:**
- **Single Responsibility Principle**: IPC proxy should be the only layer wrapping responses
- **Consistency**: All IPC endpoints follow identical pattern
- **Simplicity**: No need for complex detection logic in proxy
- **Maintainability**: Future developers don't need to remember `ok()`/`fail()` pattern
- **Type Safety**: Direct returns preserve exact TypeScript types

**Trade-offs:**
- Larger change surface (42 modifications)
- Requires testing all IPC endpoints
- Changes error handling behavior (errors now wrapped by proxy's catch block)

### Decision 2: Throw Errors Instead of Returning `fail()`

**Current Pattern:**
```typescript
return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
```

**New Pattern:**
```typescript
throw new Error('Session not found');
```

**Rationale:**
- IPC proxy already has try/catch block that wraps errors
- Consistent with standard JavaScript error handling
- Cleaner code (no need for `fail()` wrapper)
- Errors automatically get structured error payload from proxy

**Example:**
```typescript
// In ipc-main-proxy.ts
try {
  const result = await handler(event, params);
  return {
    success: true,
    data: result,
    timestamp: new Date(),
  };
} catch (error) {
  const errorInfo = mapError ? mapError(error) : {
    code: 'HANDLER_ERROR',
    message: error instanceof Error ? error.message : String(error),
  };

  return {
    success: false,
    error: errorInfo.message,
    timestamp: new Date(),
  };
}
```

### Decision 3: Keep Helper Functions or Remove?

**Options:**
1. Remove `ok()`/`fail()` functions entirely
2. Keep but mark as deprecated
3. Keep for backwards compatibility

**Decision:** Remove functions entirely

**Rationale:**
- No longer needed with new pattern
- Prevents future developers from accidentally using them
- Cleaner code (fewer unused functions)
- Any usage would be a bug, so better to fail fast

**Migration Path:**
- Search codebase for `ok(` and `fail(` to find any remaining usages
- Remove or replace with direct returns/throws

## Error Handling Strategy

### Current Error Flow
```
Handler throws error
  → Caught by ipc-main-proxy
  → Wrapped as { success: false, error: ..., timestamp: ... }
  → Renderer receives via unwrapAPI
  → unwrapAPI throws IPCError with code
```

### New Error Flow (Same!)
```
Handler throws error (now directly, not via fail())
  → Caught by ipc-main-proxy
  → Wrapped as { success: false, error: ..., timestamp: ... }
  → Renderer receives via unwrapAPI
  → unwrapAPI throws IPCError with code
```

**Benefit:** Error handling behavior is unchanged! Only success responses are affected.

## Type Safety Considerations

### Before (Double-Wrapped)
```typescript
// In renderer
const data = await unwrapAPI(resolvedApi.sessions.list());
// Type of data: { success: true, data: { sessions: SessionDisplay[] } }
const sessions = data.data.sessions; // Must use .data.data
```

### After (Single-Wrapped)
```typescript
// In renderer
const data = await unwrapAPI(resolvedApi.sessions.list());
// Type of data: { sessions: SessionDisplay[], total: number, hasMore: boolean }
const sessions = data.sessions; // Clean access!
```

**Type Safety Improvement:**
- Direct returns preserve exact return types from handlers
- No synthetic `success` field added by handler
- TypeScript can properly infer and validate types

## Testing Strategy

### Unit Tests
- Each handler file has corresponding test file
- Tests should pass without modification (they test behavior, not implementation)
- Verify handlers return expected data structures

### Integration Tests
- Test IPC calls end-to-end
- Verify response wrapping is correct
- Check error handling

### UI Tests
- Test session sidebar shows history
- Test chat functionality
- Test learning features

### Regression Testing
- Run full test suite: `npm run test:complete`
- Verify no unexpected failures
- Check for TypeScript compilation errors

## Migration Path

### Phase 1: sessions-handlers.ts (Priority)
1. Remove `ok()`/`fail()` calls
2. Fix ThreadListAdapter
3. Verify sidebar works

### Phase 2: learning-handlers.ts
1. Remove `ok()`/`fail()` calls
2. Run tests

### Phase 3: chat-handlers.ts
1. Remove `ok()`/`fail()` calls
2. Run tests

### Phase 4: Cleanup
1. Remove helper functions
2. Full test suite
3. Documentation

## Validation Criteria

### Functional
- [ ] Session sidebar shows 100+ historical sessions
- [ ] All IPC endpoints return data in expected format
- [ ] Error handling works correctly
- [ ] No runtime errors

### Technical
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Code compiles cleanly

### Quality
- [ ] Code is cleaner and more maintainable
- [ ] Single source of truth for IPC wrapping
- [ ] Future-proof design

## Risks and Mitigation

### Risk 1: Breaking Existing IPC Calls
**Impact:** High - Could break multiple features
**Mitigation:**
- Incremental implementation (one file at a time)
- Test after each change
- Have rollback plan ready

### Risk 2: Forgetting to Test Some IPC Endpoint
**Impact:** Medium - Some feature might break
**Mitigation:**
- Comprehensive test suite
- Manual testing of all features
- Code review

### Risk 3: Error Handling Changes
**Impact:** Low - Error flow is unchanged
**Mitigation:**
- Verify error tests still pass
- Test error scenarios manually

## Conclusion

This design eliminates the double-wrapping bug by:
1. Removing wrapper functions from handlers
2. Letting IPC proxy handle all wrapping
3. Simplifying the codebase
4. Improving type safety

The change is well-scoped, has clear validation criteria, and includes a solid rollback plan. The architectural improvement (single responsibility for wrapping) makes the codebase more maintainable long-term.
