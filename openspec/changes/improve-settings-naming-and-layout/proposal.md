# Proposal: Improve Settings Naming and Layout

## Change ID
improve-settings-naming-and-layout

## Status
Proposed

## Type
UX + Docs

## Summary

Settings language is inconsistent across the UI and docs.
For example, the page title says **"Preferences"** while docs and user expectations often say **"Settings"**.
Section names also differ (ex: "AI Models" vs "AI Providers").

This proposal standardizes naming and clarifies the section layout so users can find things faster.

## User Story

As a user, I want Settings labels and sections to match what I see in the app and the docs, so I can quickly find and change options without guessing.

## Current Behavior (Problem)

- The Settings page header says "Preferences".
- The main AI section is titled "AI Models" but the content is primarily provider setup + model selection.
- "Privacy" options live under "Advanced Settings", which is not where many users look for privacy controls.

## Root Cause (Plain Explanation)

We renamed/moved Settings pieces over time, but the UI headings, section names, and docs were not updated together.

## Goals

- Use consistent naming in:
  - Settings page header
  - Settings section titles
  - Docs references
- Put "Privacy" settings under a clearly named section (example: "Data & Privacy").
- Keep the change small and low-risk (mostly labels + moving a small group of settings).

## Non-Goals

- Redesigning the full Settings UI.
- Changing any setting defaults or business logic.
- Adding new production dependencies.

## Proposed Change

### 1) Standardize naming

Pick one primary term and use it everywhere:
- UI page title: "Settings"
- Section name: "AI Providers" (instead of "AI Models")

### 2) Clarify section layout

Suggested structure:

```
Settings
  - AI Providers   (providers, models, response)
  - Interface
  - Data & Privacy (privacy + data actions)
  - Advanced       (true advanced / experimental)
```

### 3) Update docs to match

Update docs pages that mention old names so users can follow the docs exactly.

## Acceptance Criteria

- The Settings page header and section titles use the agreed naming.
- Privacy controls are in a clearly named section (not "Advanced").
- Docs references match the UI labels.
- No setting behavior changes.
- `npm run lint` and `npm test` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert the rename/move commits; no data migration should be needed if we only move UI placement.

