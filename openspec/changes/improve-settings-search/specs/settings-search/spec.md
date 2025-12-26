# settings-search Specification

## Purpose
Make Settings search reliably find real options (labels/descriptions) and clearly report when nothing matches.

## ADDED Requirements

### Requirement: Search Matches Real Settings Items
Settings search MUST match against real setting labels and descriptions (not only section-level placeholder text).

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Search Finds Streaming Toggle
- **Given** the user is on the Settings page
- **When** the user searches for "streaming"
- **Then** the "Enable Streaming Responses" setting is shown as a match

---

### Requirement: Search Shows Empty State When No Matches
If no settings match the query, the Settings UI MUST show a clear empty state message.

**Priority**: P2 (Medium)
**Effort**: S

#### Scenario: Search Shows No Results
- **Given** the user is on the Settings page
- **When** the user searches for "does-not-exist-xyz"
- **Then** the UI shows a "No settings match" message

