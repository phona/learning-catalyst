import { BrowserWindow } from 'electron';
// Import 7-domain handlers
import { setupChatHandlers } from './chat-handlers';
import { setupLearningHandlers } from './learning-handlers';
import { setupKnowledgeHandlers } from './knowledge-handlers';
import { registerAnalyticsHandlers } from './analytics-handlers';
import { setupAgentHandlers } from './agent-handlers';
import { setupContentHandlers } from './content-handlers';
import { setupSettingsHandlers } from './settings-handlers';
import { setupSessionHandlers } from './session-handlers';

export function setupAllIpcHandlers(mainWindow: BrowserWindow | null, workspacePath: string): void {
	// Setup 7-domain handlers (only communication method with renderer)
	setupChatHandlers();
	setupLearningHandlers();
	setupKnowledgeHandlers();
	registerAnalyticsHandlers();
	setupAgentHandlers();
	setupContentHandlers();
	setupSettingsHandlers(workspacePath);
	setupSessionHandlers();

	console.log('✅ 7-domain IPC handlers registered successfully');
}
