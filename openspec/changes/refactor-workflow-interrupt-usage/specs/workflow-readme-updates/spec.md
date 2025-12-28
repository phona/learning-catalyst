# workflow-readme-updates Specification

## Purpose
Update the workflow README with best practices for interrupt usage, including a clear decision tree and examples.

## ADDED Requirements

### Requirement: README Has Interrupt Decision Tree
The workflow README MUST include a clear decision tree showing when to use vs not use `interrupt()`.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Decision Tree Shows When NOT to Use Interrupt
- **Given** a developer is deciding whether to use interrupt
- **When** they read the README decision tree
- **Then** it clearly states:
  - "User input is text in chat? → Don't use interrupt"
  - "Need structured input (approve/select/upload/rate)? → Use interrupt"
  - "Want to pause mid-workflow? → Use interrupt"

#### Scenario: Decision Tree Shows When to Use Interrupt
- **Given** a developer needs structured user input
- **When** they read the README decision tree
- **Then** it lists appropriate use cases:
  - Approve/reject workflows
  - Multiple choice selection
  - File uploads
  - Rating scales
  - Any structured UI interaction

#### Scenario: Decision Tree Includes Visual Flow
- **Given** the README includes a decision tree
- **When** a developer reads it
- **Then** it has either:
  - A visual flowchart diagram, OR
  - Clear indented bullet points showing the flow
  - Easy to follow at a glance

---

### Requirement: README Documents Interrupt Anti-Patterns
The workflow README MUST warn against using interrupt for normal chat Q&A flows.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: README Shows Anti-Pattern Example
- **Given** the README anti-patterns section
- **When** a developer reads it
- **Then** it shows code example of WRONG usage:
  ```typescript
  // WRONG: Using interrupt for chat Q&A
  const content = await generateContent();
  const resumeValue = await interrupt({ type: 'chat', prompt: content });
  const userAnswer = extractResumeValue(resumeValue);
  return { messages: [new AIMessage(content), new HumanMessage(userAnswer)] };
  ```

#### Scenario: README Explains Why It's Wrong
- **Given** the README anti-patterns section
- **When** a developer reads the explanation
- **Then** it clearly states:
  - "Forces resume protocol for normal conversation"
  - "Chat UIs already have wait-for-user mechanism"
  - "Adds unnecessary complexity"
  - "Makes testing harder"

#### Scenario: README References This Proposal
- **Given** the README anti-patterns section
- **When** a developer wants to learn more
- **Then** it references:
  - This proposal: `refactor-workflow-interrupt-usage`
  - Link to design document
  - Migration notes

---

### Requirement: README Shows Correct Interrupt Usage
The workflow README MUST provide examples of correct interrupt usage for structured interactions.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: README Shows Learning Path Selection Example
- **Given** the README examples section
- **When** a developer reads it
- **Then** it shows CORRECT usage:
  ```typescript
  export const selectLearningPathNode = (deps) => async (state) => {
    const choice = await interrupt({
      type: 'learning_path_selection',
      prompt: 'How do you learn best?',
      options: ['Visual', 'Auditory', 'Kinesthetic'],
    });

    return {
      messages: [new AIMessage(`Selected: ${choice}`)],
      learningStyle: choice,
    };
  };
  ```

#### Scenario: README Shows Study Plan Approval Example
- **Given** the README examples section
- **When** a developer reads it
- **Then** it shows CORRECT usage:
  ```typescript
  export const approveStudyPlanNode = (deps) => async (state) => {
    const result = await interrupt({
      type: 'approve_study_plan',
      prompt: 'Approve this study plan?',
    });

    return {
      messages: [new AIMessage(`Plan ${result}`)],
      approved: result === 'approved',
    };
  };
  ```

#### Scenario: README Shows File Upload Example
- **Given** the README examples section
- **When** a developer reads it
- **Then** it shows CORRECT usage:
  ```typescript
  export const uploadNotesNode = (deps) => async (state) => {
    const fileData = await interrupt({
      type: 'upload_notes',
      prompt: 'Upload your notes for analysis',
    });

    return {
      messages: [new AIMessage('Notes uploaded!')],
      notes: fileData,
    };
  };
  ```

#### Scenario: README Shows Understanding Rating Example
- **Given** the README examples section
- **When** a developer reads it
- **Then** it shows CORRECT usage:
  ```typescript
  export const rateUnderstandingNode = (deps) => async (state) => {
    const rating = await interrupt({
      type: 'rate_understanding',
      prompt: 'Rate your understanding: 1-5 stars',
    });

    return {
      messages: [new AIMessage(`You rated: ${rating}/5`)],
      understandingLevel: rating,
    };
  };
  ```

---

