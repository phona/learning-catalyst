# OpenSpec Change: Standardize All Renderer IPC Calls

## Why

The renderer process currently has **inconsistent IPC calling patterns** that lead to:

1. **Manual Unwrapping** (verbose, error-prone):
   ```typescript
   const response = await electronAPI.someMethod(...);
   const data = response?.data || [];
   return { success: response?.success === true, data };
   ```

2. **Direct Calls Without Unwrapping** (causes runtime bugs):
   ```typescript
   const items = await electronAPI.readDirectory(...); // Returns {success, data, timestamp}!
   // Later: {item.name} fails because item is wrapped response
   ```

These patterns cause:
- Runtime errors: "Objects are not valid as a React child"
- Inconsistent error handling
- Code duplication
- Developer confusion

## What Changes

**Standardize all renderer IPC calls** to use the existing `unwrapAPI` helper from `@/renderer/hooks/useElectronAPI.tsx`:

```typescript
// Clean, safe pattern:
const data = await unwrapAPI(electronAPI.someMethod(...));
return { success: true, data };
```

## Benefits

1. **Automatic Error Handling** - `unwrapAPI` shows toasts and throws structured errors
2. **50% Less Code** - No manual response unwrapping
3. **Type Safety** - TypeScript ensures proper usage
4. **Consistency** - All IPC calls use same pattern
5. **User-Friendly** - Errors automatically display as toasts

## Scope

**Files to Update:**
- `src/renderer/services/file/file-service.ts` (Priority 1 - Critical)
- `src/renderer/services/chat/chat-service.ts` (Priority 1 - Critical)
- `src/renderer/services/sessions/session-service.ts` (Priority 2)
- `src/renderer/services/settings/settings-service.ts` (Priority 2)
- `src/renderer/services/analytics/analytics-service.ts` (Priority 2)
- Other service files (Priority 3-4)

## Acceptance Criteria

- [ ] All IPC calls use `unwrapAPI` helper
- [ ] No manual unwrapping patterns (`response?.data`)
- [ ] Components receive clean, unwrapped data
- [ ] Error handling is consistent across all services
- [ ] Tests updated to match new patterns
- [ ] No runtime errors from object rendering

## Breaking Changes

None. This is a refactor that improves existing functionality without changing APIs.

## Migration Path

1. Update service files to use `unwrapAPI`
2. Update tests to match new patterns
3. Verify no regressions
4. Update developer documentation

## Test Plan

- Unit tests for each updated service
- Integration tests for IPC flow
- Manual testing of error scenarios
- Verify error toasts display correctly
