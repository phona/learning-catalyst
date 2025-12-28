# message-edit-gating Specification

## Purpose
Prevent a broken "Edit message" control from appearing in the chat UI until we can support true edit/branch semantics end-to-end.

## ADDED Requirements

### Requirement: Hide Edit Action When Not Supported
If the application cannot correctly honor assistant-ui edit/branch semantics (trimmed history + persisted branch), the UI MUST NOT show the user-message Edit (pencil) action.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Edit Is Not Offered
- **Given** the chat UI is rendered using `@assistant-ui/react-ui` Thread
- **And** the backend does not support edit/branch persistence yet
- **When** the user views any user message in the thread
- **Then** the Edit (pencil) action is not rendered
- **And** the user cannot enter edit mode for previous messages

