# concept-parsing-compat-and-cache Specification

## Purpose
Reduce surprising parse failures and improve parsing job cache management.

## ADDED Requirements

### Requirement: Preflight Explains Unsupported Inputs
Before running concept parsing, the UI MUST run a lightweight preflight and clearly explain when inputs do not meet requirements.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: File Without Headings Is Rejected Clearly
- **Given** the user selects a markdown file with no headings
- **When** the user attempts to start parsing
- **Then** the UI explains what is missing (headings) and how to fix it before starting the parse

---

### Requirement: Cache Retention Control Exists
The UI MUST provide a retention-based cache cleanup option (by age and/or count), not only "clear all".

**Priority**: P1 (High)
**Effort**: S

#### Scenario: User Clears Old Jobs Only
- **Given** the user has multiple cached parsing jobs
- **When** the user selects "clear old jobs"
- **Then** only jobs outside the retention window are removed and recent jobs remain resumable

---

### Requirement: Cache Stats Are Visible
The parsing UI MUST show cache stats (at least job count and last job id) so users understand what can be resumed.

**Priority**: P2 (Medium)
**Effort**: XS

#### Scenario: User Sees Cache Summary
- **Given** cached parsing jobs exist
- **When** the parsing UI is visible
- **Then** the UI shows cache count and the last job id
