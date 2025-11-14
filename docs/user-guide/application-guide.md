# Application Guide

This guide summarizes the everyday tasks you can perform inside Learning Catalyst.

## Layout at a Glance

| Area | Purpose |
| --- | --- |
| **Chat** | Core conversational tutor experience with streaming responses and thinking traces (when available). |
| **Sessions** | Browse, filter, and reopen past learning sessions. Saved sessions automatically capture metadata and checkpoints. |
| **Progress** | Dashboard cards showing streaks, recent achievements, and topic mastery. |
| **Knowledge Map** | Visual graph of related concepts discovered during conversations. |
| **Discovery** | Curated prompts and resources to kick off new topics. |
| **Settings** | Centralized controls for AI providers, context length, UI preferences, and workspace options. |

## Start a Learning Session

1. Open the **Chat** view.
2. Select an AI provider and model from the header drop-down (defaults come from Settings).
3. Enter a prompt and optionally attach reference files through the **Attach File** button in the composer.
4. Toggle **Advanced Options** to enable deep thinking mode or review the active provider/model.
5. Watch the response stream live; cancel long generations with `Esc`.

## Manage Sessions

- **Save automatically**: Every conversation is checkpointed. Title updates happen from the session list or inside the chat header.
- **Search and filters**: Narrow sessions by provider, tags, or date using the controls on the left sidebar.
- **Archive**: Move completed sessions out of the main list. Archived items remain searchable.

## Configure AI Providers

1. Navigate to **Settings → AI Providers**.
2. Click a provider card to enter API keys or toggle features such as reasoning traces.
3. Use **Test Connection** to verify credentials before saving.
4. Adjust default model, temperature, and streaming options per provider.

## Customize the Workspace

- **UI Theme**: Switch between Light, Dark, or Auto modes in **Settings → Interface Preferences**. Adjust font size and optional UI toggles (token usage, markdown, compact mode) from the same panel.
- **Response Behavior**: Enable streaming replies or thinking traces under **Settings → Response Settings** when supported by the selected model.
- **Performance**: Tune cache size, concurrency, and privacy switches through **Settings → Advanced Settings** to match your hardware and compliance needs.

Refer to [Troubleshooting](./troubleshooting.md) if something does not behave as expected.
