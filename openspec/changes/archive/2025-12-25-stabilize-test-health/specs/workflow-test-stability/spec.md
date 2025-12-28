# workflow-test-stability Spec Delta

## ADDED Requirements

### Requirement: Workflow Complete Path Tests Use Semantic Assertions

Workflow end-to-end tests for complete learning paths MUST assert semantic outcomes (topic, completion, non-empty messages) instead of brittle message-count thresholds that are not part of the user-visible contract.

**Related Specs**:
- `test-infrastructure`
- `workflow-llm-streaming`

**Priority**: P1 (High)  
**Effort**: M

#### Scenario: Standard Learning Path E2E Test Uses Stable Assertions

**Given** the `Full Workflow Integration Tests` in `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`  
**And** a test named `executes complete standard learning path from start to finish`  
**When** the workflow runs to natural completion for a typical standard learning request  
**Then** the test MUST assert that `result.messages` is an array with at least one entry  
**And** the test MUST assert that `result.topic` (or equivalent topic field) is defined  
**And** the test MUST assert that the final message represents a completion/summary of the learning session  
**And** the test MUST NOT rely on a fixed minimum message count (such as `>= 3`) that would fail if internal nodes are regrouped or intermediate messages are combined

#### Scenario: Workflow Graph E2E Test Mirrors Complete Path Expectations

**Given** the `workflow-graph E2E complete workflows` in `src/main/services/domain/workflow/__tests__/workflow-graph.test.ts`  
**When** the `executes complete standard learning path from start to finish` case runs via the compiled workflow graph  
**Then** the test MUST assert the same semantic conditions as the full-workflow test for the standard path  
**And** MUST avoid pinning expectations to a specific `messages.length` threshold beyond ensuring the array is non-empty

#### Scenario: Fast-Track Assessment E2E Test Remains Flexible

**Given** the `Full Workflow Integration Tests` in `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`  
**And** a test named `executes complete fast-track assessment for experienced learners`  
**When** the workflow executes a fast-track path for a high-confidence learner  
**Then** the test MUST assert that `result.messages` is a non-empty array  
**And** the test MUST assert that the result reflects completion of the assessment (for example, by asserting on topic/state or the final message content)  
**And** the test MUST NOT require more than a minimal number of messages (for example, MUST avoid requiring `messages.length > 2`) as long as the assessment semantics are satisfied

