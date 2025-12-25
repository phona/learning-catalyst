# Tasks: Add Interrupt Resume Test Coverage (chat:start-stream)

- [ ] Fix `chat:start-stream` to resume pending interrupts using `Command({ resume })`
- [ ] Add handler test for `chat:start-stream` resume input (fake IPC port)
- [ ] Mock checkpoint tuple with pending interrupt and assert `workflowGraph.stream()` uses `Command({ resume })`
- [ ] Update “resume” tests in `fastTrackQuiz` to pass real resume input via `Command({ resume })`
- [ ] Add teach-subgraph resume test for `explain` interrupt (resume sets `userAnswer`)
- [ ] Add optional regression test: `"yes"` after interrupt does not trigger topic-parse “no materials” error
- [ ] Run `npm test`
- [ ] Run `npm run lint`
