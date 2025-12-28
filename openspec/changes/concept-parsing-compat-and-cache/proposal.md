# Proposal: Concept Parsing Compatibility and Cache UX

## Change ID
concept-parsing-compat-and-cache

## Status
Proposed

## Type
UX

## Summary

Users hit unexpected parse failures (for example: content without markdown headings) and the parse
resume cache can grow large with unclear controls. This proposal improves user-facing clarity and
makes cache management safer and more predictable.

## User Story

As a user, I want to understand why parsing fails and have simple controls to manage parsing jobs
and cache, so concept parsing feels reliable and not "mysterious".

## Current Behavior (Problem)

- The system expects markdown with headings; other content can fail hard.
- The UI hints about headings, but failure messages can still feel surprising.
- Resume cache can grow very large, and the main control today is "clear all".

## Goals

- Make parse input requirements obvious before running.
- Provide a safe retention approach (clear old jobs) rather than only "clear all".
- Keep it simple: no new production dependencies.

## Non-Goals

- Improving extraction model accuracy.
- Building a full job history UI with advanced filtering.
- Changing ingestion logic.

## Proposed Change

### 1) Compatibility messaging and preflight checks

Before parsing, run a lightweight preflight:
- Detect whether the selected content appears to have headings (or meets the required format).
- If not, show a clear message with options (for example: "Add headings" / "Skip file").

Simple model:

```
Select files -> Preflight (requirements) -> Parse
```

If the product direction is to support non-heading text in the future, preflight can also offer a
fallback mode. If not, it should clearly enforce "markdown with headings" as a product rule.

### 2) Cache retention controls

Add a retention policy and controls:
- "Clear old jobs" (by age) and/or "Keep last N jobs".
- Show the current cache count and last job id in the UI.

## Acceptance Criteria

- Users see a clear reason when a file is not parseable (before the expensive parse starts).
- Cache can be reduced without deleting everything (retention control exists).
- No new production dependencies.
- `openspec validate concept-parsing-compat-and-cache` passes.

## Rollback Plan

Revert to the previous cache controls and error messaging.

