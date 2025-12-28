# checkpoint-history-merge Specification

## Purpose
LangGraph subgraphs (Teach, Practice) store checkpoints in separate namespaces. The chat history loader must query all namespaces to return complete message history, avoiding the abstraction violation of adding SQLite-specific methods to the checkpoint saver interface.

## MODIFIED Requirements

### Requirement: Query All Checkpoint Namespaces for Complete History
When retrieving message history for a session, the chat service MUST query checkpoints from all known namespaces (default, teach, practice) through the `BaseCheckpointSaver` abstraction.

**Priority**: P0 (Critical)
**Effort**: M

**Rationale**: LangGraph automatically creates separate checkpoint namespaces for subgraphs. Messages stored in subgraph namespaces are currently invisible to the history loader, causing incomplete chat history on session reload.

#### Scenario: Session With Teach Subgraph Messages
- **Given** a session has messages stored in checkpoint_ns = ''
- **And** the session has messages stored in checkpoint_ns = 'teach' from a Teach subgraph execution
- **When** `chatService.getMessages(sessionId)` is called
- **Then** messages from both namespaces are returned
- **And** messages are ordered by timestamp
- **And** no duplicate messages appear in the result

#### Scenario: Session With Practice Subgraph Messages
- **Given** a session has messages stored in checkpoint_ns = ''
- **And** the session has messages stored in checkpoint_ns = 'practice' from a Practice subgraph execution
- **When** `chatService.getMessages(sessionId)` is called
- **Then** messages from both namespaces are returned
- **And** messages are ordered by timestamp

#### Scenario: Session With Messages Across All Namespaces
- **Given** a session has messages in checkpoint_ns = '', 'teach', and 'practice'
- **When** `chatService.getMessages(sessionId)` is called
- **Then** all messages from all three namespaces are returned
- **And** the total count equals the sum of unique messages across namespaces

---

### Requirement: Preserve Checkpoint Abstraction Layer
The implementation MUST use only the `BaseCheckpointSaver.getTuple()` interface method. No SQLite-specific methods or database-layer bypasses are allowed.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale**: The chat service depends on `BaseCheckpointSaver`, not `SQLiteCheckpointSaver`. Adding implementation-specific methods breaks abstraction, makes testing harder, and prevents future backend changes.

#### Scenario: Queries Use Abstract Interface
- **Given** the chat service is initialized with a `checkpointSaver` dependency
- **And** the type is `Pick<BaseCheckpointSaver, 'getTuple'>`
- **When** `getMessages` queries multiple namespaces
- **Then** only `checkpointSaver.getTuple(config)` is called
- **And** no SQLite-specific methods are invoked
- **And** no type assertions to concrete types are used

#### Scenario: Mock Checkpointer Works in Tests
- **Given** a test provides a mock checkpoint saver implementing `getTuple`
- **When** `getMessages` is called in the test
- **Then** the mock correctly returns merged messages
- **And** no runtime errors occur from missing SQLite-specific methods

---

### Requirement: De-Duplicate Messages Across Namespaces
When the same message appears in multiple namespaces (e.g., shared state), the merge logic MUST return only one instance using a stable de-duplication key.

**Priority**: P1 (High)
**Effort**: M

**Rationale**: LangGraph may propagate some messages to multiple checkpoints. Without de-duplication, users would see duplicate messages in the chat history.

#### Scenario: Message ID Exists
- **Given** a message with `id = 'msg-123'` appears in both default and teach namespaces
- **When** messages are merged
- **Then** only one instance with id 'msg-123' appears in the result
- **And** the instance preserves the earliest timestamp across namespaces

#### Scenario: Message ID Missing, Use Content Hash
- **Given** a message without an `id` field appears in multiple namespaces
- **And** the messages have identical role, content, timestamp, and tool_calls
- **When** messages are merged
- **Then** only one instance appears in the result
- **And** de-duplication uses a stable hash of the message content

