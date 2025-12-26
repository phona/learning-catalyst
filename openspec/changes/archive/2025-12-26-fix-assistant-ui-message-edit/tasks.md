# Tasks: Fix assistant-ui "Edit message" (re-edit) not working

## Checklist

- [x] Repro the current behavior (screen recording + notes)
- [x] Decide short-term UX: hide Edit vs show disabled state with tooltip
- [x] Implement Phase 1: disable edit action in Thread config
- [x] Add a regression test (edit action not rendered)
- [x] Document Phase 2 options (branch thread_id vs rewind checkpoints)
- [x] Run `npm run lint`
- [x] Run `npm test` (or document unrelated pre-existing failures)
- [x] `openspec validate fix-assistant-ui-message-edit --strict`
- [x] Archive change when complete

## Repro steps (manual)

1) Open a chat thread with at least 2 user messages.
2) Click the pencil icon on an earlier user message.
3) Change the text and press Send.
4) Observe whether the assistant response uses the edited context and whether the result persists after reload.

## Commands

Validate OpenSpec structure:

```
openspec validate fix-assistant-ui-message-edit --strict
```

## Notes (2025-12-26)

- Short-term UX choice: hide the Edit action (no broken control shown).
- Implementation: pass `userMessage.allowEdit = false` to `<Thread />`.
- Repro note: this change removes the UI affordance; the existing backend branch/edit behavior is intentionally not exercised here.
