# Design: Fix KnowledgeGameMap React Rendering Error

## Problem Analysis

### Error Flow

```
APIResponse<{success, data, timestamp}> → Rendered as React child → Error
```

The error occurs when React attempts to render an `APIResponse` object as a direct child element. This is a fundamental React constraint documented in the `render-safety-testing` spec.

### Root Causes

1. **Manual Unwrapping in Component** (`KnowledgeGameMap.tsx:105-120`)
   ```typescript
   const resp = await apiClient.knowledge.getKnowledgeMap();
   const data = resp.data as KnowledgeMapDisplay;
   ```
   - Violates `renderer-ipc-standardization` spec requirement to use `unwrapAPI`
   - Manual `resp.data` access is error-prone and type-unsafe

2. **Incomplete Handler Response** (`knowledge-handlers.ts:141-144`)
   ```typescript
   const responseData = {
     nodes: knowledgeMap.nodes ?? [],
     edges: knowledgeMap.edges ?? [],
   };
   return responseData;
   ```
   - Returns partial `{ nodes, edges }` instead of full `KnowledgeMapDisplay`
   - Missing `layout`, `clusters`, `metadata` fields

3. **Type Structure Mismatch**
   ```
   Handler: { nodes, edges }
   Proxy wraps: { success: true, data: { nodes, edges }, timestamp: ... }
   Component expects: data = KnowledgeMapDisplay = { nodes, edges, layout, clusters, metadata }
   ```

## Solution Design

### Component Fix: Use unwrapAPI

**Location:** `src/renderer/features/knowledge/ui/KnowledgeGameMap.tsx`

**Change:**
```typescript
// Import at top
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';

// In load() function (lines 104-120)
// BEFORE:
const resp = await apiClient.knowledge.getKnowledgeMap();
console.log(`[KnowledgeGameMap:${callId}] IPC response received`, {
  success: resp?.success,
  hasData: !!resp?.data,
  dataType: typeof resp?.data,
  dataIsArray: typeof resp?.data === 'object' && resp?.data !== null ? Array.isArray(resp.data) : 'n/a',
});

if (!resp?.success) {
  const errorMsg = typeof resp.error === 'string'
    ? resp.error
    : resp.error?.message ?? 'Unable to load knowledge map';
  throw new Error(errorMsg);
}

const data = resp.data as KnowledgeMapDisplay;

// AFTER:
const data = await unwrapAPI(apiClient.knowledge.getKnowledgeMap());
```

**Benefits:**
- Automatic unwrapping of `APIResponse<T>` to `T`
- Built-in error handling with toast notifications
- No manual type assertions
- Spec-compliant pattern

### Handler Fix: Return Complete Structure

**Location:** `src/main/handlers/knowledge-handlers.ts`

**Change:**
```typescript
// In knowledge:get-map handler (lines 97-157)
// BEFORE (lines 140-156):
// Verify object structure before sending
const responseData = {
  nodes: knowledgeMap.nodes ?? [],
  edges: knowledgeMap.edges ?? [],
};

handlerLogger.info('Prepared response data for IPC', {
  callId,
  responseNodesCount: responseData.nodes.length,
  responseEdgesCount: responseData.edges.length,
  responseNodesIsArray: Array.isArray(responseData.nodes),
  responseEdgesIsArray: Array.isArray(responseData.edges),
  responseNodesKeys: Object.keys(responseData),
  responseEdgesKeys: Object.keys({ edges: responseData.edges }),
});

return responseData;

// AFTER:
handlerLogger.info('Returning complete KnowledgeMapDisplay', {
  callId,
  nodesCount: knowledgeMap.nodes?.length ?? 0,
  edgesCount: knowledgeMap.edges?.length ?? 0,
  hasLayout: !!knowledgeMap.layout,
  hasClusters: !!knowledgeMap.clusters,
  hasMetadata: !!knowledgeMap.metadata,
});

return knowledgeMap;
```