#### Scenario: Distinct Messages With Same ID (Edge Case)
- **Given** two messages have the same `id` but different content or timestamps
- **When** messages are merged
- **Then** the message with the earliest timestamp is kept
- **And** a warning is logged for data inconsistency

---

### Requirement: Sort Messages by Stable Timestamp
After merging, messages MUST be sorted by timestamp in ascending order. When timestamps are missing, fallback to checkpoint metadata `created_at`, then original message index.

**Priority**: P1 (High)
**Effort**: S

**Rationale**: Chat history must display messages in chronological order. Timestamps may be missing in older checkpoints or due to serialization issues.

#### Scenario: All Messages Have Timestamps
- **Given** three messages with timestamps '2024-01-01T10:00:00Z', '2024-01-01T09:00:00Z', '2024-01-01T11:00:00Z'
- **When** messages are merged and sorted
- **Then** the order is: '09:00:00Z', '10:00:00Z', '11:00:00Z'

#### Scenario: Message Missing Timestamp, Use Checkpoint Created At
- **Given** a message has no `timestamp` field
- **And** its checkpoint has metadata `created_at = '2024-01-01T10:30:00Z'`
- **When** messages are sorted
- **Then** the message is ordered using '2024-01-01T10:30:00Z'

#### Scenario: Both Timestamp and Checkpoint Created At Missing
- **Given** a message has no timestamp
- **And** its checkpoint has no `created_at` metadata
- **And** the message is at index 2 in the checkpoint messages array
- **When** messages are sorted
- **Then** the message is ordered by its original array index relative to other messages in the same checkpoint

---

### Requirement: Handle Checkpoint Errors Gracefully
If querying a namespace fails (returns `undefined` or throws), the merge logic MUST continue with other namespaces and log the error.

**Priority**: P1 (High)
**Effort**: S

**Rationale**: A corrupted checkpoint in one namespace should not prevent loading messages from other namespaces. This maximizes history availability.

#### Scenario: One Namespace Checkpoint Missing
- **Given** the default namespace checkpoint exists
- **And** the teach namespace checkpoint does not exist (returns `undefined`)
- **When** `getMessages` is called
- **Then** messages from the default namespace are returned
- **And** a debug log entry notes the missing teach namespace checkpoint
- **And** no error is thrown to the caller

#### Scenario: One Namespace Throws Error
- **Given** the default namespace checkpoint exists
- **And** querying the practice namespace throws a database error
- **When** `getMessages` is called
- **Then** messages from the default namespace are returned
- **And** the error is logged with context (sessionId, namespace)
- **And** the error propagates only if ALL namespaces fail

---

### Requirement: Pending Interrupt Messages Are Preserved
When merging namespaces, pending interrupt messages (stored in checkpoint channel values or pending writes) MUST be included in the final message list.

**Priority**: P1 (High)
**Effort**: S

**Rationale**: Interrupts represent the current conversation state. Losing interrupt messages on session reload breaks the user's ability to continue from where they left off.

#### Scenario: Interrupt in Teach Namespace
- **Given** the teach namespace checkpoint contains a pending interrupt with prompt 'What is 2+2?'
- **When** `getMessages` is called
- **Then** the merged result includes an assistant message with content 'What is 2+2?'
- **And** the message appears at the end of the list

#### Scenario: Interrupt in Practice Namespace
- **Given** the practice namespace checkpoint contains a pending interrupt with prompt 'Try again'
- **When** `getMessages` is called
- **Then** the merged result includes an assistant message with content 'Try again'
- **And** the message includes any reasoning_content from the interrupt payload

#### Scenario: Same Interrupt in Multiple Namespaces
- **Given** the same interrupt prompt exists in both teach and practice namespaces
- **When** `getMessages` is called
- **Then** only one instance of the interrupt message appears in the result
- **And** de-duplication prevents duplicate prompts
