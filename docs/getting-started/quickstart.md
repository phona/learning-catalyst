# Quickstart

Launch Learning Catalyst locally in just a few commands.

## 1. Start the development app

```bash
npm run dev
```

The script boots Vite and Electron together. Once the window opens you can:
- Open the **Chat** view to talk with the AI tutor.
- Visit **Sessions** to review or resume saved conversations.
- Configure providers in **Settings → AI Providers**.

## 2. Use a prepared workspace (optional)

If you want realistic data while testing, populate the sample workspace:

```bash
npm run dev:workspace
```

This starts the app with fixtures found in `test_workspace/`.

## 3. Build a production package

```bash
npm run build
```

The command compiles renderer assets and invokes `electron-builder` to generate installers in `release/`.

## 4. Shut down background services

When finished, stop any helper processes you started (for example `npm run qdrant:stop`). Keeping the workspace clean avoids stray connections when running tests.
