# workflow-test-updates Specification

## Purpose
Define test requirements for validating the natural chat flow pattern and ensuring no regressions.

## ADDED Requirements

### Requirement: Unit Tests for New Teach Nodes
Unit tests MUST verify that teach nodes use natural chat flow without interrupt.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: generateExplanationNode Test
- **Given** `src/main/services/domain/workflow/subgraphs/teach/__tests__/generateExplanation-node.test.ts`
- **When** the test runs
- **Then** it verifies:
  - Node generates teaching content
  - Returns `{ messages: [AIMessage], teach: { phase: 'awaiting_response' } }`
  - Does NOT call `interrupt()`
  - Content is appropriate for topic

#### Scenario: handleUserResponseNode Test
- **Given** `src/main/services/domain/workflow/subgraphs/teach/__tests__/handleUserResponse-node.test.ts`
- **When** the test runs
- **Then** it verifies:
  - Checks `teach.phase === 'awaiting_response'`
  - Reads last message from `state.messages`
  - Classifies intent correctly
  - Updates state and returns new messages
  - Resets phase to 'idle'

#### Scenario: Teach Node Message Persistence Test
- **Given** a teach flow: generate explanation → user message → handle response
- **When** each step saves checkpoint
- **Then** tests verify:
  - All messages are persisted correctly
  - Phase transitions are correct
  - No interrupt state is stored

---

### Requirement: Unit Tests for New Practice Nodes
Unit tests MUST verify that practice nodes use natural chat flow without interrupt.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: generatePracticeQuestionNode Test
- **Given** `src/main/services/domain/workflow/subgraphs/practice/__tests__/generatePracticeQuestion-node.test.ts`
- **When** the test runs
- **Then** it verifies:
  - Node generates practice question
  - Returns `{ messages: [AIMessage], practice: { phase: 'waiting_for_answer' } }`
  - Does NOT call `interrupt()`
  - Question is appropriate for topic

