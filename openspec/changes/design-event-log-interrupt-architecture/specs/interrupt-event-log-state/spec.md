# interrupt-event-log-state Specification

## Purpose

Define the event-log pattern for structured interrupt tracking in workflow state, enabling audit trails and proper history restore.

## ADDED Requirements

### Requirement: InterruptRecord Type Definition
The system MUST define an `InterruptRecord` type that captures the full lifecycle of a structured interrupt.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Type Structure
- **Given** the type definition in `types/interrupt-record.ts`
- **When** an InterruptRecord is created
- **Then** it contains: `id` (string), `node` (string), `type` (string), `payload` (object with prompt), `status` ('pending'|'resolved'|'abandoned'), `createdAt` (number)
- **And** optionally contains: `resolvedAt`, `resolution`, `reasoning`

---

### Requirement: InterruptHistory State Channel
The `WorkflowStateAnnotation` MUST include an `interruptHistory` channel with proper reducer.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: State Annotation
- **Given** the workflow state definition
- **When** `interruptHistory` is accessed
- **Then** it is an array of `InterruptRecord[]`
- **And** it has a default value of empty array `[]`

#### Scenario: Reducer Appends New Records
- **Given** existing `interruptHistory = [record1]`
- **When** a node returns `{ interruptHistory: [record2] }`
- **Then** the resulting state has `interruptHistory = [record1, record2]`

#### Scenario: Reducer Updates Existing Records
- **Given** existing `interruptHistory = [{ id: 'x', status: 'pending', ... }]`
- **When** a node returns `{ interruptHistory: [{ id: 'x', status: 'resolved', resolution: 'choice', ... }] }`
- **Then** the resulting state has the record with id='x' updated to status='resolved'
- **And** the record preserves original fields not in update

---

### Requirement: Pending Interrupt Derivation
The pending interrupt MUST be derived from `interruptHistory` (not stored as separate field).

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Derive Pending Interrupt
- **Given** `interruptHistory` contains records
- **When** `getPendingInterrupt(interruptHistory)` is called
- **Then** it returns the last record with `status === 'pending'`
- **Or** it returns `null` if no pending records exist

#### Scenario: No Redundant State
- **Given** the workflow state definition
- **When** checking for pending interrupt fields
- **Then** there is NO separate `pendingInterruptId` or `pendingInterrupt` field
- **And** pending status is always derived from `interruptHistory`

---

### Requirement: Interrupt Record Persistence Before Interrupt
Workflow nodes using `interrupt()` MUST record the interrupt event in state BEFORE calling `interrupt()`.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Pre-Interrupt Record
- **Given** a node needs to pause for structured input
- **When** it prepares to call `interrupt(payload)`
- **Then** it first creates an `InterruptRecord` with status='pending'
- **And** the record is included in the state update
- **And** THEN it calls `interrupt(payload)`

#### Scenario: Crash Recovery
- **Given** a node recorded an interrupt but crashed before `interrupt()` returned
- **When** the thread is restored
- **Then** the `interruptHistory` contains the pending record
- **And** the system can identify the interrupt context

---

### Requirement: Interrupt Resolution Recording
When a workflow resumes from interrupt, the resolved record MUST be updated in state.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Resolution Update
- **Given** a pending interrupt record with id='x'
- **When** the workflow resumes with user's choice
- **Then** the node returns `{ interruptHistory: [{ id: 'x', status: 'resolved', resolvedAt: <now>, resolution: <choice> }] }`
- **And** the checkpoint contains the updated record
