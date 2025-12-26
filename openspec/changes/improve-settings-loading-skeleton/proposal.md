# Proposal: Use Settings Skeleton for Loading State

## Change ID
improve-settings-loading-skeleton

## Status
Proposed

## Type
UX

## Summary

Settings currently shows a generic spinner while configuration loads.
We already have a `SettingsSkeleton` component that better matches the final layout.

This proposal replaces the spinner with the skeleton for better perceived performance and less layout shift.

## User Story

As a user, when I open Settings, I want the page to feel responsive and stable while it loads.

## Current Behavior (Problem)

- A spinner shows while Settings data is not ready.
- The layout then pops into place, which can feel jarring.

## Goals

- Use the existing `SettingsSkeleton` for loading.
- Avoid layout jump during load.
- Keep code change minimal.

## Non-Goals

- Adding skeletons for every single screen.
- Changing how configuration is fetched.

## Proposed Change

When Settings config is not ready:

```
render <SettingsSkeleton />
```

Instead of:

```
render spinner
```

## Acceptance Criteria

- Settings shows a structured skeleton while loading.
- No functional behavior changes.
- `npm run lint` and `npm test` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert the loading UI change.

