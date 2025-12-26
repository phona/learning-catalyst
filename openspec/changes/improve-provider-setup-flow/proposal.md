# Proposal: Improve AI Provider Setup Flow (Guided Steps)

## Change ID
improve-provider-setup-flow

## Status
Proposed

## Type
UX

## Summary

Provider setup works, but the UI does not clearly show the recommended order:
select provider → enter key → validate → fetch models → assign model types.

This proposal adds a lightweight, guided flow so first-time users can succeed without reading docs.

## User Story

As a new user, I want the app to guide me through configuring an AI provider so I can start chatting quickly and confidently.

## Current Behavior (Problem)

Users must infer the setup steps from the screen:
- Validate exists, but the UI does not clearly say it is required before saving.
- "Fetch Models" exists, but users may not know when or why to press it.
- Model type assignment depends on provider configuration, but that dependency is implicit.

## Goals

- Make the recommended setup path obvious for first-time users.
- Show clear per-provider status (not configured / validated / models available / assigned).
- Keep it simple (no wizard screens unless needed).
- No new production dependencies.

## Non-Goals

- Changing provider validation logic.
- Changing how provider IDs are generated/stored.
- Reworking the entire Settings page layout.

## Proposed Change

Add a small "Quick setup" help block at the top of the AI Providers section:

```
1) Add provider
2) Paste API key
3) Validate
4) Fetch models (optional)
5) Assign Chat / Embedding / Rerank
```

Add lightweight status indicators:
- Validated: yes/no
- Models: count (0 if none fetched)
- Assigned: which model types use this provider

## Acceptance Criteria

- A first-time user can follow the on-screen steps to configure a provider.
- The UI clearly indicates why "Save" is disabled (if it is) or what is missing.
- Provider rows show clear status without relying on toast messages alone.
- `npm run lint` and `npm test` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert the guided UI additions; provider setup remains available as before.

