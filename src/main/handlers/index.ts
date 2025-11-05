import { BrowserWindow } from 'electron';
import { setupFileSystemHandlers } from './file-system-handlers';
import { setupConfigHandlers } from './config-handlers';
import { setupWorkspaceHandlers } from './workspace-handlers';
import { setupDatabaseHandlers } from './database-handlers';
import { setupAppHandlers } from './app-handlers';
import { setupDialogHandlers } from './dialog-handlers';
import { setupWindowHandlers } from './window-handlers';
import { setupDevHandlers } from './dev-handlers';
import { setupAgentHandlers } from './agent-handlers';
import { setupSessionHandlers } from './session-handlers';

export function setupAllIpcHandlers(mainWindow: BrowserWindow | null, workspacePath: string): void {
	// Initialize workspace path
	const globalWorkspacePath = workspacePath;

	// Setup all handler groups
	setupFileSystemHandlers();
	setupConfigHandlers(globalWorkspacePath);
	setupWorkspaceHandlers(mainWindow, globalWorkspacePath);
	setupDatabaseHandlers();
	setupAppHandlers();
	setupDialogHandlers(mainWindow);
	setupWindowHandlers(mainWindow);
	setupDevHandlers(mainWindow);
	setupAgentHandlers();
	setupSessionHandlers();

	console.log('✅ All IPC handlers registered successfully');
}