**Benefits:**
- Returns complete `KnowledgeMapDisplay` structure
- Removes unnecessary data transformation
- Type-safe: service return type matches handler return type
- Spec-compliant with `handler-response-pattern`

## Architectural Alignment

### Spec Compliance Matrix

| Spec | Requirement | Current State | After Fix |
|------|-------------|---------------|-----------|
| `renderer-ipc-standardization` | Use `unwrapAPI` for all IPC calls | ❌ Manual unwrapping | ✅ Uses `unwrapAPI` |
| `handler-response-pattern` | Handlers return raw data | ⚠️ Partial data returned | ✅ Full structure returned |
| `render-safety-testing` | Don't render objects as children | ❌ APIResponse rendered | ✅ Proper data types rendered |

### Pattern Consistency

After this fix, `KnowledgeGameMap` will follow the same pattern as other components:

```typescript
// Standard pattern used in other services
const data = await unwrapAPI(electronAPI.domain.method(params));
```

Examples from codebase:
- `chat-service.ts`: `await unwrapAPI(api.chat.getMessages(threadId))`
- `session-service.ts`: `await unwrapAPI(api.sessions.get(sessionId))`

## Error Handling Flow

### Current (Manual Unwrapping)
```
Handler returns { nodes, edges }
→ Proxy wraps to { success: true, data: { nodes, edges }, timestamp: ... }
→ Component does resp.data
→ If resp is wrong type, silent failure or crash
```

### After Fix (unwrapAPI)
```
Handler returns KnowledgeMapDisplay
→ Proxy wraps to { success: true, data: KnowledgeMapDisplay, timestamp: ... }
→ unwrapAPI extracts data and validates
→ On success: returns KnowledgeMapDisplay
→ On failure: shows toast + throws IPCError
```

## Testing Strategy

### Unit Tests
- Component tests already use mock with `unwrapAPI` pattern
- Tests expect `success: true, data: {...}` structure
- No test changes needed (already compliant)

### Integration Tests
- Test that knowledge map loads without errors
- Test that error toasts display on failures
- Test that context menu works with proper node data

### Manual Testing
1. Navigate to Knowledge page
2. Verify no React errors in console
3. Verify nodes render correctly
4. Test context menu functionality
5. Test error handling (e.g., disable knowledge service)

## Edge Cases Considered

### Empty Knowledge Map
- Service returns empty arrays for nodes/edges
- `unwrapAPI` handles this correctly
- Component shows empty state gracefully

### IPC Failure
- `unwrapAPI` catches error and shows toast
- Component error state displays
- No React crash

### Invalid Node Data
- Service ensures `label` is always a string
- `KnowledgeMapNode` type validated at handler boundary
- Component receives type-safe data

## Dependencies and Relationships

### Related Specs
- **`renderer-ipc-standardization`** - Defines `unwrapAPI` pattern (this fix aligns with it)
- **`handler-response-pattern`** - Requires handlers to return raw data (this fix completes it)
- **`render-safety-testing`** - Documents React constraints (this fix resolves violation)

### Related Code
- `src/renderer/hooks/useElectronAPI.tsx` - Provides `unwrapAPI` helper
- `src/main/handlers/ipc-main-proxy.ts` - Wraps all handler responses
- `src/shared/types/electron-api/knowledge-api.ts` - Defines `KnowledgeMapDisplay` type

## Rollout Strategy

1. **Phase 1**: Update `KnowledgeGameMap.tsx` to use `unwrapAPI`
2. **Phase 2**: Update `knowledge-handlers.ts` to return complete structure
3. **Phase 3**: Run all tests to verify
4. **Phase 4**: Manual testing in dev environment
5. **Phase 5**: Deploy

Both changes can be done in parallel as they affect different processes (renderer vs main).

## Future Considerations

1. **Audit other components** for similar manual unwrapping patterns
2. **Add ESLint rule** to detect direct `resp.data` access
3. **Update handler template** to show correct return pattern
4. **Consider removing RelationGraph children** if they're not needed (separate investigation)
