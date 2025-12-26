import { BrowserWindow, shell } from 'electron';
import path from 'node:path';
import {
  flushPendingIpcErrors,
  handleMainWindowDidFinishLoad,
  setMainWindow,
} from './readiness';

export const createMainWindow = (params: {
  preloadPath: string;
  indexHtmlPath: string;
  viteDevServerUrl?: string;
}) => {
  const win = new BrowserWindow({
    title: 'Learning Catalyst',
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC ?? '', 'favicon.ico'),
    webPreferences: {
      preload: params.preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      offscreen: false,
      enablePreferredSizeMode: false,
      experimentalFeatures: false,
      spellcheck: false,
      plugins: false,
      webSecurity: true,
    },
    show: true,
    backgroundColor: '#ffffff',
  });

  setMainWindow(win);

  win.on('closed', () => {
    setMainWindow(null);
  });

  win.webContents.on('will-navigate', () => {
    win.webContents.session?.clearCache?.();
  });

  win.webContents.once('did-finish-load', () => {
    console.log('[Main] webContents did-finish-load');
    flushPendingIpcErrors();
    handleMainWindowDidFinishLoad();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (params.viteDevServerUrl) {
    console.log('[Main] Loading renderer URL', params.viteDevServerUrl);
    win.loadURL(params.viteDevServerUrl);
    if (process.env.NODE_ENV !== 'production') {
      win.webContents.openDevTools();
    }
  } else {
    console.log('[Main] Loading renderer file', params.indexHtmlPath);
    win.loadFile(params.indexHtmlPath);
  }

  return win;
};
