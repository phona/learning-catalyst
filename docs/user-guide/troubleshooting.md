# Troubleshooting

Quick checks for the most common issues.

## Application will not start

1. Confirm dependencies are installed: `npm install` followed by `npm run rebuild` (for native modules).
2. Delete `node_modules/` and reinstall if Electron fails to launch.
3. Linux users should ensure `libX11`, `libxcb`, and `libxkbfile` packages are present.

## Blank or unresponsive window

- Run `npm run dev` from a clean terminal session; Vite reloads can leave zombie processes.
- Reset the renderer cache by deleting the `dist/` and `dist-electron/` directories, then restart the dev server.
- Check the developer tools (`Ctrl/Cmd + Shift + I`) for runtime errors.

## Chat service errors

- Verify API keys in **Settings → AI Providers** and use **Test Connection** after changes.
- Inspect the Electron console logs (View → Toggle Developer Tools → Console) for provider-specific messages.
- If the service keeps stale credentials, restart the app so the main process reloads secrets from secure storage.

## Vector database problems

- Ensure Qdrant is running when using workspace grounding: `npm run qdrant:start`.
- Stop the service with `npm run qdrant:stop` before shutting down your machine to avoid port lock issues.
- If ingestion stalls, remove the `.qdrant` folder inside the workspace and run `npm run setup:qdrant` again.

## Sessions missing or corrupted

- Confirm the workspace path configured in settings points to a writable directory.
- Use the **Session Manager** search filters to ensure the session is not archived.
- Back up the SQLite database located at `.catalyst/learning_catalyst.db` before performing manual edits.

If an issue persists, open a GitHub issue with the steps to reproduce and attach relevant log snippets from `logs/main.log` and `logs/renderer.log`.
