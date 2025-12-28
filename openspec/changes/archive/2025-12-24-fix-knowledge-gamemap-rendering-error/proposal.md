# Proposal: Fix KnowledgeGameMap React Rendering Error

## Change ID
`fix-knowledge-gamemap-rendering-error`

## Summary

Fix a React rendering error in the KnowledgeGameMap component where an `APIResponse` object (`{success, data, timestamp}`) is being rendered as a React child instead of the expected node data. This error violates both the `renderer-ipc-standardization` and `handler-response-pattern` specs.

## Problem Statement

The KnowledgeGameMap component crashes with:
```
Uncaught Error: Objects are not valid as a React child (found: object with keys {success, data, timestamp})
```

This occurs because:

1. **Component violates `renderer-ipc-standardization` spec**: The component manually unwraps IPC responses (`resp.data`) instead of using the `unwrapAPI` helper
2. **Handler returns incomplete data structure**: The `knowledge:get-map` handler returns `{ nodes, edges }` instead of the full `KnowledgeMapDisplay` structure
3. **Type mismatch**: After proxy wrapping, the response is `{ success: true, data: { nodes, edges }, timestamp: ... }`, but the component expects `data` to have the full `KnowledgeMapDisplay` structure

## Affected Components

- `src/renderer/features/knowledge/ui/KnowledgeGameMap.tsx` - Renderer component
- `src/main/handlers/knowledge-handlers.ts` - IPC handler

## Related Specs

- **`handler-response-pattern`** - Requires handlers to return complete raw data structures
- **`renderer-ipc-standardization`** - Requires renderer components to use `unwrapAPI` helper
- **`render-safety-testing`** - Documents React's type constraints and render safety requirements

## Solution

### Primary Fix: Use unwrapAPI in KnowledgeGameMap

Change the component from manual unwrapping:
```typescript
const resp = await apiClient.knowledge.getKnowledgeMap();
const data = resp.data as KnowledgeMapDisplay;
```

To using the standardized `unwrapAPI` helper:
```typescript
const data = await unwrapAPI(apiClient.knowledge.getKnowledgeMap());
```

### Secondary Fix: Return Complete KnowledgeMapDisplay

Change the handler from partial data:
```typescript
const responseData = {
  nodes: knowledgeMap.nodes ?? [],
  edges: knowledgeMap.edges ?? [],
};
return responseData;
```

To returning the complete structure:
```typescript
return knowledgeMap;
```

## Benefits

1. **Eliminates runtime error** - Fixes the React rendering crash
2. **Spec compliance** - Aligns with existing renderer-ipc-standardization and handler-response-pattern specs
3. **Consistent error handling** - Uses established `unwrapAPI` pattern for automatic error toasts
4. **Type safety** - Proper TypeScript types without manual casting
5. **Maintainability** - Follows established patterns, easier for future developers

## Risks

- **Low risk** - Changes are isolated to a single component and handler
- **Test coverage exists** - Component has comprehensive tests
- **Pattern is proven** - `unwrapAPI` is already used successfully in other components

## Alternatives Considered

### Alternative 1: Fix Handler Only
Return full `KnowledgeMapDisplay` from handler while keeping manual unwrapping in component.

**Rejected**: Doesn't address the `renderer-ipc-standardization` spec violation and leaves inconsistent error handling.

### Alternative 2: Fix Component Only
Keep handler as-is and add defensive checks in component.

**Rejected**: Handler still returns incomplete structure, violating `handler-response-pattern` spec. Component would need type assertions.

### Alternative 3: Remove RelationGraph Children
Remove the children mapping from `RelationGraph` component.

**Rejected**: May break library functionality. The children are likely needed for custom node rendering with context menu support.

## Acceptance Criteria

1. ✅ KnowledgeGameMap component uses `unwrapAPI` helper
2. ✅ `knowledge:get-map` handler returns complete `KnowledgeMapDisplay`
3. ✅ No React rendering errors when loading knowledge map
4. ✅ All existing tests pass
5. ✅ Error toasts display on IPC failures
6. ✅ Type assertions removed from component
7. ✅ Context menu functionality preserved

## Dependencies

- None - This is a standalone fix

## Sequencing

This change should be applied **before** any new knowledge-related features to establish the correct pattern and prevent similar errors.

## Out of Scope

- Modifying the `RelationGraph` library integration
- Changes to other knowledge components (unless they have similar issues)
- Performance optimizations
