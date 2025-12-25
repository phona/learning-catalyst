# Tasks: Migrate Chat Transport to Bucket 2

- [x] Define shared IPC payload types for delta-based streaming input
- [x] Update renderer transport to send only last user message (delta) + `conversationId`
- [x] Update preload / main IPC bridge to accept delta payload
- [x] Update `chat:start-stream` handler to:
  - [x] Load checkpoint state for `thread_id`
  - [x] If pending interrupt: resume with `Command({ resume })`
  - [x] Else: append new message and continue
- [x] Add compatibility path (optional): accept legacy `{ messages:[...] }` payload during migration
- [x] Add tests:
  - [x] handler-level: delta payload calls workflow correctly
  - [x] interrupt resume: delta reply resumes without topic parsing
  - [x] renderer: history hydration via `chat:get-messages`
- [x] Run `npm test`
- [x] Run `npm run lint`
