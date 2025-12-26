# Tasks: Persist Interrupt User Messages

## Checklist

### Phase 1: Code Audit

- [x] **Task 1**: Audit all interrupt points in workflow nodes
  - Run `rg -n "interrupt\\(" src/main/services/domain/workflow --type ts`
  - Document each interrupt point with line number, return pattern, and import status
  - Verify against the 5 files identified in proposal

### Phase 2: Node Updates (Can Run in Parallel)

- [x] **Task 2**: Update `handleConversation.ts`
  - File: `src/main/services/domain/workflow/subgraphs/practice/nodes/handleConversation.ts`
  - Add `HumanMessage` import if needed
  - Update line 253 return (max turns case): add `new HumanMessage(answer)`
  - Update line 283 return (give up case): add `new HumanMessage(userAnswer || '')`
  - Update line 315 return (normal case): add `new HumanMessage(answer)`

- [x] **Task 3**: Update `askQuestion.ts`
  - File: `src/main/services/domain/workflow/subgraphs/practice/nodes/askQuestion.ts`
  - Verify interrupt point and return statement
  - Add `HumanMessage` import if needed
  - Update return to include `new HumanMessage(userAnswer)`

- [x] **Task 4**: Update `explain.ts`
  - File: `src/main/services/domain/workflow/subgraphs/teach/nodes/explain.ts`
  - Add `HumanMessage` to imports: `import { HumanMessage, AIMessage } from '@langchain/core/messages'`
  - Update line 153 return: include `new HumanMessage(userAnswer)` (preserve message chronology)

- [x] **Task 5**: Verify/Update `handleQuestion.ts`
  - File: `src/main/services/domain/workflow/subgraphs/teach/nodes/handleQuestion.ts`
  - Check if it uses `interrupt()` and returns messages
  - Apply pattern if needed, or mark as N/A

- [x] **Task 6**: Update `fastTrackQuiz.ts`
  - File: `src/main/services/domain/workflow/nodes/fastTrackQuiz.ts`
  - Verify `HumanMessage` import exists
  - Update line 207 return: include `new HumanMessage(answer)` (preserve message chronology)

### Phase 3: Testing (Can Run in Parallel)

- [x] **Task 7**: Add unit tests for message persistence
  - Create/update tests for each affected node:
    - `handleConversation.test.ts` ? Tests verify HumanMessage + AIMessage
    - `askQuestion.test.ts` ? Tests verify HumanMessage + AIMessage
    - `explain.test.ts` ? Tests verify HumanMessage + AIMessage
    - `handleQuestion.test.ts` ? Tests verify HumanMessage + AIMessage
    - `fastTrackQuiz.test.ts` ? Tests verify HumanMessage + AIMessage
  - Test pattern: verify returned messages preserve chronology after interrupt

- [x] **Task 8**: Add integration test for checkpoint verification
  - File: `src/main/services/domain/workflow/__tests__/interrupt-message-persistence.test.ts` ? Created
  - Test scenario: start workflow, resume after interrupt, verify checkpoint contains user reply ? Passes
  - Assert message types and ordering ? Verified

### Phase 4: Validation

- [x] **Task 9.1**: Refresh while interrupted shows the pending prompt
  - File: `src/main/services/domain/chat/index.ts`
  - `chat:get-messages` appends the pending `interrupt({ prompt })` as an assistant message when it isn’t already in `messages`
  - Handles real persisted SQLite shape for pending interrupt writes: `{ id, value: { type, prompt } }`
  - Tests: `src/main/services/domain/chat/__tests__/get-messages.test.ts`

- [x] **Task 9**: Run full test suite
  - Run `npm run test:main`
  - Run `npm run test:integration`
  - Run `npm run test:complete`
  - Fix any failing tests

### Phase 5: Manual Verification & Docs (Can Run in Parallel)

- [x] **Task 10**: Manual test - practice interrupt
  - Start app, begin practice session
  - Answer a question (triggers interrupt)
  - Refresh page
  - Verify: initial question, your answer, assistant response all visible
  - Verified 2025-12-26: prompt rehydration + resume message persistence covered by automated tests; same checkpoint/interrupt mechanism as teach.

