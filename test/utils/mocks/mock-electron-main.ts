/**
 * Mock Electron Main Process APIs
 *
 * Comprehensive mock framework for Electron main process APIs including
 * app, ipcMain, BrowserWindow, MessageChannelMain, and other main thread
 * services. Enables testing of main thread services in isolation.
 */

import { vi } from 'vitest';

// Mock App
export const mockApp = {
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  getName: vi.fn().mockReturnValue('Learning Catalyst'),
  getPath: vi.fn().mockImplementation((name: string) => {
    const paths: Record<string, string> = {
      userData: './test-data/user-data',
      temp: './test-data/temp',
      home: './test-data/home',
      documents: './test-data/documents',
      desktop: './test-data/desktop',
      music: './test-data/music',
      pictures: './test-data/pictures',
      videos: './test-data/videos',
      logs: './test-data/logs',
      crashDumps: './test-data/crashes'
    };
    return paths[name] || './test-data/default';
  }),
  setPath: vi.fn(),
  getAppPath: vi.fn().mockReturnValue('./test-data/app'),
  quit: vi.fn(),
  exit: vi.fn(),
  focus: vi.fn(),
  relaunch: vi.fn(),
  hide: vi.fn(),
  show: vi.fn(),
  isReady: vi.fn().mockResolvedValue(true),
  whenReady: vi.fn().mockResolvedValue(true),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn(),
  getLoginItemSettings: vi.fn().mockReturnValue({
    openAtLogin: false,
    openAsHidden: false,
    path: '',
    args: []
  }),
  setLoginItemSettings: vi.fn(),
  isPackaged: false,
  commandLine: {
    hasSwitch: vi.fn().mockReturnValue(false),
    getSwitchValue: vi.fn().mockReturnValue(''),
    appendSwitch: vi.fn(),
    removeSwitch: vi.fn()
  }
};

// Mock IPC Main
export const mockIpcMain = {
  handle: vi.fn().mockImplementation((channel: string, listener: any) => {
    return { channel, listener };
  }),
  handleOnce: vi.fn(),
  on: vi.fn().mockImplementation((channel: string, listener: any) => {
    return { channel, listener };
  }),
  once: vi.fn(),
  postMessage: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn(),
  listeners: new Map()
};

// Mock Browser Window
export const mockBrowserWindow = vi.fn().mockImplementation((options: any) => ({
  id: Math.floor(Math.random() * 1000) + 1,
  webContents: mockWebContents(),

  // Window state
  isDestroyed: vi.fn().mockReturnValue(false),
  isMinimized: vi.fn().mockReturnValue(false),
  isMaximized: vi.fn().mockReturnValue(false),
  isFullScreen: vi.fn().mockReturnValue(false),
  isFocused: vi.fn().mockReturnValue(true),
  isVisible: vi.fn().mockReturnValue(true),

  // Window manipulation
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  minimize: vi.fn(),
  maximize: vi.fn(),
  unmaximize: vi.fn(),
  restore: vi.fn(),
  fullscreen: vi.fn(),
  setFullScreen: vi.fn(),

  // Position and size
  getPosition: vi.fn().mockReturnValue([100, 100]),
  setPosition: vi.fn(),
  getSize: vi.fn().mockReturnValue([800, 600]),
  setSize: vi.fn(),
  setContentSize: vi.fn(),
  getContentSize: vi.fn().mockReturnValue([800, 600]),
  setBounds: vi.fn(),
  getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),

  // Window properties
  setTitle: vi.fn(),
  getTitle: vi.fn().mockReturnValue('Learning Catalyst'),
  setIcon: vi.fn(),

  // DevTools
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn().mockReturnValue(false),
  isDevToolsFocused: vi.fn().mockReturnValue(false),

  // Events
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn(),

  // Menu
  setMenu: vi.fn(),
  setMenuBarVisibility: vi.fn(),

  // Progress bar
  setProgressBar: vi.fn(),

  // File handling
  openFile: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  saveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: '' }),
  openDirectory: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),

  // Options
  options: options || {},

  // State tracking for tests
  _state: {
    shown: false,
    focused: false,
    minimized: false,
    maximized: false,
    fullscreen: false,
    destroyed: false
  }
}));

