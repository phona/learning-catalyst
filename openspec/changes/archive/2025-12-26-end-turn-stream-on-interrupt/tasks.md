# Tasks: End Turn Stream on Workflow Interrupt

- [x] Update stream configuration in `chat:start-stream` so the graph stream surfaces interrupt-bearing events (e.g. include `updates` alongside `custom`).
- [x] Update `toAssistantUIStream` to:
  - pass through `['custom', DataStreamChunk]` as today
  - detect interrupt events and stop iteration immediately
  - ignore all other non-custom events
- [x] Add/adjust unit tests for `toAssistantUIStream` to cover:
  - interrupt event ends the generator (no extra chunks emitted after)
  - custom chunk pass-through still works
- [x] Add an integration-ish test for `chat:start-stream` that simulates:
  - streamed assistant chunks then interrupt event
  - verify `finish` is posted without waiting for resume
  - verify `finish` posted exactly once
- [x] Run `npm test` and `npm run lint` (main process suite coverage focus).

Validation checklist
- [x] `finish` is sent promptly on interrupt
- [x] no duplicate `finish` in success/error paths
- [x] resume behavior (`Command({ resume })`) unchanged
- [x] tests updated/added and pass
