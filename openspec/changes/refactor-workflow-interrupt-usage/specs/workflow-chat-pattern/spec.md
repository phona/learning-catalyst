# workflow-chat-pattern Specification

## Purpose
Define the natural chat flow pattern for workflow nodes, replacing interrupt-based Q&A with message-based state machines.

## ADDED Requirements

### Requirement: Workflow Nodes Use Natural Chat Flow for Q&A
Workflow nodes that need user input during conversation MUST NOT use `LangGraph.interrupt()`. Instead, they MUST:
1. Generate content and append AIMessage to state
2. Set explicit phase in state (e.g., `teach.phase = 'awaiting_response'`)
3. END the graph (terminate execution)
4. Let the next workflow run process the user's message

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: Teach Flow Uses Natural Chat Pattern
- **Given** the teach subgraph needs to provide explanation
- **When** `generateExplanationNode` executes
- **Then** it:
  - Generates teaching content using AI
  - Returns `{ messages: [new AIMessage(content)], teach: { phase: 'awaiting_response' } }`
  - Does NOT call `interrupt()`
  - Ends the graph execution

#### Scenario: Practice Flow Uses Natural Chat Pattern
- **Given** the practice subgraph needs to ask a question
- **When** `generatePracticeQuestionNode` executes
- **Then** it:
  - Generates practice question using AI
  - Returns `{ messages: [new AIMessage(question)], practice: { phase: 'waiting_for_answer' } }`
  - Does NOT call `interrupt()`
  - Ends the graph execution

#### Scenario: Node Processes User Message Based on Phase
- **Given** a node with `teach.phase === 'awaiting_response'`
- **When** `handleUserResponseNode` executes
- **Then** it:
  - Reads the last message from `state.messages`
  - Classifies the user's intent (question, clarification, ready for practice)
  - Updates state accordingly
  - Returns updated state with new messages

---

### Requirement: Explicit Phase State Tracks Conversation
Workflow nodes that wait for user input MUST use explicit phase flags in state to track what they're waiting for.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Teach Phase Tracks Awaiting Response
- **Given** `generateExplanationNode` just executed
- **When** the state is checked
- **Then** `state.teach.phase === 'awaiting_response'`
- **And** `handleUserResponseNode` can check this phase to know it should process the message

#### Scenario: Practice Phase Tracks Waiting for Answer
- **Given** `generatePracticeQuestionNode` just executed
- **When** the state is checked
- **Then** `state.practice.phase === 'waiting_for_answer'`
- **And** `assessAnswerNode` can check this phase to know it should process the answer

#### Scenario: Phase Resets After Processing
- **Given** `handleUserResponseNode` processes a user question
- **When** it completes processing
- **Then** it returns `{ teach: { phase: 'idle' } }`
- **And** the next call won't process as an awaiting response

---

### Requirement: Messages Persist Without Interrupt
Workflow nodes MUST rely on LangGraph's message persistence, NOT interrupt state, for conversation history.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Chat History Persists via Messages
- **Given** a teach flow: explanation → user question → response
- **When** a checkpoint is saved after each step
- **Then** the checkpoint contains:
  - `messages: [AIMessage(explanation), HumanMessage(user_question), AIMessage(response)]`
  - `teach: { phase: 'idle' }`
  - NO interrupt-specific state

#### Scenario: Restore Works with Messages Only
- **Given** a checkpoint saved during teach flow
- **When** the workflow resumes from checkpoint
- **Then** it can reconstruct the full conversation from `messages` array
- **And** it uses `teach.phase` to determine next action

#### Scenario: No Resume Protocol Needed
- **Given** the workflow has ended after generating explanation
- **When** the user sends a message
- **Then** the frontend sends it as a normal chat message
- **And** the workflow processes it based on `teach.phase`
- **And** NO special resume handling is needed

---

### Requirement: Interrupt Still Used for Structured Interactions
Workflow nodes that need structured user input (approve/reject, select, upload, rate) SHALL still use `LangGraph.interrupt()`.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Learning Path Selection Uses Interrupt
- **Given** the workflow needs user to choose learning style
- **When** `selectLearningPathNode` executes
- **Then** it calls `interrupt({ type: 'learning_path_selection', options: [...] })`
- **And** the frontend shows a selection UI (not chat input)
- **And** the resume value is the selected option (string)

#### Scenario: Study Plan Approval Uses Interrupt
- **Given** the workflow generated a study plan
- **When** `approveStudyPlanNode` executes
- **Then** it calls `interrupt({ type: 'approve_study_plan', prompt: 'Approve this plan?' })`
- **And** the frontend shows approve/reject buttons
- **And** the resume value is 'approved' or 'rejected'

