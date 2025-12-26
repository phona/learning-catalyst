# Tasks: Fix assistant-ui "Edit message" (re-edit) not working

## Checklist

- [ ] Repro the current behavior (screen recording + notes)
- [ ] Decide short-term UX: hide Edit vs show disabled state with tooltip
- [ ] Implement Phase 1: disable edit action in Thread config
- [ ] Add a regression test (edit action not rendered)
- [ ] Document Phase 2 options (branch thread_id vs rewind checkpoints)
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] `openspec validate fix-assistant-ui-message-edit --strict`
- [ ] Archive change when complete

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

