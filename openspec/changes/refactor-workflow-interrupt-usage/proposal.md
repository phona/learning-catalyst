# Proposal: Refactor Workflow Interrupt Usage for Natural Chat Flow

## Change ID
`refactor-workflow-interrupt-usage`

## Type
Architecture Refactoring

## Priority
P0 (Critical) - Simplifies core architecture and improves maintainability

## Summary
Refactor workflow architecture to eliminate abuse of `LangGraph.interrupt()` for normal chat Q&A flows. Current implementation incorrectly uses interrupt for teaching Q&A and practice question/answer interactions, creating unnecessary complexity. This proposal transitions to a natural chat flow pattern while preserving interrupt for structured interactions (approvals, selections, file uploads).

## Problem Statement

### Current State
The workflow architecture incorrectly uses `LangGraph.interrupt()` for standard conversational flows:

1. **Teach Subgraph** (`src/main/services/domain/workflow/subgraphs/teach/nodes/explain.ts`):
   - Generates teaching content
   - Calls `interrupt()` to wait for user questions/responses
   - Requires resume protocol handling

2. **Practice Subgraph** (`src/main/services/domain/workflow/subgraphs/practice/nodes/askQuestion.ts`):
   - Generates practice questions
   - Calls `interrupt()` to wait for user answers
   - Requires resume protocol handling

### Issues with Current Approach
- Forces "resume protocol" for normal conversation (anti-pattern)
- Requires special handling in frontend/backend
- Adds conceptual overhead without UX benefit
- Makes system harder to understand and maintain
- Violates principle: interrupt = structured interaction, not chat

### Business Impact
- **Developer Experience**: Confusing architecture makes feature development slower
- **System Complexity**: Unnecessary resume protocol increases bug surface area
- **Maintenance**: Two patterns for similar flows (chat vs structured) increases cognitive load
- **Testing**: Complex interrupt/resume flows harder to test than simple message flows

## Why This Matters Now

This refactoring addresses a fundamental architectural misalignment that's causing ongoing complexity:

1. **Simplicity**: Chat UIs already have built-in "wait for user message" mechanism. Using `interrupt()` adds an unnecessary protocol layer on top of this.

2. **Correctness**: `LangGraph.interrupt()` is designed for structured interactions (approvals, selections, uploads), not conversational flows. Using it for chat Q&A violates the intended purpose.

3. **Maintainability**: Every developer who works on teach/practice flows struggles with the interrupt/resume pattern. The new natural chat flow will be immediately understandable.

4. **Testing**: Current interrupt-based tests are complex and brittle. Message-based tests are simpler and more robust.

5. **Frontend Integration**: The renderer doesn't need special resume handling for normal chat, making it more maintainable.

The cost of NOT doing this refactoring is continued complexity and slower feature development. The new pattern aligns with how chat UIs naturally work, making the system easier for everyone.

## Proposed Solution

### Phase 1: Documentation Update (Non-Breaking)
Update `src/main/services/domain/workflow/README.md` with:
1. **Interrupt Decision Tree**: Clear guidance on when to use interrupt
2. **Best Practices**: Document correct interrupt patterns
3. **Anti-Patterns**: Warn against interrupt for chat Q&A
4. **Examples**: Show correct usage for structured interactions

### Phase 2: Architecture Refactor (Breaking Changes)

#### Teach Subgraph Refactor
**Remove from `explain.ts`:**
```typescript
// CURRENT (WRONG)
const resumeValue = await interrupt(buildInterruptPayload({...}));
const userAnswer = extractResumeValue(resumeValue);
return { messages: [assistantMsg, new HumanMessage(userAnswer)] };
```

**Replace with natural chat flow:**
```typescript
// NEW (CORRECT)
// Split into two nodes:

// Node A: generateExplanation
export const generateExplanationNode = (deps) => async (state) => {
  const content = await generateTeachingContent(state);
  return {
    messages: [new AIMessage(content)],
    teach: { phase: 'awaiting_response' },
  };
  // END - graph terminates
};

// Node B: handleUserResponse
export const handleUserResponseNode = (deps) => async (state) => {
  if (state.teach.phase !== 'awaiting_response') return state;

  const lastMessage = state.messages[state.messages.length - 1];
  const intent = await classifyResponse(lastMessage.content);

  return {
    messages: [new AIMessage('Let me address your question...')],
    teach: { phase: 'idle', intent },
  };
  // END
};
```

