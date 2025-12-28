# Tasks: Fix Teach Interrupt Recursion

## Task 1: Confirm and lock the repro
**Priority**: P0 (Critical)
**Estimated Time**: 20 minutes
**Status**: Completed

### Checklist
- [x] Re-run the scenario that triggers the recursion loop
- [x] Capture the minimal logs that show:
  - [x] `teach:classifyResponse empty response`
  - [x] `Skipping interrupt in non-graph context`
  - [x] `GraphRecursionError (GRAPH_RECURSION_LIMIT)`
- [x] Validation: Repro is documented in this change notes (short input + expected logs)

---

## Task 2: Fix teach handleQuestion interrupt swallowing
**Priority**: P0 (Critical)
**Estimated Time**: 30 minutes
**Status**: Completed

### Checklist
- [x] Update `teach/nodes/handleQuestion.ts` so it never swallows `GraphInterrupt`
- [x] Remove `try/catch` around `interrupt()` so the graph always pauses correctly
- [x] Ensure errors are not swallowed (ex: missing checkpointer)
- [x] Validation: Teach flow pauses on interrupt instead of continuing with empty resume

---

## Task 3: Add regression test for teach pause/resume (no recursion error)
**Priority**: P0 (Critical)
**Estimated Time**: 45 minutes
**Status**: Completed

### Checklist
- [x] Add a test that runs a compiled StateGraph to the teach follow-up step
- [x] Assert an interrupt event is emitted (using `isInterruptEvent` / `extractInterrupt`)
- [x] Resume using `new Command({ resume: "<text>" })`
- [x] Assert resumed state uses the resume value (ex: `userAnswer` populated)
- [x] Validation: Test fails on old behavior (swallowed interrupt / recursion)
- [x] Validation: Test passes after the fix

---

## Task 4: Update workflow README with LangGraph interrupt best practices
**Priority**: P2 (Medium)
**Estimated Time**: 15 minutes
**Status**: Completed

### Checklist
- [x] Add an “Interrupt / Resume” section to `src/main/services/domain/workflow/README.md`
- [x] Include:
  - [x] `interrupt()` throws `GraphInterrupt` (control flow)
  - [x] Do not catch-all around `interrupt()`
  - [x] If catching, rethrow `GraphInterrupt` (use `isGraphInterrupt`)
  - [x] Resume pattern: `new Command({ resume })`
- [x] Validation: README explains the pitfall that caused this crash

---

## Task 5: Validation run
**Priority**: P0 (Critical)
**Estimated Time**: 20 minutes
**Status**: Completed

### Checklist
- [x] Run tests: `npm test`
- [x] Run lint: `npm run lint`
- [x] Validation: All tests pass
- [x] Validation: Lint passes