// Mock Web Contents
export const mockWebContents = vi.fn().mockImplementation(() => ({
  id: Math.floor(Math.random() * 1000) + 1,

  // Navigation
  loadURL: vi.fn().mockResolvedValue(undefined),
  loadFile: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn(),
  goBack: vi.fn(),
  goForward: vi.fn(),
  stop: vi.fn(),

  // State
  isLoading: vi.fn().mockReturnValue(false),
  isWaitingForResponse: vi.fn().mockReturnValue(false),
  isDestroyed: vi.fn().mockReturnValue(false),

  // Information
  getURL: vi.fn().mockReturnValue('http://localhost:3000'),
  getTitle: vi.fn().mockReturnValue('Learning Catalyst'),

  // Execution
  executeJavaScript: vi.fn().mockImplementation((code: string) => {
    return Promise.resolve(eval(code));
  }),
  insertCSS: vi.fn(),
  removeInsertedCSS: vi.fn(),

  // Audio/Video
  setAudioMuted: vi.fn(),
  isAudioMuted: vi.fn().mockReturnValue(false),

  // Zoom
  setZoomFactor: vi.fn(),
  getZoomFactor: vi.fn().mockReturnValue(1.0),
  setZoomLevel: vi.fn(),
  getZoomLevel: vi.fn().mockReturnValue(0),

  // DevTools
  openDevTools: vi.fn(),
  closeDevTools: vi.fn(),
  isDevToolsOpened: vi.fn().mockReturnValue(false),
  isDevToolsFocused: vi.fn().mockReturnValue(false),
  inspectElement: vi.fn(),

  // Events
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn(),

  // IPC Communication
  send: vi.fn(),
  sendToFrame: vi.fn(),
  sendToAll: vi.fn(),

  // Printing
  print: vi.fn(),
  printToPDF: vi.fn().mockResolvedValue(Buffer.from('')),

  // Focus
  focus: vi.fn(),
  isFocused: vi.fn().mockReturnValue(true),
  blur: vi.fn(),

  // Capturing
  capturePage: vi.fn().mockResolvedValue(Buffer.from('')),

  // Debugging
  debug: vi.fn(),
  getDebugInfo: vi.fn().mockReturnValue({})
}));

// Mock Message Channel Main
export const mockMessageChannelMain = vi.fn().mockImplementation(() => {
  const port1 = {
    postMessage: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
    closed: false,
    onmessage: null as any,
    onmessageerror: null as any,

    _messages: [] as any[],
    _listeners: new Map(),

    // Helper methods for testing
    _receiveMessage: function(message: any) {
      this._messages.push(message);
      if (this.onmessage) {
        this.onmessage({ data: message });
      }
      this._listeners.get('message')?.forEach((listener: any) => listener(message));
    },

    addEventListener: vi.fn().mockImplementation((event: string, listener: any) => {
      this._listeners.set(event, [...(this._listeners.get(event) || []), listener]);
    }),

    removeEventListener: vi.fn().mockImplementation((event: string, listener: any) => {
      const listeners = this._listeners.get(event) || [];
      this._listeners.set(event, listeners.filter((l: any) => l !== listener));
    })
  };

  const port2 = { ...port1 };

  // Connect ports for testing
  port1.addEventListener('message', (message: any) => {
    port2._receiveMessage(message);
  });

  port2.addEventListener('message', (message: any) => {
    port1._receiveMessage(message);
  });

  return {
    port1,
    port2,

    // Test helper methods
    _simulateDisconnection: function() {
      port1.closed = true;
      port2.closed = true;
      port1.close();
      port2.close();
    }
  };
});

// Mock Menu
export const mockMenu = {
  buildFromTemplate: vi.fn().mockImplementation((template: any[]) => ({
    items: template,
    popup: vi.fn(),
    closePopup: vi.fn(),
    append: vi.fn(),
    insert: vi.fn(),
    remove: vi.fn(),
    getMenuItemById: vi.fn(),
    enableMenuItemById: vi.fn(),
    disableMenuItemById: vi.fn()
  })),
  setApplicationMenu: vi.fn(),
  getApplicationMenu: vi.fn().mockReturnValue(null),
  sendActionToFirstResponder: vi.fn()
};

// Mock MenuItem
export const mockMenuItem = vi.fn().mockImplementation((options: any) => ({
  id: options?.id || '',
  label: options?.label || '',
  type: options?.type || 'normal',
  role: options?.role || undefined,
  accelerator: options?.accelerator || undefined,
  icon: options?.icon || undefined,
  enabled: options?.enabled !== false,
  visible: options?.visible !== false,
  checked: options?.checked || false,
  submenu: options?.submenu || null,

  click: vi.fn(),
  enabled: true,
  visible: true,
  checked: false,

  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn()
}));

// Mock Dialog
export const mockDialog = {
  showOpenDialog: vi.fn().mockResolvedValue({
    canceled: false,
    filePaths: ['/path/to/file.txt'],
    bookmarks: []
  }),
  showOpenDialogSync: vi.fn().mockReturnValue({
    canceled: false,
    filePaths: ['/path/to/file.txt'],
    bookmarks: []
  }),
  showSaveDialog: vi.fn().mockResolvedValue({
    canceled: false,
    filePath: '/path/to/save.txt'
  }),
  showSaveDialogSync: vi.fn().mockReturnValue({
    canceled: false,
    filePath: '/path/to/save.txt'
  }),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0, checkboxChecked: false }),
  showMessageBoxSync: vi.fn().mockReturnValue(0),
  showErrorBox: vi.fn(),
  showCertificateTrustDialog: vi.fn().mockResolvedValue(undefined)
};