### Requirement: README Documents Natural Chat Flow Pattern
The workflow README MUST document the natural chat flow pattern as the replacement for interrupt-based Q&A.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: README Shows Natural Chat Flow Example
- **Given** the README pattern section
- **When** a developer reads it
- **Then** it shows the CORRECT pattern:
  ```typescript
  // Node A: Generate content
  export const generateContentNode = (deps) => async (state) => {
    const content = await generateContent(state.topic);
    return {
      messages: [new AIMessage(content)],
      phase: 'awaiting_response',
    };
    // END - graph terminates
  };

  // Node B: Process response
  export const handleResponseNode = (deps) => async (state) => {
    if (state.phase !== 'awaiting_response') return state;

    const lastMessage = state.messages[state.messages.length - 1];
    const response = await processMessage(lastMessage.content);

    return {
      messages: [new AIMessage(response)],
      phase: 'idle',
    };
    // END
  };
  ```

#### Scenario: README Explains Phase State
- **Given** the README pattern section
- **When** a developer reads it
- **Then** it explains:
  - "Use explicit phase flags to track what you're waiting for"
  - "Examples: 'awaiting_response', 'waiting_for_answer', 'idle'"
  - "Phase is checked to determine which node to execute"
  - "Phase resets after processing to avoid reprocessing"

#### Scenario: README Explains Message Persistence
- **Given** the README pattern section
- **When** a developer reads it
- **Then** it explains:
  - "All conversation is stored in messages array"
  - "No special interrupt state needed"
  - "Checkpoint/restore works with messages + phase"
  - "Simpler and more robust than interrupt state"

---

### Requirement: README Has Migration Guide
The workflow README MUST include a migration guide for converting from interrupt-based Q&A to natural chat flow.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: README Shows Before/After Comparison
- **Given** the README migration guide
- **When** a developer reads it
- **Then** it shows:
  - BEFORE: Interrupt-based pattern (wrong)
  - AFTER: Natural chat flow pattern (correct)
  - Side-by-side code comparison
  - Clear explanation of changes

#### Scenario: README Lists Migration Steps
- **Given** the README migration guide
- **When** a developer follows it
- **Then** it provides step-by-step instructions:
  1. Identify interrupt-based Q&A flows
  2. Split into generate + handle nodes
  3. Replace interrupt with phase state
  4. Update graph routing
  5. Update tests

#### Scenario: README Lists What Changed
- **Given** the README migration guide
- **When** a developer wants to understand impact
- **Then** it lists:
  - What was removed (interrupt from teach/practice)
  - What was added (new nodes, phase state)
  - What stayed the same (interrupt for structured interactions)
  - Breaking changes (frontend no longer needs resume handling)

---

### Requirement: Update Existing Interrupt Sections
The README's existing interrupt sections MUST be updated to reflect the new patterns.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: "Interrupt / Resume" Section Updated
- **Given** the README "Interrupt / Resume" section
- **When** a developer reads it
- **Then** it:
  - Still documents LangGraph interrupt mechanics
  - Warns against using for chat Q&A
  - Shows correct usage for structured interactions
  - References the new decision tree

#### Scenario: "Interrupt and Message Persistence" Section Updated
- **Given** the README "Interrupt and Message Persistence" section
- **When** a developer reads it
- **Then** it:
  - Still documents message persistence
  - Notes that natural chat flow doesn't need this pattern
  - Explains why messages-only is simpler
  - Shows both patterns for comparison

#### Scenario: "Pattern 2: Subgraph Node" Updated
- **Given** the README "Pattern 2: Subgraph Node" section
- **When** a developer reads it
- **Then** it:
  - Shows example with natural chat flow (no interrupt)
  - Explains when to use interrupt vs messages
  - Provides phase tracking example

---

### Requirement: README Includes Quick Reference
The workflow README MUST include a quick reference card for interrupt usage.

**Priority**: P2 (Medium)
**Effort**: S

#### Scenario: Quick Reference Card
- **Given** the README quick reference
- **When** a developer needs a reminder
- **Then** it shows a concise table:
  ```
  Use Interrupt For:
  ✅ Approve/Reject workflows
  ✅ Multiple choice selection
  ✅ File uploads
  ✅ Rating scales
  ✅ Structured UI interactions

  Don't Use Interrupt For:
  ❌ Normal chat Q&A
  ❌ Teaching questions
  ❌ Practice answers
  ❌ Any text conversation
  ```

#### Scenario: Quick Reference Links to Details
- **Given** the README quick reference
- **When** a developer wants more info
- **Then** it links to:
  - Decision tree section
  - Anti-patterns section
  - Examples section
  - Migration guide section

---

## File Location
All README updates apply to: `src/main/services/domain/workflow/README.md`

## Related Specifications

- **IMPLEMENTS**: `workflow-chat-pattern` - Documents the new pattern
- **MODIFIES**: `workflow-interrupt-control-flow` - Updates interrupt guidance
- **MODIFIES**: `workflow-interrupt-message-persistence` - Updates message persistence docs
- **RELATED**: `refactor-workflow-interrupt-usage` - Main proposal
