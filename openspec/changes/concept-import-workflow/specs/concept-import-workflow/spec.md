# concept-import-workflow Specification

## Purpose
Make concept parsing (read-only) and concept ingestion (DB write) explicit and consistent.

## ADDED Requirements

### Requirement: Parse Does Not Write to Knowledge DB
Parsing concepts from materials MUST NOT write concepts or relationships to the knowledge base.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: User Parses Without Ingest
- **Given** the user selects markdown files and clicks "Parse Concepts"
- **When** parsing completes and the user closes the results without clicking "Ingest"
- **Then** the knowledge map does not include new concepts from that parse

---

### Requirement: Ingest Is an Explicit User Action
The UI MUST provide a single explicit "Ingest" action that applies the selected ingestion plan and writes to the knowledge base.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: User Reviews Then Ingests
- **Given** the user has a completed parse result with extracted concepts
- **When** the user clicks "Ingest" in the results view
- **Then** the app saves concepts/relationships and shows an ingestion summary (inserted/updated/skipped/merged)

---

### Requirement: Guard Against Double Ingest
The UI MUST prevent accidental double ingestion of the same parse result.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: User Clicks Ingest Twice
- **Given** the user clicks "Ingest" and the request succeeds
- **When** the user clicks "Ingest" again without a new parse result
- **Then** the second action is blocked or treated as a no-op with a clear message

