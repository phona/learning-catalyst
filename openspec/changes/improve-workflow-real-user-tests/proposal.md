# Proposal: Add “real user journey” tests for workflow streaming + resume

## Change ID
improve-workflow-real-user-tests

## Status
Proposed

## Type
Test Coverage + Reliability

## Summary

Add a small set of higher-level tests that simulate how a real user uses the learning workflow:

- streaming runs (`graph.stream`)
- interrupts (the app pauses and waits for user input)
- resume (`Command({ resume })`)
- checkpoint persistence (refresh / resume correctness)

The goal is to catch “looks fine in unit tests, breaks in real chat” bugs like:

- duplicate prompts after refresh/resume
- wrong message order (assistant prompt vs user reply)
- stuck interrupts / missing pending prompt
- wrong branch at routing thresholds

Scope is limited to tests (no production code changes in this change).

## Current Situation (Why this change)

We already have many unit tests for:

- routing (`edges.ts`)
- node behavior (teach/practice nodes)
- interrupt persistence in a couple places

But we do not have enough “full journey” tests that:

1) run the compiled workflow in streaming mode
2) stop at the interrupt event
3) resume like a real user
4) verify the checkpoint and the message history after multiple turns

This is where real users hit bugs (refresh, resume, repeated prompts, wrong state transitions).

## Goals

- Cover the top user journeys with realistic stream + interrupt + resume.
- Verify checkpoint-based behavior:
  - “refresh while waiting” can show the pending prompt again
  - “resume after refresh” does not duplicate prompts
- Verify simple routing boundaries (0.75 confidence, 0.9 mastery).
- Keep tests fast, deterministic, and readable.

## Non-Goals

- No production logic changes (nodes, reducers, UI, IPC).
- No new production dependencies.
- No new large test framework; reuse Vitest + MemorySaver.

## Proposed Test Set (Scenario Matrix)

### A) Main journeys (streaming integration)

1) Standard path, with a teach question loop

```
User: start topic
  -> TopicParse -> Assess (low) -> Teach (interrupt)
User resumes: asks question
  -> Teach handles question -> Teach (interrupt again)
User resumes: "ready"
  -> Teach exits -> Practice (interrupt)
User resumes: answers
  -> Practice -> Evaluate -> (loop or complete)
```

2) Fast-track path (quiz), mastery high -> complete

```
User: "I know X, test me"
  -> FastTrackQuiz (interrupt)
User resumes: answers quiz
  -> GradeQuiz -> Complete
```

3) Fast-track path (quiz), mastery low -> fall back to Teach

4) Practice “give up” path ends cleanly

### B) Refresh / resume realism (checkpoint-focused)

5) Refresh while waiting: pending interrupt prompt can be recovered from checkpoint

```
Run until interrupt
  -> read checkpoint
  -> getPendingInterruptPrompt() returns prompt text
```

6) Refresh after resume: does not re-generate the same prompt / does not duplicate messages

### C) Routing boundaries (cheap but valuable)

7) Confidence boundary:
- confidence = 0.75 routes to FastTrackQuiz
- confidence = 0.749 routes to Teach

8) Mastery boundary:
- mastery = 0.9 routes to Complete
- mastery = 0.899 routes back to Practice

### D) Message history invariants (always-on)

For any interrupt/resume node, verify:

```
messages = [
  AIMessage(prompt),
  HumanMessage(resumeText),
]
```

This catches ordering and duplication regressions.

## Test Harness Design (simple)

All journey tests use the same pattern:

```
compile graph with MemorySaver checkpointer
stream(initialState, streamMode: "updates")
  -> consume until interrupt event
resume with Command({ resume: "..." })
repeat until end or next interrupt
assert final state + checkpoint contents
```

ASCII diagram of how the harness drives the workflow:

```
test
  | graph.stream(state)  -> observe __interrupt__
  | graph.stream(Command({ resume }))  -> next step
  v
MemorySaver checkpoint keeps the thread state
```

## Risks / Notes

- Flaky tests if we accidentally call real models.
  - Mitigation: always mock `providerFactory.getModel()` and services in journey tests.
- Tests can become slow if we overdo “full workflow end-to-end”.
  - Mitigation: keep a small set of journeys; prefer stopping at key interrupts.

## Acceptance Criteria

- New tests cover the scenario matrix above and are deterministic (no real network/model calls).
- Tests verify:
  - interrupt event is emitted
  - resume stores a `HumanMessage` in checkpoints
  - prompt is recoverable while pending (refresh case)
  - routing boundary behavior is correct
  - message history ordering invariants hold
- `openspec validate improve-workflow-real-user-tests --strict` passes.
- `npm test` and `npm run lint` pass (or we document unrelated pre-existing failures).

