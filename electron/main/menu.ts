import { Menu, MenuItemConstructorOptions, BrowserWindow, app } from 'electron';

export function createAppMenu(mainWindow: BrowserWindow | null): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // macOS App Menu
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'new-chat');
          },
        },
        {
          label: 'Open Session',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'open-session');
          },
        },
        {
          label: 'Save Session',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'save-session');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Export Conversation',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'export-conversation');
          },
        },
        { type: 'separator' as const },
        ...(isMac
          ? []
          : [
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  mainWindow?.webContents.send('menu:action', 'open-settings');
                },
              },
              { type: 'separator' as const },
            ]),
        ...(isMac
          ? []
          : [
              {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+Q',
                click: () => {
                  app.quit();
                },
              },
            ]),
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }],
              },
            ]
          : [{ role: 'selectAll' as const }]),
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Theme',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'toggle-theme');
          },
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'toggle-sidebar');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'find');
          },
        },
        { type: 'separator' as const },
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },

    // AI Menu
    {
      label: 'AI',
      submenu: [
        {
          label: 'Configure Provider',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'open-settings');
          },
        },
        {
          label: 'Switch Provider',
          submenu: [
            {
              label: 'OpenAI',
              type: 'radio',
              checked: false,
              click: () => {
                mainWindow?.webContents.send('menu:action', 'switch-provider', 'openai');
              },
            },
            {
              label: 'ChatGLM',
              type: 'radio',
              checked: false,
              click: () => {
                mainWindow?.webContents.send('menu:action', 'switch-provider', 'chatglm');
              },
            },
            {
              label: 'DeepSeek',
              type: 'radio',
              checked: false,
              click: () => {
                mainWindow?.webContents.send('menu:action', 'switch-provider', 'deepseek');
              },
            },
            {
              label: 'SiliconFlow',
              type: 'radio',
              checked: false,
              click: () => {
                mainWindow?.webContents.send('menu:action', 'switch-provider', 'siliconflow');
              },
            },
          ],
        },
        { type: 'separator' as const },
        {
          label: 'Clear Conversation',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'clear-conversation');
          },
        },
        {
          label: 'View Token Usage',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'view-token-usage');
          },
        },
      ],
    },

    // Learning Menu
    {
      label: 'Learning',
      submenu: [
        {
          label: 'Create Checkpoint',
          accelerator: 'CmdOrCtrl+Shift+K',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'create-checkpoint');
          },
        },
        {
          label: 'View Progress',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'view-progress');
          },
        },
        {
          label: 'Knowledge Map',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'view-knowledge-map');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Personalize Learning',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'personalize-learning');
          },
        },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'close' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : []),
      ],
    },

    // Help Menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'show-shortcuts');
          },
        },
        {
          label: 'Learning Catalyst Guide',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'show-guide');
          },
        },
        { type: 'separator' as const },
        {
          label: 'Report an Issue',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'report-issue');
          },
        },
        {
          label: 'Check for Updates',
          click: () => {
            mainWindow?.webContents.send('menu:action', 'check-updates');
          },
        },
        { type: 'separator' as const },
        ...(!isMac
          ? [
              {
                label: 'About Learning Catalyst',
                click: () => {
                  mainWindow?.webContents.send('menu:action', 'about');
                },
              },
            ]
          : []),
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}