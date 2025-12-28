# knowledge-crud-and-import-batches Specification

## Purpose
Provide first-class CRUD operations for concepts/relationships (by ID) and track ingestion as import batches.

## ADDED Requirements

### Requirement: CRUD Exists for Concepts and Relationships
The Electron API MUST expose CRUD operations for concepts and relationships using stable IDs.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: User Updates a Concept Without Ingestion
- **Given** a concept exists in the knowledge base with id `C1`
- **When** the user edits the concept name/description in the UI and saves
- **Then** the UI calls a concept update endpoint (by id) and the concept is updated without using `ingestConcepts`

---

### Requirement: Manual Edits Do Not Use Ingestion
Manual concept and relationship editing UIs MUST NOT create synthetic parse results for `ingestConcepts`.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Relationship Manager Creates Relationship Via CRUD
- **Given** the user selects a source concept and a target concept
- **When** the user creates a relationship
- **Then** the UI calls a relationship create endpoint (by ids) and does not call `ingestConcepts`

---

### Requirement: Ingestion Creates an Import Batch
Every ingestion run MUST create an `importBatchId` and return it in the ingestion result.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Ingestion Returns Batch Summary
- **Given** the user ingests a parse result
- **When** ingestion completes successfully
- **Then** the response includes `importBatchId` and summary counts (inserted/updated/skipped/merged)

---

### Requirement: Imported Entities Are Attributable to a Batch
Concepts and relationships created or updated by ingestion MUST be attributable to the ingest batch and source metadata.

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: User Filters by Import Batch
- **Given** an ingestion run produced `importBatchId=B1`
- **When** the user views imported content for B1
- **Then** the system can identify concepts/relationships associated with B1