#### Scenario: assessAnswerNode Test
- **Given** `src/main/services/domain/workflow/subgraphs/practice/__tests__/assessAnswer-node.test.ts`
- **When** the test runs
- **Then** it verifies:
  - Checks `practice.phase === 'waiting_for_answer'`
  - Reads last message (user's answer)
  - Assesses/grades the answer
  - Provides feedback message
  - Updates mastery/confidence
  - Resets phase to 'idle'

#### Scenario: Practice Node Message Persistence Test
- **Given** a practice flow: generate question → user answer → assess
- **When** each step saves checkpoint
- **Then** tests verify:
  - Question and answer are persisted
  - Phase transitions are correct
  - Assessment results are stored

---

### Requirement: Integration Tests for End-to-End Chat Flow
Integration tests MUST verify complete workflows work with natural chat pattern.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: Standard Learning Path Test
- **Given** `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`
- **When** it runs: topic → assess → teach (Q&A) → practice (Q&A) → complete
- **Then** it verifies:
  - No interrupt events occur
  - Messages flow naturally
  - All phases transition correctly
  - Checkpoint/restore works
  - Final state is correct

#### Scenario: Fast Track Path Test
- **Given** `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`
- **When** it runs: topic → assess (high confidence) → fast track quiz → teach (if needed) → practice
- **Then** it verifies:
  - Quiz flow works without interrupt
  - Fallback to teach works correctly
  - Practice Q&A works without interrupt
  - All routing decisions are correct

#### Scenario: Multi-Turn Teach Conversation Test
- **Given** a teach flow with multiple user questions
- **When** user asks: question 1 → response → question 2 → response
- **Then** integration tests verify:
  - Each Q&A pair works correctly
  - Context is maintained across turns
  - Phase resets between pairs
  - Conversation history is complete

#### Scenario: Multi-Question Practice Test
- **Given** a practice flow with multiple questions
- **When** user answers: Q1 → feedback → Q2 → feedback
- **Then** integration tests verify:
  - Each Q&A works correctly
  - Mastery builds progressively
  - Phase resets between questions
  - All answers are assessed

---

### Requirement: Graph Routing Tests
Tests MUST verify that graph routing works correctly with phase-based decisions.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Teach Graph Routing Test
- **Given** `src/main/services/domain/workflow/__tests__/edges-routing.test.ts`
- **When** it tests teach subgraph routing
- **Then** it verifies:
  - `START` routes to `generateExplanation`
  - `generateExplanation` ENDs (waits for user)
  - User message routes to `handleUserResponse`
  - `handleUserResponse` ENDs
  - Phase determines routing correctly

#### Scenario: Practice Graph Routing Test
- **Given** `src/main/services/domain/workflow/__tests__/edges-routing.test.ts`
- **When** it tests practice subgraph routing
- **Then** it verifies:
  - `START` routes to `generatePracticeQuestion`
  - `generatePracticeQuestion` ENDs (waits for user)
  - User message routes to `assessAnswer`
  - `assessAnswer` routes to next question or completion
  - Phase determines routing correctly

#### Scenario: Main Graph Integration Test
- **Given** the main workflow graph
- **When** it routes through complete workflow
- **Then** it verifies:
  - TEACH node enters subgraph at correct node
  - PRACTICE node enters subgraph at correct node
  - Conditional routing still works (assess → teach vs fast track)
  - All phase checks work correctly

---

### Requirement: Remove Old Interrupt Tests
Tests for old interrupt-based Q&A patterns MUST be removed or archived.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: explain-interrupt-resume Test Archived
- **Given** `src/main/services/domain/workflow/subgraphs/teach/__tests__/explain-interrupt-resume.test.ts`
- **When** the refactor is complete
- **Then** the test file is:
  - Moved to `__archive__` folder, OR
  - Updated to test new pattern, OR
  - Deleted if covered by new tests

#### Scenario: askQuestion-node Test Archived
- **Given** `src/main/services/domain/workflow/subgraphs/practice/__tests__/askQuestion-node.test.ts`
- **When** the refactor is complete
- **Then** the test file is:
  - Moved to `__archive__` folder, OR
  - Updated to test new pattern, OR
  - Deleted if covered by new tests

#### Scenario: No Interrupt Events in New Tests
- **Given** all new test files for teach/practice flows
- **When** tests run
- **Then** they verify:
  - NO `interrupt()` calls occur
  - NO interrupt events are emitted
  - NO resume protocol is needed
  - Messages flow naturally

---

### Requirement: Checkpoint/Restore Tests
Tests MUST verify that checkpoint/restore works with messages-only approach.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Teach Checkpoint Test
- **Given** a teach flow in progress
- **When** checkpoint is saved during `awaiting_response` phase
- **Then** tests verify checkpoint contains:
  - All messages up to that point
  - `teach: { phase: 'awaiting_response' }`
  - NO interrupt-specific state

#### Scenario: Practice Checkpoint Test
- **Given** a practice flow in progress
- **When** checkpoint is saved during `waiting_for_answer` phase
- **Then** tests verify checkpoint contains:
  - Question message
  - `practice: { phase: 'waiting_for_answer' }`
  - NO interrupt-specific state

#### Scenario: Restore from Checkpoint Test
- **Given** a checkpoint saved during teach or practice flow
- **When** workflow resumes from checkpoint
- **Then** tests verify:
  - Full conversation is reconstructed from messages
  - Phase is correct for next action
  - Workflow continues normally
  - No special resume handling needed

#### Scenario: Long-Running Session Test
- **Given** a workflow session that runs for extended period
- **When** checkpoint is saved and restored later
- **Then** tests verify:
  - All messages are preserved
  - Phase state is correct
  - Conversation context is maintained
  - User can continue naturally

---

### Requirement: Frontend Compatibility Tests
Tests MUST verify that the renderer works with simplified chat flow.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: No Resume Handling Test
- **Given** `src/renderer/components/Chat/__tests__/` or integration tests
- **When** teaching or practice Q&A flows run
- **Then** tests verify:
  - Frontend does NOT handle interrupt events
  - Frontend sends messages normally
  - Messages display correctly in chat UI
  - No special resume logic needed

#### Scenario: Structured Interrupt Still Works Test
- **Given** a workflow with structured interaction (approve/select)
- **When** interrupt is used for structured input
- **Then** tests verify:
  - Frontend shows appropriate UI (buttons/dropdown)
  - User can complete interaction
  - Workflow resumes correctly
  - Chat flow continues normally after

#### Scenario: Mixed Flow Test
- **Given** a workflow with both chat Q&A and structured interactions
- **When** it runs end-to-end
- **Then** tests verify:
  - Chat Q&A works without interrupt handling
  - Structured interactions use interrupt correctly
  - Flow transitions smoothly between modes
  - All user interactions work as expected

---

### Requirement: Performance Tests
Tests MUST verify that new pattern has no performance regression.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Latency Test
- **Given** performance test suite
- **When** measuring teach/practice flow latency
- **Then** it verifies:
  - New pattern is same or faster than old interrupt pattern
  - No overhead from resume protocol
  - Message processing is efficient

#### Scenario: Memory Test
- **Given** memory usage monitoring
- **When** running workflows with new pattern
- **Then** it verifies:
  - Memory usage is same or lower
  - No memory leaks from interrupt state
  - Checkpoint size is reasonable

#### Scenario: Throughput Test
- **Given** concurrent workflow execution
- **When** running multiple workflows
- **Then** it verifies:
  - Throughput is same or better
  - No contention on interrupt state
  - Checkpointing is efficient

---

## Test File Locations

New tests to create:
- `src/main/services/domain/workflow/subgraphs/teach/__tests__/generateExplanation-node.test.ts`
- `src/main/services/domain/workflow/subgraphs/teach/__tests__/handleUserResponse-node.test.ts`
- `src/main/services/domain/workflow/subgraphs/practice/__tests__/generatePracticeQuestion-node.test.ts`
- `src/main/services/domain/workflow/subgraphs/practice/__tests__/assessAnswer-node.test.ts`

Tests to update:
- `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`
- `src/main/services/domain/workflow/__tests__/edges-routing.test.ts`

Tests to archive/remove:
- `src/main/services/domain/workflow/subgraphs/teach/__tests__/explain-interrupt-resume.test.ts`
- `src/main/services/domain/workflow/subgraphs/practice/__tests__/askQuestion-node.test.ts`

## Related Specifications

- **VALIDATES**: `workflow-chat-pattern` - Ensures new pattern works correctly
- **VALIDATES**: `workflow-readme-updates` - Examples in README are tested
- **RELATED**: `workflow-test-stability` - Maintain test stability during refactor
