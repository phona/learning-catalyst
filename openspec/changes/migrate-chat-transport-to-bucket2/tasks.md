# Tasks: Migrate Chat Transport to Bucket 2

- [ ] Define shared IPC payload types for delta-based streaming input
- [ ] Update renderer transport to send only last user message (delta) + `conversationId`
- [ ] Update preload / main IPC bridge to accept delta payload
- [ ] Update `chat:start-stream` handler to:
  - [ ] Load checkpoint state for `thread_id`
  - [ ] If pending interrupt: resume with `Command({ resume })`
  - [ ] Else: append new message and continue
- [ ] Add compatibility path (optional): accept legacy `{ messages:[...] }` payload during migration
- [ ] Add tests:
  - [ ] handler-level: delta payload calls workflow correctly
  - [ ] interrupt resume: delta reply resumes without topic parsing
  - [ ] renderer: history hydration via `chat:get-messages`
- [ ] Run `npm test`
- [ ] Run `npm run lint`

