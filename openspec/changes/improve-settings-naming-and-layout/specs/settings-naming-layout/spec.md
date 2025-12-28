# settings-naming-layout Specification

## Purpose
Ensure the Settings UI uses consistent naming and a clear section layout that matches user expectations and docs.

## MODIFIED Requirements

### Requirement: Settings UI Uses Consistent Naming
The Settings page MUST use consistent naming for the page title and core sections, and MUST match the user-facing docs.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Page Title Matches Docs
- **Given** the user opens the Settings page
- **When** the page renders
- **Then** the page title uses the agreed label (example: "Settings")
- **And** docs that reference this page use the same label

---

### Requirement: Privacy Controls Are Not Under "Advanced"
Privacy controls MUST be placed under a clearly named section (example: "Data & Privacy"), not under "Advanced".

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: User Finds Privacy Controls
- **Given** the user opens the Settings page
- **When** the user looks for privacy controls
- **Then** privacy controls are available under a "Data & Privacy" section (or equivalent)
- **And** they are not only located under "Advanced"

