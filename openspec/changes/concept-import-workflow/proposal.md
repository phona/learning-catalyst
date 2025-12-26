# Proposal: Concepts Import Workflow (Parse vs Ingest)

## Change ID
concept-import-workflow

## Status
Proposed

## Type
UX

## Summary

Concept parsing and concept ingestion are currently mixed in the user experience. Users can end up
ingesting twice (or not know when data is saved). This proposal makes the workflow explicit and
consistent: parsing is read-only, ingestion is the only step that writes to the knowledge base.

## User Story

As a user importing learning materials, I want a clear workflow that tells me when concepts are
only being parsed and when they are actually saved, so I can review and control what enters my
knowledge base.

## Current Behavior (Problem)

- Parsing a selection of files can ingest automatically (DB write) during the parse flow.
- The results UI also presents ingestion controls (plan/actions), which suggests ingest is still
  pending and can lead to duplicate or confusing actions.
- Users cannot confidently answer: "Did this already save concepts?".

## Goals

- Make it obvious which step writes to the knowledge base.
- Ensure a user cannot accidentally ingest the same parse result twice.
- Keep it simple: no new production dependencies.

## Non-Goals

- Improving extraction quality, model prompts, or token usage.
- Changing how deduplication works inside ingestion.
- Large redesign of the Discovery UI.

## Proposed Change

Adopt an explicit 2-step flow:

```
Parse (read-only) -> Review/Edit -> Ingest (writes to DB)
```

### UX behavior

- The "Parse Concepts" action produces a parse result only.
- The results view is where the user:
  - sees extracted concepts/relationships
  - edits small fields (name/type/description/tags)
  - chooses an ingestion plan (skip/overwrite/merge/thresholds)
  - clicks "Ingest" to apply to the knowledge base
- If a user closes the results modal without ingesting, no knowledge-base changes occur.

### Data/write boundaries

- Parsing endpoints must not write to SQLite knowledge tables.
- Ingestion endpoint is the only writer for import flows.

## Acceptance Criteria

- Parse does not write concepts/relationships to the knowledge base.
- Ingest is a single explicit action, with a clear success summary (inserted/updated/skipped/merged).
- It is not possible to ingest the same parse result twice via the UI by mistake (clear state/guards).
- No new production dependencies.
- `openspec validate concept-import-workflow` passes.

## Rollback Plan

Revert UI and service flow changes to the previous behavior.