#### Scenario: File Upload Uses Interrupt
- **Given** the workflow needs user to upload notes
- **When** `uploadNotesNode` executes
- **Then** it calls `interrupt({ type: 'upload_notes', prompt: 'Upload your notes' })`
- **And** the frontend shows a file picker
- **And** the resume value is the uploaded file data

#### Scenario: Understanding Rating Uses Interrupt
- **Given** the workflow needs user to rate understanding
- **When** `rateUnderstandingNode` executes
- **Then** it calls `interrupt({ type: 'rate_understanding', prompt: 'Rate 1-5' })`
- **And** the frontend shows a rating scale UI
- **And** the resume value is the rating (1-5)

---

### Requirement: Graph Routing Uses Phase for Decision Making
Workflow graphs MUST route based on phase state to determine which node to execute next.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Teach Graph Routes Based on Phase
- **Given** `state.teach.phase === 'awaiting_response'`
- **When** the graph needs to route next
- **Then** it routes to `handleUserResponseNode`
- **And** if `phase === 'idle'`, it routes elsewhere or ends

#### Scenario: Practice Graph Routes Based on Phase
- **Given** `state.practice.phase === 'waiting_for_answer'`
- **When** the graph needs to route next
- **Then** it routes to `assessAnswerNode`
- **And** if `phase === 'idle'`, it routes to next question or completion

#### Scenario: Main Graph Routes to Subgraphs Correctly
- **Given** the main workflow graph
- **When** routing from TEACH node
- **Then** it enters the teach subgraph at the correct node based on phase
- **And** routing from PRACTICE node enters practice subgraph at correct node

---

### Requirement: Old Interrupt-Based Q&A Pattern
The old pattern of using `interrupt()` for chat Q&A is REMOVED and MUST NOT be used.

**Priority**: P0 (Critical)
**Effort**: L

#### Scenario: explainNode Does Not Use Interrupt
- **Given** `src/main/services/domain/workflow/subgraphs/teach/nodes/explain.ts`
- **When** the file is refactored
- **Then** it does NOT contain any calls to `interrupt()`
- **And** it uses the natural chat flow pattern instead

#### Scenario: askQuestionNode Does Not Use Interrupt
- **Given** `src/main/services/domain/workflow/subgraphs/practice/nodes/askQuestion.ts`
- **When** the file is refactored
- **Then** it does NOT contain any calls to `interrupt()`
- **And** it uses the natural chat flow pattern instead

#### Scenario: No Resume Protocol in Frontend
- **Given** the renderer chat components
- **When** processing messages for teach/practice flows
- **Then** they do NOT handle `interrupt` events
- **And** they only send messages normally

---

### Requirement: Tests Validate Natural Chat Flow
Test suites MUST verify that teach and practice flows work without interrupt.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Unit Test Verifies No Interrupt in generateExplanationNode
- **Given** a unit test for `generateExplanationNode`
- **When** the node executes
- **Then** the test verifies:
  - `interrupt()` was NOT called
  - Result includes `messages: [AIMessage]`
  - Result includes `teach: { phase: 'awaiting_response' }`

#### Scenario: Unit Test Verifies No Interrupt in generatePracticeQuestionNode
- **Given** a unit test for `generatePracticeQuestionNode`
- **When** the node executes
- **Then** the test verifies:
  - `interrupt()` was NOT called
  - Result includes `messages: [AIMessage]`
  - Result includes `practice: { phase: 'waiting_for_answer' }`

#### Scenario: Integration Test Verifies Full Chat Flow
- **Given** an integration test for teach flow
- **When** it runs: generate explanation → send user message → handle response
- **Then** the test verifies:
  - No interrupt events occurred
  - Messages array contains all conversation turns
  - Phase transitions correctly

#### Scenario: Integration Test Verifies Full Practice Flow
- **Given** an integration test for practice flow
- **When** it runs: generate question → send answer → assess
- **Then** the test verifies:
  - No interrupt events occurred
  - Messages array contains question and answer
  - Phase transitions correctly

---

## Related Specifications

- **MODIFIED**: `workflow-interrupt-control-flow` - Update to document new patterns
- **MODIFIED**: `workflow-interrupt-message-persistence` - Update to document messages-only approach
- **RELATED**: `chat-transport-bucket2` - Ensure frontend works with simplified flow
- **RELATED**: `workflow-llm-streaming` - Streaming still works with new pattern
