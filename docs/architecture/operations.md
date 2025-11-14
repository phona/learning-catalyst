# Operations Guide

Short references for keeping Learning Catalyst healthy in development and production builds.

## Memory Management

- **Watch fewer files**: The Vite config excludes heavy directories (`node_modules`, `dist`, `dist-electron`, `external`, `test_workspace`) from file watching. Keep new large folders out of the dev server path.
- **Monitor the dev server**: A custom Vite memory plugin logs RSS usage every 15 seconds and triggers garbage collection when usage exceeds 600 MB. Leave the plugin enabled during local development to surface regressions early.
- **Track all processes**: The memory tooling inspects Electron, Vite, and helper processes. When debugging, verify which process is leaking before adjusting renderer code.

## Database & Migrations

- **SQLite backend**: The main process persists data via `sqlite-electron`. The database file lives under `.catalyst/`.
- **Kysely adoption**: New queries should use the factory in `src/main/services/database/kysely-database.ts` (`createDatabase`). Typed interfaces for tables live in `src/shared/types/database.ts`. Avoid raw SQL to prevent binding bugs.
- **Migration workflow**:
  1. Create a migration in `src/main/database/migrations/` describing schema changes with Kysely.
  2. Register it in the migration runner so it executes on startup.
  3. Add assertions to the integration tests (`vitest.integration.config.ts`) to cover new columns or relations.

## Vector Search Services

- Use `npm run setup:qdrant` to download the managed Qdrant binary and seed default collections.
- Start and stop the embedded service with `npm run qdrant:start` / `npm run qdrant:stop`.
- When cleaning environments, delete the `external/qdrant/data/` directory to reset state.

## Diagnostics Checklist

| Scenario | What to inspect |
| --- | --- |
| Sudden memory spikes | Vite console output, `logs/main.log`, and OS process monitor. |
| Query failures | Ensure migrations ran, and confirm Kysely typings match the actual schema. |
| Vector search returns empty results | Verify Qdrant is running and the workspace sync job completed. |

Keep this guide lean: prune steps that are no longer required as tooling evolves.