#### Practice Subgraph Refactor
**Remove from `askQuestion.ts`:**
```typescript
// CURRENT (WRONG)
const resumeValue = await interrupt(buildInterruptPayload({...}));
const answer = extractResumeValue(resumeValue);
return { messages: [questionMsg, new HumanMessage(answer)] };
```

**Replace with natural chat flow:**
```typescript
// NEW (CORRECT)
// Split into two nodes:

// Node A: generatePracticeQuestion
export const generatePracticeQuestionNode = (deps) => async (state) => {
  const question = await generateQuestion(state.topic);
  return {
    messages: [new AIMessage(question)],
    practice: { phase: 'waiting_for_answer', currentQuestion: question },
  };
  // END
};

// Node B: assessAnswer
export const assessAnswerNode = (deps) => async (state) => {
  if (state.practice.phase !== 'waiting_for_answer') return state;

  const lastMessage = state.messages[state.messages.length - 1];
  const feedback = await assessAnswer(state.practice.currentQuestion, lastMessage.content);

  return {
    messages: [new AIMessage(feedback)],
    practice: { phase: 'idle' },
  };
  // END
};
```

#### Keep Interrupt for Structured Interactions
Examples where interrupt is appropriate:
- "Approve this study plan?" (approve/reject buttons)
- "Choose difficulty: Easy/Medium/Hard" (selection UI)
- "Upload your notes" (file upload modal)
- "Rate understanding: 1-5 stars" (rating scale)

### Phase 3: Testing Strategy
1. **Update existing interrupt tests**: Modify tests in `workflow/__tests__/` to reflect new guidelines
2. **Add natural chat flow tests**: Test message-based Q&A without interrupt
3. **Verify checkpoint/restore**: Ensure messages-only approach works correctly
4. **Integration tests**: Validate end-to-end chat flow works

## Success Criteria

### Functional Criteria
- [ ] Teach flow works without interrupt (generate → user responds → assess)
- [ ] Practice flow works without interrupt (question → user answers → feedback)
- [ ] Structured interactions still use interrupt (approve/select/upload/rate)
- [ ] Checkpoint/restore works with messages-only approach
- [ ] Frontend no longer needs resume handling for Q&A flows

### Quality Criteria
- [ ] README clearly documents interrupt decision tree
- [ ] New pattern is well-tested (unit + integration)
- [ ] No regression in existing functionality
- [ ] Code is easier to understand and maintain

## Migration Strategy

### Option 1: Parallel Migration (Recommended)
1. Deploy new nodes alongside existing ones
2. Update edges to route through new nodes
3. Keep old interrupt-based nodes for rollback
4. Remove old nodes after validation period

### Option 2: Direct Replacement
1. Create new nodes
2. Update edges in single commit
3. Remove old nodes immediately
4. Rollback if issues found

**Recommendation**: Option 1 (Parallel) for lower risk

## Risks and Mitigations

### Risk: Breaking Existing Conversations
**Mitigation**: Keep old nodes during transition, validate thoroughly

### Risk: Frontend Compatibility
**Mitigation**: New pattern is simpler (no resume), should work with existing UI

### Risk: Checkpoint Data Loss
**Mitigation**: New pattern stores everything in messages, more robust than interrupt state

## Dependencies

- None (internal refactor)
- Updates to existing specs:
  - `workflow-interrupt-control-flow` (update guidelines)
  - `workflow-interrupt-message-persistence` (document new pattern)

## Timeline Estimate

- **Phase 1 (Documentation)**: 0.5 day
- **Phase 2 (Architecture)**: 2-3 days
- **Phase 3 (Testing)**: 1-2 days
- **Total**: 3.5-5.5 days

## Open Questions

1. **Migration Path**: Should we run old and new nodes in parallel?
2. **Structured Interactions**: What specific use cases should keep interrupt?
3. **Test Coverage**: How to ensure new pattern is well-tested before removing old nodes?
4. **Rollback Plan**: What's the fastest way to rollback if issues found?

## Related Work

- **Blocks**: None
- **Blocked by**: None
- **Related**: `workflow-interrupt-control-flow`, `workflow-interrupt-message-persistence`
