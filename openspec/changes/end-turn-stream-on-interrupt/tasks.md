# Tasks: End Turn Stream on Workflow Interrupt

1. Update stream configuration in `chat:start-stream` so the graph stream surfaces interrupt-bearing events (e.g. include `updates` alongside `custom`).
2. Update `toAssistantUIStream` to:
   - pass through `['custom', DataStreamChunk]` as today
   - detect interrupt events and stop iteration immediately
   - ignore all other non-custom events
3. Add/adjust unit tests for `toAssistantUIStream` to cover:
   - interrupt event ends the generator (no extra chunks emitted after)
   - custom chunk pass-through still works
4. Add an integration-ish test for `chat:start-stream` that simulates:
   - streamed assistant chunks then interrupt event
   - verify `finish` is posted without waiting for resume
   - verify `finish` posted exactly once
5. Run `npm test` and `npm run lint` (main process suite coverage focus).

Validation checklist
- [ ] `finish` is sent promptly on interrupt
- [ ] no duplicate `finish` in success/error paths
- [ ] resume behavior (`Command({ resume })`) unchanged
- [ ] tests updated/added and pass

