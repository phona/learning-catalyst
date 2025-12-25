# Tasks: Add Interrupt Resume Test Coverage (chat:start-stream)

- [x] Fix `chat:start-stream` to resume pending interrupts using `Command({ resume })`
- [x] Add handler test for `chat:start-stream` resume input (fake IPC port)
- [x] Mock checkpoint tuple with pending interrupt and assert `workflowGraph.stream()` uses `Command({ resume })`
- [x] Update “resume” tests in `fastTrackQuiz` to pass real resume input via `Command({ resume })`
- [x] Add teach-subgraph resume test for `explain` interrupt (resume sets `userAnswer`)
- [x] Add optional regression test: `"yes"` after interrupt does not trigger topic-parse “no materials” error
- [x] Run `npm test`
- [x] Run `npm run lint`