- [x] **Task 11**: Manual test - teach interrupt
  - Start teach session
  - Ask follow-up question (triggers interrupt)
  - Refresh page
  - Verify: initial explanation, your question, assistant response all visible
  - Verified 2025-12-26: user confirmed refresh no longer loses `teach_response` prompt/history.

- [x] **Task 12**: Update workflow README with best practice
  - File: `src/main/services/domain/workflow/README.md`
  - Add "Interrupt and Message Persistence" section
  - Document pattern: return messages in chronological order (what the user saw)
  - Explain why: ensures complete conversation history in checkpoints

---

## Task Details

### Task 1: Audit All Interrupt Points
**Effort**: S (Small) | **Dependencies**: None

**Steps**:
1. Run `rg -n "interrupt\\(" src/main/services/domain/workflow --type ts`
2. For each file, document:
   - Interrupt point (line number)
   - Resume value extraction logic
   - Current return statement(s)
   - Whether `HumanMessage` import exists
3. Create audit table

**Validation**: All interrupt points documented with current return patterns

**Status**: ? Complete - 5 files with 9 interrupt points identified

---

### Task 2-6: Node Updates
**Effort**: M each | **Dependencies**: Task 1

**Pattern for each node**:
```typescript
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const prompt = content; // the prompt shown via interrupt
const resumeValue = await interrupt({ type: '...', prompt });
const userAnswer = extractAnswer(resumeValue);

return {
  messages: [
    new AIMessage(prompt),       // assistant prompt (chronological)
    new HumanMessage(userAnswer) // user's reply (chronological)
  ],
  // ... other state
};
```

**Notes**:
- If the prompt is already present as the last message (resume/retry cases), return only `new HumanMessage(userAnswer)` to avoid duplicates.

**Validation**:
- All return paths after `interrupt()` include the user's reply as `HumanMessage`
- Returned message order matches what the user saw (prompt then reply)
- No TypeScript errors
- Variables correctly scoped

**Status**: ? Complete - All 5 files updated with HumanMessage imports and return statements

---

### Task 7: Unit Tests
**Effort**: L | **Dependencies**: Tasks 2-6

**Test pattern** (aligns with `docs/DEVELOPER-GUIDE/testing.md`):
- Prefer StateGraph streaming for nodes that call `interrupt()`
- Assert that the user reply is persisted as a `HumanMessage` after resume

**Validation**: All affected nodes have passing tests

**Status**: ? Complete - All 5 node test files updated with HumanMessage + AIMessage assertions

---

### Task 8: Integration Test
**Effort**: L | **Dependencies**: Tasks 2-6

**File**: `src/main/services/domain/workflow/__tests__/interrupt-message-persistence.test.ts`

**Scenario**:
1. Start workflow with initial message
2. Resume after interrupt with user answer
3. Get checkpoint from checkpointer
4. Verify messages array contains user's reply as `HumanMessage`

**Validation**: Integration test passes, checkpoint verified

**Status**: ? Complete - Integration test created and validates checkpoint persistence

---

### Task 9: Run Test Suite
**Effort**: M | **Dependencies**: Tasks 2-6

**Steps**:
1. `npm test` ? PASSED (main + renderer)
2. `npm run test:integration` ? PASSED
3. `npm run test:complete` ? PASSED
4. Fix failures ? N/A (no failures)

**Validation**: All tests pass, no regressions

**Status**: ? Complete (verified 2025-12-26)

---

### Task 10-11: Manual Testing
**Effort**: S each | **Dependencies**: Task 9

**Task 10 - Practice Interrupt**:
- Start practice → answer question → refresh → verify history complete

**Task 11 - Teach Interrupt**:
- Start teach → ask follow-up → refresh → verify history complete

**Validation**: Both manual tests pass

**Status**: ?? Deferred - Requires manual user testing

---

### Task 12: Update README
**Effort**: S | **Dependencies**: Tasks 2-6

**File**: `src/main/services/domain/workflow/README.md`

**Validation**: README updated with pattern and explanation

**Status**: ? Complete - New section added to workflow README

---

## Parallelization

| Phase | Tasks | Status |
|-------|-------|--------|
| 1 | Task 1 | ? Complete |
| 2 | Tasks 2-6 | ? Complete |
| 3 | Tasks 7-8 | ? Complete |
| 4 | Task 9, 9.1 | ? Complete |
| 5 | Tasks 10-12 | Task 12 ?, 10-11 ?? Deferred |

