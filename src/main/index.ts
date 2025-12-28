import { app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerAppLifecycle } from './app/start';
import { registerProcessErrorHandlers, registerReadinessIpcHandlers } from './app/readiness';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// dist-electron/
//   main/index.js        (Electron Main)
//   preload/index.cjs    (Preload)
// dist/index.html        (Renderer)
//
process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

const remoteDebugPort = +(process.env.REMOTE_DEBUGGING_PORT || '9222');
try {
  app.commandLine.appendSwitch('remote-debugging-port', String(remoteDebugPort));
} catch (e) {
  void e;
}

registerReadinessIpcHandlers();
registerProcessErrorHandlers();

const preloadPath = path.join(__dirname, '../preload/index.cjs');
const indexHtmlPath = path.join(RENDERER_DIST, 'index.html');

registerAppLifecycle({
  preloadPath,
  indexHtmlPath,
  viteDevServerUrl: VITE_DEV_SERVER_URL,
});