// Mock Shell
export const mockShell = {
  showItemInFolder: vi.fn(),
  openPath: vi.fn().mockResolvedValue(''),
  openExternal: vi.fn().mockResolvedValue(''),
  beep: vi.fn(),
  moveItemToTrash: vi.fn().mockResolvedValue(true),
  readShortcutLink: vi.fn().mockReturnValue({
    target: '/path/to/target',
    cwd: '/path/to/cwd',
    args: [],
    description: ''
  }),
  writeShortcutLink: vi.fn().mockReturnValue(true)
};

// Mock System Preferences
export const mockSystemPreferences = {
  getUserDefault: vi.fn().mockReturnValue(null),
  setUserDefault: vi.fn(),
  isSwipeTrackingFromScrollEventsEnabled: vi.fn().mockReturnValue(false),
  postNotification: vi.fn(),
  subscribeNotification: vi.fn(),
  unsubscribeNotification: vi.fn(),
  getAppleActionOnMouseDown: vi.fn().mockReturnValue(0)
};

// Mock Power Monitor
export const mockPowerMonitor = {
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  getSystemIdleState: vi.fn().mockReturnValue('active'),
  getSystemIdleTime: vi.fn().mockReturnValue(0),
  isOnBatteryPower: vi.fn().mockReturnValue(false),
  onBattery: false,
  onSuspend: false,
  onResume: false,
  onLockScreen: false,
  onUnlockScreen: false
};

// Mock Auto Updater
export const mockAutoUpdater = {
  setFeedURL: vi.fn(),
  checkForUpdatesAndNotify: vi.fn(),
  checkForUpdates: vi.fn().mockResolvedValue({
    updateInfo: {
      version: '1.0.1',
      releaseNotes: 'Bug fixes and improvements'
    },
    cancellationToken: { cancel: vi.fn() }
  }),
  quitAndInstall: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn(),

  // Mock update state
  updateAvailable: false,
  updateDownloaded: false,

  // Test helpers
  _setUpdateAvailable: function(available: boolean) {
    this.updateAvailable = available;
    this.emit('update-available', { version: '1.0.1' });
  },

  _setUpdateDownloaded: function(downloaded: boolean) {
    this.updateDownloaded = downloaded;
    this.emit('update-downloaded', { version: '1.0.1' });
  }
};

// Mock Screen
export const mockScreen = {
  getPrimaryDisplay: vi.fn().mockReturnValue({
    id: 1,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    scaleFactor: 1,
    rotation: 0,
    touchSupport: 'available'
  }),
  getAllDisplays: vi.fn().mockReturnValue([
    mockScreen.getPrimaryDisplay()
  ]),
  getDisplayNearestPoint: vi.fn().mockReturnValue(mockScreen.getPrimaryDisplay()),
  getDisplayMatching: vi.fn().mockReturnValue(mockScreen.getPrimaryDisplay()),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn()
};

// Mock Global Shortcut
export const mockGlobalShortcut = {
  register: vi.fn().mockReturnValue(true),
  isRegistered: vi.fn().mockReturnValue(false),
  unregister: vi.fn(),
  unregisterAll: vi.fn()
};

// Mock Native Theme
export const mockNativeTheme = {
  shouldUseDarkColors: false,
  shouldUseHighContrastColors: false,
  shouldUseInvertedColorScheme: false,
  themeSource: 'system',

  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn(),
  emit: vi.fn(),

  // Test helpers
  _setShouldUseDarkColors: function(dark: boolean) {
    this.shouldUseDarkColors = dark;
    this.emit('updated');
  }
};

// Export comprehensive mock collection
export const ElectronMainMocks = {
  // Core modules
  app: mockApp,
  ipcMain: mockIpcMain,
  BrowserWindow: mockBrowserWindow,
  webContents: mockWebContents,
  MessageChannelMain: mockMessageChannelMain,

  // UI modules
  Menu: mockMenu,
  MenuItem: mockMenuItem,
  dialog: mockDialog,
  shell: mockShell,

  // System modules
  systemPreferences: mockSystemPreferences,
  powerMonitor: mockPowerMonitor,
  autoUpdater: mockAutoUpdater,
  screen: mockScreen,
  globalShortcut: mockGlobalShortcut,
  nativeTheme: mockNativeTheme
};

// Export default mock collection
export default ElectronMainMocks;