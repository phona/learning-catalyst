# Proposal: Knowledge CRUD API and Import Batches

## Change ID
knowledge-crud-and-import-batches

## Status
Proposed

## Type
Architecture

## Summary

Manual concept/relationship edits currently reuse the ingestion API by fabricating a "parsed result".
That makes edits feel indirect and can cause unexpected duplicates or mismatched updates. This
proposal adds first-class CRUD operations for concepts and relationships (by ID), and tracks ingest
operations as "import batches" so users can understand provenance and manage imports safely.

## User Story

As a user managing my knowledge base, I want to edit concepts and relationships directly and see
where imported concepts came from, so knowledge management feels trustworthy and controllable.

## Current Behavior (Problem)

- UI concept editing and relationship creation can be implemented by calling `ingestConcepts` with
  synthetic data.
- Ingestion is designed for imports; using it for CRUD can lead to confusing semantics:
  - update vs insert depends on name matching and plan defaults
  - provenance is not modeled as a first-class "import run"

## Goals

- Provide direct concept and relationship CRUD operations using stable IDs.
- Keep ingestion focused on imports (parse result -> ingest plan -> DB writes).
- Track imports via an "import batch" id so users can:
  - see provenance (source/material)
  - review what was changed
  - optionally undo an import batch later
- No new production dependencies.

## Non-Goals

- Building a full version history system for concepts.
- Full graph refactor or new visualization engine.

## Proposed Change

### 1) Add CRUD operations (by ID)

Add Electron API endpoints for:
- Create concept
- Update concept (by id)
- Delete concept (by id) with safe relationship handling
- Create relationship (by sourceId/targetId/type)
- Update relationship (by id)
- Delete relationship (by id)

Simple picture:

```
Manual edit UI -> CRUD API (by id) -> SQLite
Imports UI      -> ingestConcepts(plan) -> SQLite + import batch tracking
```

### 2) Import batch tracking for ingestion

When ingesting a parse result, generate an `importBatchId` and store it with each created/updated
entity (concept/relationship metadata). Also store a top-level record for the batch with counts and
timestamps.

This enables:
- Show "last import" summary and "what changed"
- Future "undo last import" (optional follow-up)

## Acceptance Criteria

- Manual concept and relationship edits do not call `ingestConcepts`.
- Ingestion returns an `importBatchId` and summary counts.
- Imported entities can be queried or filtered by `importBatchId` and source metadata.
- No new production dependencies.
- `openspec validate knowledge-crud-and-import-batches` passes.

## Rollback Plan

Revert CRUD endpoints and batch tracking; continue using ingestion-based editing.

