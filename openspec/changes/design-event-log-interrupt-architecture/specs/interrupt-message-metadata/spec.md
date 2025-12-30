# interrupt-message-metadata Specification

## Purpose

Define how structured interrupt prompts embed metadata in AIMessage for frontend detection and rendering, enabling history restore without a separate API endpoint.

## ADDED Requirements

### Requirement: Interrupt Prompt Message Contains Metadata
Workflow nodes that use `interrupt()` for structured input MUST create an AIMessage with interrupt metadata in `additional_kwargs`.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: AIMessage With Interrupt Metadata
- **Given** a workflow node triggers a structured interrupt (select, approve, rate)
- **When** it creates the prompt message
- **Then** the AIMessage includes `additional_kwargs.interruptType` (e.g., 'select', 'approve', 'rate')
- **And** includes `additional_kwargs.interruptId` matching the InterruptRecord id
- **And** includes `additional_kwargs.pending = true` while awaiting response

#### Scenario: Selection Type Includes Options
- **Given** a structured interrupt of type 'select'
- **When** the prompt message is created
- **Then** `additional_kwargs.options` contains the available choices
- **And** each option has at least `id` and `label` fields

---

### Requirement: Frontend Detects Interrupt From Message
The frontend MUST be able to detect pending interrupts by inspecting message `additional_kwargs` without a separate API call.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Detect Pending Interrupt on Load
- **Given** a thread is loaded with `chat:get-messages`
- **When** the frontend iterates through messages
- **Then** it can identify interrupt messages by checking `additional_kwargs.interruptType`
- **And** it can determine if pending by checking `additional_kwargs.pending === true`

#### Scenario: Render Appropriate UI
- **Given** a message with `additional_kwargs.interruptType = 'select'` and `pending = true`
- **When** the frontend renders the message
- **Then** it displays selection UI (buttons/dropdown) instead of text
- **And** the options come from `additional_kwargs.options`

---

### Requirement: Frontend Detects Resolution
The frontend MUST be able to detect interrupt resolution either through updated metadata or subsequent messages.

**Priority**: P2 (Medium)
**Effort**: S

#### Scenario: Resolution Detected
- **Given** a pending interrupt message with `additional_kwargs.pending = true`
- **When** the user responds and the interrupt is resolved
- **Then** the frontend can detect resolution by either:
  - A subsequent checkpoint with `additional_kwargs.pending = false` (preferred)
  - Or observing the user response message in the conversation (fallback)

---

### Requirement: Structured Interrupts Persist Both Message and Record
Structured interrupt nodes MUST persist both the AIMessage with interrupt metadata AND the InterruptRecord in `interruptHistory` for complete audit trail.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Dual Persistence
- **Given** a node triggers a structured interrupt
- **When** it returns state updates
- **Then** `messages` includes the AIMessage with `additional_kwargs` interrupt metadata
- **And** `interruptHistory` includes the InterruptRecord with full event details
