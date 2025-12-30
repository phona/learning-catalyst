# Tasks: Refactor Workflow Interrupt Usage

## Phase 1: Documentation Update (Non-Breaking)

### Task 1.1: Add Interrupt Decision Tree to README
**File**: `src/main/services/domain/workflow/README.md`
**Description**: Add new section documenting when to use vs not use interrupt
**Acceptance**:
- [ ] Decision tree clearly shows: "User input is text in chat? → Don't use interrupt"
- [ ] Lists appropriate use cases: approve/reject, select, upload, rate
- [ ] Includes visual diagram or clear flow chart

### Task 1.2: Document Interrupt Anti-Patterns
**File**: `src/main/services/domain/workflow/README.md`
**Description**: Add section warning against interrupt for chat Q&A
**Acceptance**:
- [ ] Shows example of WRONG usage (current teach/practice pattern)
- [ ] Explains why it's wrong: "forces resume protocol for normal conversation"
- [ ] References this proposal for migration guidance

### Task 1.3: Add Examples of Correct Interrupt Usage
**File**: `src/main/services/domain/workflow/README.md`
**Description**: Show examples where interrupt IS appropriate
**Acceptance**:
- [ ] Example: Learning path selection (approve/reject)
- [ ] Example: Difficulty selection (multiple choice)
- [ ] Example: File upload for notes
- [ ] Example: Understanding rating (1-5 stars)

## Phase 2: Architecture Refactor (Breaking Changes)

### Task 2.1: Create New Teach Nodes (Natural Chat Flow)
**Files**: `src/main/services/domain/workflow/subgraphs/teach/nodes/`
**Description**: Create `generateExplanationNode` and `handleUserResponseNode`
**Acceptance**:
- [ ] `generateExplanationNode` generates content, appends AIMessage, sets phase, ENDs
- [ ] `handleUserResponseNode` checks phase, reads last message, classifies intent
- [ ] Nodes use natural message flow, NO interrupt
- [ ] Both nodes are exported and tested

### Task 2.2: Update Teach Subgraph Graph
**File**: `src/main/services/domain/workflow/subgraphs/teach/graph.ts`
**Description**: Update graph composition to use new nodes
**Acceptance**:
- [ ] Graph routes: START → generateExplanation → END (waits for user)
- [ ] Graph routes: user message → handleUserResponse → END
- [ ] Old `explainNode` removed (not kept for rollback)

### Task 2.3: Create New Practice Nodes (Natural Chat Flow)
**Files**: `src/main/services/domain/workflow/subgraphs/practice/nodes/`
**Description**: Create `generatePracticeQuestionNode` and `assessAnswerNode`
**Acceptance**:
- [ ] `generatePracticeQuestionNode` generates question, appends AIMessage, sets phase, ENDs
- [ ] `assessAnswerNode` checks phase, reads last message, grades answer
- [ ] Nodes use natural message flow, NO interrupt
- [ ] Both nodes are exported and tested

### Task 2.4: Update Practice Subgraph Graph
**File**: `src/main/services/domain/workflow/subgraphs/practice/graph.ts`
**Description**: Update graph composition to use new nodes
**Acceptance**:
- [ ] Graph routes: START → generatePracticeQuestion → END (waits for user)
- [ ] Graph routes: user message → assessAnswer → END
- [ ] Old `askQuestionNode` removed (not kept for rollback)

### Task 2.5: Update Main Workflow Graph
**File**: `src/main/services/domain/workflow/graph.ts`
**Description**: Ensure routing works with new teach/practice patterns
**Acceptance**:
- [ ] Teach flow routes correctly to new nodes
- [ ] Practice flow routes correctly to new nodes
- [ ] Conditional routing still works (assess → teach vs fast track)

### Task 2.6: Create Example Structured Interaction Node
**Files**: `src/main/services/domain/workflow/nodes/selectLearningPath.ts`
**Description**: Create example showing CORRECT interrupt usage
**Acceptance**:
- [ ] Node uses interrupt for structured choice
- [ ] Demonstrates pattern: interrupt → extract choice → update state
- [ ] Documented as reference implementation

### Task 2.7: Update Chat IPC Handlers for Natural Flow
**Files**: `src/main/handlers/chat-handlers.ts`
**Description**: Update IPC handlers to work with phase-based routing instead of interrupt resume
**Acceptance**:
- [ ] Handler routes based on teach/practice phase (not interrupt state)
- [ ] No special resume handling needed for teach/practice Q&A
- [ ] Stream continues naturally through message flow
- [ ] Structured interrupts still work (approve/select/upload)

### Task 2.8: Update Workflow Stream Handler
**Files**: `src/main/handlers/catalyst-handlers.ts` (or workflow handler file)
**Description**: Ensure stream handler properly handles END vs interrupt in new pattern
**Acceptance**:
- [ ] Stream handler detects END correctly (normal completion)
- [ ] Phase state properly checked for routing decisions
- [ ] No interrupt events for teach/practice Q&A flows
- [ ] Checkpoint saves phase state for resume

### Task 2.9: Verify Frontend Chat Components
**Files**: `src/renderer/components/Chat/`, `src/renderer/services/chat/`
**Description**: Ensure frontend no longer needs resume handling for teach/practice flows
**Acceptance**:
- [ ] Chat components work with natural message flow (no resume protocol)
- [ ] Structured interactions still trigger interrupt UI (approve/select buttons)
- [ ] Message persistence works via checkpoint + messages (not interrupt state)
- [ ] Thread restoration works correctly with new pattern

## Phase 3: Testing and Validation

