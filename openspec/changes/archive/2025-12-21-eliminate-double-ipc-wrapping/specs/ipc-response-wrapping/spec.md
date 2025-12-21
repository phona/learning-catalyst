# Spec: IPC Response Wrapping Standardization

**Capability**: Standardize IPC Response Wrapping
**Change ID**: `eliminate-double-ipc-wrapping`

## Summary
Standardize IPC response wrapping across all handlers to eliminate double-wrapping bug and improve consistency.

## ADDED Requirements

### Requirement: Single IPC Response Wrapper
**Priority**: P0 (Critical)
**Effort**: L

All IPC responses MUST be wrapped exactly once by the IPC proxy (`createIpcProxy`).

**Rationale:**
- Eliminates double-wrapping bug
- Single source of truth for response formatting
- Consistent API across all endpoints

**Implementation:**
- Remove all `ok()` calls from handlers
- Remove all `fail()` calls from handlers
- Let `createIpcProxy` handle all wrapping

**Validation:**
- Code review: No `ok()` or `fail()` calls in handlers
- Response structure: `{ success: true, data: <actual_data>, timestamp: ... }`
- Not: `{ success: true, data: { success: true, data: <actual_data> } }`

#### Scenario: sessions:list Returns Single-Wrapped Response
**Given** Database contains 100 learning sessions
**When** Renderer calls `electronAPI.sessions.list({ limit: 100 })`
**Then** Response structure is `{ success: true, data: { sessions: [...], total: 100, hasMore: false }, timestamp: ... }`
**And** Renderer unwraps to `{ sessions: [...], total: 100, hasMore: false }`
**And** Renderer accesses `data.sessions` ✅ (not `data.data.sessions`)
**And** Sidebar displays 100 sessions ✅

---

### Requirement: Direct Return from Handlers
**Priority**: P0 (Critical)
**Effort**: S

IPC handlers MUST return data directly without wrapper functions.

**Before:**
```typescript
return ok({ sessions: [...], total: 100 });
```

**After:**
```typescript
return { sessions: [...], total: 100 };
```

**Validation:**
- Unit tests verify handlers return expected data structures
- TypeScript compilation succeeds

#### Scenario: sessions:create Returns Direct Data
**Given** User creates new session
**When** Renderer calls `electronAPI.sessions.create({ title: "New Chat" })`
**Then** Response structure is `{ success: true, data: { sessionId: string, session: SessionDisplay }, timestamp: ... }`
**And** Renderer unwraps to `{ sessionId: string, session: SessionDisplay }`
**And** Session created successfully ✅

---

### Requirement: Error Handling via Throw
**Priority**: P0 (Critical)
**Effort**: S

IPC handlers MUST throw errors directly instead of returning `fail()` calls.

**Before:**
```typescript
return fail(IPC_ERROR_CODES.sessions.notFound, 'Session not found');
```

**After:**
```typescript
throw new Error('Session not found');
```

**Validation:**
- Error flow unchanged (proxy catches and wraps)
- Error tests pass
- Renderer receives structured errors

#### Scenario: Error Handling Preserves Behavior
**Given** Handler encounters error
**When** Handler executes `throw new Error('Session not found')`
**Then** IPC proxy catches error
**And** Response structure is `{ success: false, error: 'Session not found', timestamp: ... }`
**And** Renderer unwrapAPI throws IPCError
**And** Error displayed to user ✅

---

### Requirement: Renderer Accesses data.field
**Priority**: P0 (Critical)
**Effort**: S

Renderer code MUST access data as `data.field` (not `data.data.field`).

**Before:**
```typescript
const sessions = Array.isArray(data?.data?.sessions) ? data.data.sessions : [];
```

**After:**
```typescript
const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
```

**Validation:**
- ThreadListAdapter uses `data.sessions`
- Sidebar shows session history
- No runtime errors

