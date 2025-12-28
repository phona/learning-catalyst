# provider-row-feedback Specification

## Purpose
Ensure provider actions show per-row loading and inline errors, so the UI does not feel globally blocked.

## ADDED Requirements

### Requirement: Per-Provider Loading State
Provider actions (validate, fetch models) MUST show loading state only for the provider row that triggered the action.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Fetch Models Does Not Block Other Rows
- **Given** the user has Provider A and Provider B configured
- **When** the user clicks "Fetch Models" for Provider A
- **Then** Provider A shows a loading indicator
- **And** Provider B controls remain usable

---

### Requirement: Inline Errors Near the Failing Action
If provider validation or model discovery fails, the UI MUST show an inline error near the failing field/button.

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: Fetch Models Shows Inline Error
- **Given** a configured provider with an invalid API key
- **When** the user clicks "Fetch Models"
- **Then** the provider row shows an inline error message near the action