### Task 3.1: Add Natural Chat Flow Tests for Teach
**Files**: `src/main/services/domain/workflow/subgraphs/teach/__tests__/`
**Description**: Test new message-based flow without interrupt
**Acceptance**:
- [ ] Test: generateExplanation → user message → handleUserResponse
- [ ] Tests verify message persistence without interrupt
- [ ] Tests cover different user response types (questions, clarifications, ready for practice)

### Task 3.2: Add Natural Chat Flow Tests for Practice
**Files**: `src/main/services/domain/workflow/subgraphs/practice/__tests__/`
**Description**: Test new message-based flow without interrupt
**Acceptance**:
- [ ] Test: generatePracticeQuestion → user message → assessAnswer
- [ ] Tests verify message persistence without interrupt
- [ ] Tests cover different answer types (correct, incorrect, clarification requests)

### Task 3.3: Integration Test - End-to-End Chat Flow
**File**: `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`
**Description**: Verify complete workflow works with new pattern
**Acceptance**:
- [ ] Standard learning path: topic → teach (Q&A) → practice (Q&A) → complete
- [ ] Fast track: topic → quiz → teach (if needed) → practice
- [ ] Checkpoint/restore works correctly
- [ ] All message flow tests passing

### Task 3.4: Update Graph Routing Tests
**File**: `src/main/services/domain/workflow/__tests__/edges-routing.test.ts`
**Description**: Ensure graph routing works with new nodes
**Acceptance**:
- [ ] Test: TOPIC_PARSE → ASSESS → TEACH → PRACTICE → EVALUATE → COMPLETE
- [ ] Test: ASSESS (high confidence) → FAST_TRACK_QUIZ → GRADE_QUIZ
- [ ] All conditional routing paths validated

### Task 3.5: Test IPC Handler Phase Routing
**Files**: `src/main/handlers/__tests__/chat-handlers.test.ts` (create if needed)
**Description**: Test that IPC handlers route based on phase, not interrupt
**Acceptance**:
- [ ] Handler checks teach/practice phase for routing
- [ ] No resume handling needed for Q&A flows
- [ ] Structured interrupts still work correctly
- [ ] Stream continuation works with END pattern

### Task 3.6: Verify Frontend Compatibility
**Files**: `src/renderer/components/Chat/__tests__/` (integration tests)
**Description**: Ensure UI works with simplified chat flow
**Acceptance**:
- [ ] No special resume handling needed for Q&A
- [ ] Messages flow naturally in chat UI
- [ ] Interrupt still works for structured interactions (approve/select)
- [ ] Thread restoration preserves conversation correctly

### Task 3.7: Performance Validation
**File**: `src/main/services/domain/workflow/__tests__/performance.test.ts` (create if needed)
**Description**: Verify new pattern has no performance regression
**Acceptance**:
- [ ] Latency: new pattern is same or faster (no resume overhead)
- [ ] Memory: similar or better (no interrupt state)
- [ ] Checkpoint size: similar (messages-based)

## Phase 4: Documentation and Spec Updates

### Task 4.1: Update Spec References
**Files**: `openspec/specs/workflow-interrupt-control-flow/spec.md`, `openspec/specs/workflow-interrupt-message-persistence/spec.md`
**Description**: Update existing specs to reflect new patterns
**Acceptance**:
- [ ] Specs updated to document new interrupt guidelines
- [ ] Examples show both correct and incorrect usage
- [ ] Migration notes added

### Task 4.2: Archive Old Tests
**Files**: `src/main/services/domain/workflow/subgraphs/teach/__tests__/explain-interrupt-resume.test.ts`, `src/main/services/domain/workflow/subgraphs/practice/__tests__/askQuestion-node.test.ts`
**Description**: Archive tests for old interrupt-based pattern
**Acceptance**:
- [ ] Tests moved to `__archive__` folder
- [ ] README in archive explains what was tested
- [ ] Reference to new tests added

### Task 4.3: Document Migration
**File**: `openspec/changes/refactor-workflow-interrupt-usage/MIGRATION.md`
**Description**: Document the migration path for future developers
**Acceptance**:
- [ ] Explains why interrupt was removed from chat flows
- [ ] Shows before/after code comparison
- [ ] Lists what changed and what stayed the same
- [ ] Provides examples of correct interrupt usage

## Validation Checklist

Before marking as complete:
- [ ] All Phase 1 documentation changes reviewed
- [ ] All Phase 2 refactored nodes tested individually
- [ ] All Phase 2 IPC/frontend changes verified
- [ ] All Phase 3 integration tests passing
- [ ] No regressions in existing functionality
- [ ] Frontend verified working with new pattern
- [ ] Checkpoint/restore verified
- [ ] Performance validated
- [ ] Old interrupt-based nodes removed

## Dependencies

- **Parallelizable**: Tasks 1.1-1.3 can run in parallel
- **Sequential**: Task 2.1 must complete before 2.2
- **Sequential**: Task 2.3 must complete before 2.4
- **Sequential**: Tasks 2.7-2.9 depend on 2.1-2.5 completion
- **Prerequisite**: Tasks 2.1-2.9 complete before 3.1-3.7
- **Sequential**: All tests must pass before old nodes removed

## Estimated Effort

- **Phase 1**: 4 hours
- **Phase 2**: 24 hours (includes IPC/frontend work)
- **Phase 3**: 16 hours
- **Phase 4**: 4 hours
- **Total**: 48 hours (6 days)

## Risk Level

**Medium-High Risk**
- Breaking changes to core workflow
- Removes existing interrupt-based nodes
- Requires IPC handler and frontend updates
- Requires comprehensive testing

**Mitigations**:
- Thorough testing before removal
- Frontend compatibility verified
- Clear migration documentation
- All tests passing before merge
- IPC layer changes planned and tested
