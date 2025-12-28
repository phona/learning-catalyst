# Proposal: Per-Provider Loading + Inline Errors (No Global Lockups)

## Change ID
improve-provider-row-loading-and-errors

## Status
Proposed

## Type
UX

## Summary

Provider actions like "Fetch Models" and validation use shared/global loading state and rely heavily on toast messages.
This can make the page feel blocked and makes it easy to miss errors on a long Settings page.

This proposal scopes loading and errors to the provider row that triggered the action, with clear inline feedback.

## User Story

As a user managing multiple providers, I want actions and errors to apply only to the provider I clicked, so I can keep working without confusion.

## Current Behavior (Problem)

- Loading state can affect multiple providers even when only one provider is fetching.
- Errors are shown as toasts, which are easy to miss.
- There is no "last fetched" / "last validated" state, so users do not know what happened.

## Goals

- Track loading state per provider row (fetching models, validating, saving edits).
- Show errors inline near the relevant field/button (toasts can remain secondary).
- Keep implementation small and testable.
- No new production dependencies.

## Non-Goals

- Changing provider validation or model discovery backend behavior.
- Adding background polling.

## Proposed Change

Replace global flags with maps keyed by provider id:

```
isFetchingModelsByProviderId[providerId] = true/false
validationStatusByProviderId[providerId] = success/error
```

Add inline UI:
- small spinner + "Fetching models..."
- inline error text under the button/input that failed
- optional "Last fetched: <time>" (local time)

## Acceptance Criteria

- Fetching models for Provider A does not block Provider B UI.
- Errors appear next to the action that caused them.
- Tests cover per-row loading and error rendering.
- `npm run lint` and `npm test` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert UI/state changes; keep existing toasts.

