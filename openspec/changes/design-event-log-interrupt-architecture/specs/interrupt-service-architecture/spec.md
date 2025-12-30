# interrupt-service-architecture Specification

## Purpose

Define the interrupt service layer that owns interrupt lifecycle, separating business logic from IPC transport handlers.

## ADDED Requirements

### Requirement: Interrupt Service Factory Pattern
The system MUST provide a `createInterruptService(deps)` factory that encapsulates all interrupt-related business logic.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Service Creation
- **Given** the application initializes services
- **When** `createInterruptService({ checkpointer, loggerService })` is called
- **Then** it returns an object with `prepareRun`, `createInterruptRecord`, `getPendingInterrupt` methods
- **And** the service does not access IPC or window APIs directly

#### Scenario: Dependency Injection
- **Given** a chat handler needs interrupt functionality
- **When** the handler is set up
- **Then** it receives `interruptService` as a dependency
- **And** it delegates interrupt logic to the service (not inline)

---

### Requirement: Interrupt Detection Delegated to Service
The `chat:start-stream` handler MUST delegate interrupt detection to `interruptService.prepareRun()` instead of inline logic.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Prepare Run Without Pending Interrupt
- **Given** no pending interrupt exists for `threadId=X`
- **When** `interruptService.prepareRun('X', 'user input')` is called
- **Then** it returns `{ shouldResume: false }`
- **And** the handler invokes workflow with normal input

#### Scenario: Prepare Run With Pending Interrupt
- **Given** a pending interrupt exists for `threadId=X`
- **When** `interruptService.prepareRun('X', 'user response')` is called
- **Then** it returns `{ shouldResume: true, checkpointId: '<id>' }`
- **And** the handler invokes workflow with `Command({ resume })`

---

### Requirement: Interrupt Record Creation
The interrupt service MUST provide `createInterruptRecord(params)` to generate properly structured interrupt records.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Create Interrupt Record
- **Given** a workflow node needs to trigger a structured interrupt
- **When** `interruptService.createInterruptRecord({ node: 'selectPath', type: 'select', payload: {...} })` is called
- **Then** it returns an InterruptRecord with unique id, status='pending', and createdAt timestamp
- **And** the record can be stored in workflow state before calling `interrupt()`

---

### Requirement: Handler Simplification
After refactoring, the `chat:start-stream` handler MUST be reduced to transport concerns only (no inline interrupt logic).

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: Handler Complexity Reduction
- **Given** the current handler has ~120 lines with mixed concerns
- **When** interrupt logic is extracted to service
- **Then** the handler is reduced to ~60 lines
- **And** the handler only handles IPC transport (port setup, stream iteration, error handling)
- **And** all interrupt decisions come from service calls

---

## MODIFIED Requirements

### Requirement: Interrupt Detection Uses Service (modifies chat-transport-bucket2)
The `chat:start-stream` handler MUST use `interruptService.prepareRun()` instead of directly calling `hasPendingInterrupt()` for resume detection.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Resume Detection Path (Updated)
- **Given** the workflow for `conversationId=X` has a pending interrupt
- **When** a new user message arrives
- **Then** the handler calls `interruptService.prepareRun(X, message)`
- **And** the service returns `{ shouldResume: true, checkpointId }`
- **And** the handler uses this to invoke `Command({ resume })`
