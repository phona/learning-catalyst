# Architecture Overview

Learning Catalyst is an Electron desktop application built with a TypeScript stack. The system is split into three collaborative layers:

| Layer | Location | Responsibilities |
| --- | --- | --- |
| **Main process** | `src/main/` | Boots Electron, manages windows, proxies filesystem and database access, orchestrates background agents. |
| **Renderer** | `src/renderer/` | React UI powered by Vite. Hosts the chat interface, dashboards, settings screens, and state stores. |
| **Shared** | `src/shared/` | Utilities, domain models, and IPC contracts reused across processes. |

Additional supporting folders:
- `external/` – helper services such as the embedded Qdrant vector database.
- `scripts/` – automation for setup tasks (workspace seeding, Qdrant management, etc.).
- `test/` and `src/test/` – Vitest suites for main, renderer, integration, and performance checks.

## Data Flow

1. The renderer dispatches actions through hooks (for example `useChat`) which call IPC endpoints exposed by the services container.
2. The main process routes requests to domain services (session, configuration, agent lifecycle) and persists state in SQLite via `sqlite-electron`.
3. Vector search features call the bundled Qdrant service. Results feed back into the chat orchestration pipeline to ground responses.

## Key Design Principles

- **Process isolation**: Expensive operations (workspace scanning, embeddings) run in dedicated workers to keep the UI responsive.
- **Type safety end-to-end**: Shared TypeScript types guard IPC payloads, storage records, and renderer state transitions.
- **Offline-friendly**: All data lives locally. Optional provider integrations are activated only when credentials are supplied.
- **Testability**: Service interfaces expose mock implementations so Vitest suites can simulate providers without network access.

Read [Operations](./operations.md) for details on maintenance practices, memory safeguards, and database migrations.
