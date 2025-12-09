# Workflow Documentation

This directory documents the Learning Catalyst workflow with one clear purpose per file.

## 📁 Documentation Index

- `workflow-overview.md` — Consolidated overview: ASCII diagram, paths, decisions, thresholds, architecture
- `workflow-graph.mmd` — Main Mermaid diagram of the workflow graph
- `node-role-usage.md` — Guide to the node role mapping system (assistant vs tool)
- `normalization-usage.md` — Guide to message normalization utilities and formats

## 🎯 Quick Start

- Read `workflow-overview.md` to understand the end-to-end flow
- Open `workflow-graph.mmd` in the Mermaid Live Editor for visuals
- Frontend: follow `node-role-usage.md` for role-based rendering
- Backend: follow `normalization-usage.md` for message conversion and IPC

## 🔍 Essential Concepts

- Node roles: `tool` nodes produce structured data for rich UI; `assistant` nodes produce conversational text
- Normalization: convert LangChain messages to OpenAI format and attach minimal metadata for rendering

## 🔗 Related Guides

- Code references live in `src/main/services/domain/workflow/*`
- For deeper details, open the specific guides listed above
