# Tasks: Fix KnowledgeGameMap React Rendering Error

## Task Breakdown

### Task 1: Update KnowledgeGameMap to Use unwrapAPI
**Priority**: P0 (Critical)
**Effort**: S
**Dependencies**: None

**Changes:**
- [x] Import `unwrapAPI` from `@/renderer/hooks/useElectronAPI`
- [x] Replace manual unwrapping with `unwrapAPI` call
- [x] Remove type assertion (`as KnowledgeMapDisplay`)
- [x] Remove manual error checking (handled by `unwrapAPI`)
- [x] Simplify console logging

**Files:**
- `src/renderer/features/knowledge/ui/KnowledgeGameMap.tsx`

**Validation:**
- [x] TypeScript compilation succeeds
- [x] Component tests pass
- [x] No manual `resp.data` access remains

---

### Task 2: Update Knowledge Handler to Return Complete Structure
**Priority**: P0 (Critical)
**Effort**: S
**Dependencies**: None

**Changes:**
- [x] Remove `responseData` transformation
- [x] Return `knowledgeMap` directly
- [x] Update logging to reflect complete structure
- [x] Remove unnecessary null checks (service already provides them)

**Files:**
- `src/main/handlers/knowledge-handlers.ts`

**Validation:**
- [x] TypeScript compilation succeeds
- [x] Handler tests pass
- [x] Service return type matches handler return type

---

### Task 3: Run All Tests
**Priority**: P0 (Critical)
**Effort**: M
**Dependencies**: Task 1, Task 2

**Commands:**
```bash
npm run test:renderer -- KnowledgeGameMap
npm run test:main -- knowledge-handlers
npm run type-check
```

**Validation:**
- [x] All tests pass
- [x] No new lint errors
- [x] Type checking succeeds

---

### Task 4: Manual Testing
**Priority**: P0 (Critical)
**Effort**: M
**Dependencies**: Task 3

**Test Cases:**
- [x] Start dev server (`npm run dev`)
- [x] Navigate to Knowledge page
- [x] Verify nodes render without errors
- [x] Check console for "Rendering X nodes and Y edges" log
- [x] Right-click a node to open context menu
- [x] Verify all menu actions work
- [x] Test with empty knowledge map

**Validation:**
- [x] No React errors in console
- [x] Nodes display correctly
- [x] Context menu works
- [x] No crashes or freezes

---

### Task 5: Verify Spec Compliance
**Priority**: P1 (High)
**Effort**: S
**Dependencies**: Task 3

**Checks:**
- [x] Verify `unwrapAPI` usage (renderer-ipc-standardization spec)
- [x] Verify handler returns raw data (handler-response-pattern spec)
- [x] Verify no objects rendered as children (render-safety-testing spec)

**Commands:**
```bash
# Check for manual unwrapping patterns
rg "resp\.data" src/renderer/features/knowledge/

# Check for APIResponse imports in handlers
rg "APIResponse" src/main/handlers/knowledge-handlers.ts
```

**Validation:**
- [x] No manual `resp.data` patterns found in KnowledgeGameMap.tsx
- [x] No `APIResponse` imports in handler
- [x] Code follows spec patterns

---

### Task 6: Update Documentation (Optional)
**Priority**: P2 (Medium)
**Effort**: S
**Dependencies**: Task 4

**Changes:**
- [ ] Add comment to `KnowledgeGameMap.tsx` explaining `unwrapAPI` pattern
- [ ] Update handler file header if needed

**Validation:**
- [ ] Code comments follow existing patterns
- [ ] References relevant specs

---

## Execution Order

```
Task 1 (Component) ──┐
                      ├──> Task 3 (Tests) ──> Task 4 (Manual) ──> Task 5 (Spec Check)
Task 2 (Handler) ────┘                                              └─> Task 6 (Docs - Optional)
```

**Note**: Task 1 and Task 2 can be done in parallel as they affect different processes.

---

## Rollback Plan

If issues arise:
1. Revert component changes (Task 1)
2. Revert handler changes (Task 2)
3. Root cause analysis
4. Alternative approach

Both changes are isolated and can be independently reverted.

---

## Definition of Done

- [x] KnowledgeGameMap uses `unwrapAPI` helper
- [x] Handler returns complete `KnowledgeMapDisplay`
- [x] All tests pass
- [x] Manual testing confirms fix
- [x] No React rendering errors
- [x] Console logs show correct structure
- [x] Context menu works as expected
- [x] Spec compliance verified