#### Scenario: ThreadListAdapter Accesses Correct Path
**Given** sessions:list returns 100 sessions
**When** ThreadListAdapter calls `unwrapAPI(resolvedApi.sessions.list())`
**Then** data equals `{ sessions: [...], total: 100 }` (after unwrapAPI)
**And** data.sessions equals array of 100 sessions ✅
**And** data.total equals 100 ✅
**And** Sidebar renders all sessions ✅

## MODIFIED Requirements

### Requirement: IPC Proxy Wrapping Behavior
**Priority**: P0 (Critical)
**Effort**: M

IPC proxy SHALL wrap ALL handler responses (no detection needed).

**Before:**
- Proxy auto-wrapped all responses
- Handlers also wrapped with `ok()`/`fail()`
- Result: double-wrapped

**After:**
- Proxy wraps all responses
- Handlers return raw data
- Result: single-wrapped

**Validation:**
- Response has exactly one `success` field
- Response has exactly one `data` field
- Response has `timestamp` field

#### Scenario: learning:get-recent-sessions Returns Single-Wrapped Data
**Given** User has 10 learning sessions
**When** Renderer calls `electronAPI.learning.getRecentSessions({ limit: 10 })`
**Then** Response structure is `{ success: true, data: LearningSession[], timestamp: ... }`
**And** Renderer unwraps to `LearningSession[]`
**And** Sessions displayed in UI ✅

---

### Requirement: Handler Error Flow
**Priority**: P0 (Critical)
**Effort**: M

Handlers SHALL throw errors directly instead of using `fail()` helper.

**Before:**
```typescript
try {
  const result = await service.method();
  return ok(result);
} catch (error) {
  return fail(code, message);
}
```

**After:**
```typescript
try {
  const result = await service.method();
  return result;
} catch (error) {
  throw new Error(message);
}
```

**Validation:**
- Errors caught by proxy's catch block
- Error structure: `{ success: false, error: string, timestamp: Date }`
- unwrapAPI in renderer throws IPCError

#### Scenario: chat:generate-title Handles Errors Correctly
**Given** User sends message "What is React?"
**When** Renderer calls `electronAPI.chat.generateTitle("What is React?")`
**Then** Response structure is `{ success: true, data: string, timestamp: ... }`
**And** Renderer unwraps to `string` (the generated title)
**And** Title displayed in UI ✅

## REMOVED Requirements

### Requirement: Remove ok() Helper Function
**Priority**: P0 (Critical)
**Effort**: S

IPC handlers MUST NOT use `ok()` helper function.

**Before:**
```typescript
const ok = <T>(data?: T): APIResponse<T> => ({ success: true, data });
```

**After:**
- Helper function removed
- Direct returns used instead

**Validation:**
- No `ok(` usage in handler files
- Code compiles without errors

### Requirement: Remove fail() Helper Function
**Priority**: P0 (Critical)
**Effort**: S

IPC handlers MUST NOT use `fail()` helper function.

**Before:**
```typescript
const fail = (code: string, message: string): APIResponse<never> => ({
  success: false,
  error: { code, message },
});
```

**After:**
- Helper function removed
- Direct throws used instead

**Validation:**
- No `fail(` usage in handler files
- Error handling still works correctly

## Acceptance Criteria

1. ✅ All 42 `ok()`/`fail()` calls removed from handler files
2. ✅ ThreadListAdapter accesses `data.sessions` (not `data.data.sessions`)
3. ✅ Session sidebar shows 100+ historical sessions
4. ✅ All IPC endpoints return single-wrapped responses
5. ✅ All existing tests pass
6. ✅ No TypeScript compilation errors
7. ✅ Error handling behavior unchanged
8. ✅ Documentation updated

## Notes

- This change is architectural improvement, not feature addition
- Double-wrapping was accidental bug, not intentional design
- New pattern is cleaner and more maintainable
- Future IPC handlers should follow this pattern automatically
