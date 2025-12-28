# Proposal: Improve Settings Search (Find Real Options)

## Change ID
improve-settings-search

## Status
Proposed

## Type
UX

## Summary

The Settings search bar currently filters sections using a fixed string per section.
This makes search feel unreliable: searching for specific setting labels (ex: "streaming", "embedding", "privacy") may not show results even when the option exists.

This proposal makes search match real setting labels/descriptions and provides a clear "No matches" state.

## User Story

As a user, when I type a keyword in Settings search, I want to immediately see the exact settings that match, not just whole sections that sometimes disappear.

## Current Behavior (Problem)

Today the search logic is effectively:

```
if query matches hard-coded section text:
  show section
else:
  hide section
```

So search is not aware of individual controls.

## Goals

- Search matches real setting labels and descriptions (and common keywords).
- Show "No settings match ..." when nothing matches.
- Auto-expand sections that contain matches (optional but recommended).
- Keep implementation small and testable.

## Non-Goals

- Full-text search across docs.
- Building a global app search.
- Adding new production dependencies.

## Proposed Change

### Approach

Create a small in-memory index of Settings items:

```
SettingItem = {
  id,
  sectionId,
  label,
  description?,
  keywords?
}
```

Search filters items, then:
- shows only sections with matching items
- highlights matches in the visible UI (optional)
- shows an empty state if no matches

### UX sketch

```
Search: "embed"
  -> AI Providers (expanded)
       - Embedding Dimensions   (match)
```

## Acceptance Criteria

- Searching for a setting label finds it (ex: "streaming" finds streaming toggle).
- If no matches, an empty state is shown.
- Search does not hide a matching control due to section-level text mismatch.
- `npm run lint` and `npm test` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert the search changes; existing Settings structure remains.

