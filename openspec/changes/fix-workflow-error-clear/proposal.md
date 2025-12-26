# Proposal: Fix Stuck Workflow Error State (TDD)

## Summary

When a learning session hits a TOPIC_PARSE error, the workflow stores `state.error`.
On the next user message, the app repeats the old error and never recovers.

This is because the workflow state reducer for `error` does not allow clearing with `null`.

We will fix it with a small, targeted change and a TDD workflow:

- **Red**: add a failing regression test (already added)
- **Green**: update reducer so `error: null` clears the persisted error
- **Refactor**: keep change minimal, verify determinism, run lint/tests

## User Story

As a user, when I accidentally send a bad topic like `"1"`, I want to retry with a real topic like `"how to learn python?"` and continue the chat, not get stuck repeating the old error.

## Current Behavior (Bug)

Example (reported):

- User: `1`
- Assistant: `Learning session ended with an error: I couldn't find learning materials for "1"...`
- User: `how to learn python?`
- Assistant: `Learning session ended with an error: I couldn't find learning materials for "1"...`  (repeats)

## Root Cause (Plain Explanation)

Workflow state uses reducers to merge updates into checkpointed state.
The `error` reducer is currently:

```
error = update ?? current
```

So `error: null` does **not** clear the error because:

```
null ?? current  === current
```

This makes `error` “sticky” across turns and across checkpoints.

### Flow diagram

```
Turn 1: "1"
START -> TOPIC_PARSE sets error -> COMPLETE prints error and returns { error: null }
                                   |
                                   | reducer keeps old error string
                                   v
checkpoint has error = "…for \"1\"…"

Turn 2: "how to learn python?"
START -> routing sees error -> COMPLETE -> prints old error again
```

## Proposed Change

### Behavior change

Allow `null` to overwrite the previous error in workflow state.

Rule:
- `undefined` means “no update” (keep current)
- `null` means “explicit clear” (store null)
- `string` means “set error message” (store string)

### Minimal implementation idea

Update the reducer for `error` in `src/main/services/domain/workflow/state.ts`:

- from: `update ?? current`
- to: `(update === undefined ? current : update)`

No other behavior changes.

## Tests (TDD Plan)

We follow the repo testing guide (`docs/DEVELOPER-GUIDE/testing.md`):

### 1) Red (reproduce the bug)

Add a regression test that expects the correct behavior (clears error),
but fails today due to the bug:

- `src/main/services/domain/workflow/__tests__/error-stuck-regression.test.ts`

The test uses:
- `MemorySaver` for persisted checkpoints
- a minimal `StateGraph` stub for TOPIC_PARSE + COMPLETE
- two turns on the same `thread_id`

This keeps the test fast and deterministic.

### 2) Green (make the test pass)

Implement the reducer change described above.

Re-run:
- `npm run test:main:file -- src/main/services/domain/workflow/__tests__/error-stuck-regression.test.ts`
- Repeat 3x for determinism (per guide).

### 3) Refactor (keep it clean)

- Keep change limited to the reducer.
- Ensure no tests rely on “sticky error” behavior (they shouldn’t).

## Acceptance Criteria

- After a TOPIC_PARSE error, the workflow can recover on the next user message.
- The regression test passes.
- No existing workflow behavior changes besides error clearing.
- `npm run lint` passes.
- Main test suite is not made worse by this change.

## Out of Scope

- Improving topic parsing quality or knowledge search thresholds.
- Changing chat:start-stream resume logic (separate concern; already has tests).
- UI copy changes.

## Risks / Notes

- Very low-risk: this only affects how `error` merges in state.
- If any code relied on `null` being ignored (unlikely), it will now behave correctly (clear).

## Rollback Plan

Revert the reducer change and keep the regression test to prevent re-introducing the bug.

