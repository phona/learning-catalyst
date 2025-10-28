import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { ipcMain } from 'electron';

interface AppConfig {
	ai: {
		default_provider: string;
		default_model: string;
		temperature: number;
		max_tokens: number;
		providers: Record<string, any>;
		streaming: boolean;
		enable_thinking: boolean;
		context_window_size: number;
		model_types: Record<string, any>;
	};
	ui: {
		theme: string;
		show_token_usage: boolean;
		display_format: string;
		session_duration: number;
		font_size: string;
		sidebar_width: number;
		auto_save: boolean;
		auto_scroll: boolean;
		show_line_numbers: boolean;
		enable_markdown: boolean;
		enable_syntax_highlighting: boolean;
		compact_mode: boolean;
	};
	learning: {
		auto_save: boolean;
		session_timeout_minutes: number;
		difficulty: string;
		learning_style: string;
		personalization_enabled: boolean;
		checkpoint_interval: number;
		max_session_history: number;
		enable_analytics: boolean;
		preferred_explanation_length: string;
	};
	privacy: {
		store_conversations: boolean;
		retention_days: number;
		anonymous_analytics: boolean;
		crash_reporting: boolean;
		encrypt_local_storage: boolean;
		auto_cleanup: boolean;
		export_format: string;
	};
	performance: {
		cache_size_mb: number;
		enable_caching: boolean;
		max_concurrent_requests: number;
		request_timeout: number;
		memory_limit_mb: number;
		gpu_acceleration: boolean;
		background_processing: boolean;
		preload_models: boolean;
	};
	[key: string]: any;
}

const defaultConfig: AppConfig = {
	ai: {
		default_provider: 'openai',
		default_model: 'gpt-3.5-turbo',
		temperature: 0.7,
		max_tokens: 4096,
		providers: {},
		streaming: true,
		enable_thinking: true,
		context_window_size: 10,
		model_types: {
			chat: {
				default_provider: 'openai',
				default_model: 'gpt-3.5-turbo',
				available_providers: ['openai', 'chatglm', 'deepseek', 'siliconflow'],
				settings: {
					temperature: 0.7,
					max_tokens: 4096,
					top_p: 0.9,
					frequency_penalty: 0,
					presence_penalty: 0
				},
				capabilities: {
					streaming: true,
					thinking: true,
					function_calling: true,
					vision: false,
					max_input_tokens: 16384,
					max_output_tokens: 4096
				}
			},
			embedding: {
				default_provider: 'openai',
				default_model: 'text-embedding-3-small',
				available_providers: ['openai', 'chatglm', 'siliconflow'],
				settings: {
					max_tokens: 8192
				},
				capabilities: {
					streaming: false,
					thinking: false,
					function_calling: false,
					vision: false,
					max_input_tokens: 8192,
					max_output_tokens: 0
				}
			},
			rerank: {
				default_provider: 'siliconflow',
				default_model: 'BAAI/bge-reranker-v2-m3',
				available_providers: ['siliconflow'],
				settings: {
					max_tokens: 512
				},
				capabilities: {
					streaming: false,
					thinking: false,
					function_calling: false,
					vision: false,
					max_input_tokens: 512,
					max_output_tokens: 0
				}
			}
		}
	},
	ui: {
		theme: 'dark',
		show_token_usage: true,
		display_format: 'detailed',
		session_duration: 45,
		font_size: 'medium',
		sidebar_width: 256,
		auto_save: true,
		auto_scroll: true,
		show_line_numbers: true,
		enable_markdown: true,
		enable_syntax_highlighting: true,
		compact_mode: false,
	},
	learning: {
		auto_save: true,
		session_timeout_minutes: 120,
		difficulty: 'adaptive',
		learning_style: 'reading',
		personalization_enabled: true,
		checkpoint_interval: 30,
		max_session_history: 100,
		enable_analytics: true,
		preferred_explanation_length: 'detailed',
	},
	privacy: {
		store_conversations: true,
		retention_days: 30,
		anonymous_analytics: true,
		crash_reporting: true,
		encrypt_local_storage: false,
		auto_cleanup: true,
		export_format: 'json',
	},
	performance: {
		cache_size_mb: 100,
		enable_caching: true,
		max_concurrent_requests: 3,
		request_timeout: 30,
		memory_limit_mb: 512,
		gpu_acceleration: false,
		background_processing: true,
		preload_models: false,
	},
};

export function setupConfigHandlers(globalWorkspacePath: string): void {
	async function loadWorkspaceConfig(): Promise<AppConfig> {
		const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

		try {
			await access(configPath);
			const configContent = await readFile(configPath, 'utf-8');
			const workspaceConfig = JSON.parse(configContent);
			return mergeConfigs(defaultConfig, workspaceConfig);
		} catch (error) {
			return defaultConfig;
		}
	}

	async function saveWorkspaceConfig(config: AppConfig): Promise<void> {
		const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

		try {
			const catalystDir = dirname(configPath);
			await mkdir(catalystDir, { recursive: true });
			await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
		} catch (error) {
			throw new Error(`Failed to save workspace config: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	function mergeConfigs(defaults: any, overrides: any): any {
		const result = { ...defaults };

		for (const key in overrides) {
			if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
				result[key] = mergeConfigs(result[key] || {}, overrides[key]);
			} else {
				result[key] = overrides[key];
			}
		}

		return result;
	}

	function getNestedValue(obj: any, path: string): any {
		return path.split('.').reduce((current, key) => current?.[key], obj);
	}

	function setNestedValue(obj: any, path: string, value: any): any {
		const keys = path.split('.');
		const lastKey = keys.pop()!;
		const target = keys.reduce((current, key) => {
			if (!current[key] || typeof current[key] !== 'object') {
				current[key] = {};
			}
			return current[key];
		}, obj);
		target[lastKey] = value;
		return obj;
	}

	function deleteNestedValue(obj: any, path: string): any {
		const keys = path.split('.');
		const lastKey = keys.pop()!;
		const target = keys.reduce((current, key) => current?.[key], obj);

		if (target && target.hasOwnProperty(lastKey)) {
			delete target[lastKey];
		}

		return obj;
	}

	ipcMain.handle('config:get', async () => {
		return await loadWorkspaceConfig();
	});

	ipcMain.handle('config:set', async (_, config: any) => {
		await saveWorkspaceConfig(config);
	});

	ipcMain.handle('config:delete:key', async (_, key: string) => {
		const config = await loadWorkspaceConfig();
		const updatedConfig = deleteNestedValue(config, key);
		await saveWorkspaceConfig(updatedConfig);
	});

	ipcMain.handle('config:get:key', async (_, key: string) => {
		const config = await loadWorkspaceConfig();
		return getNestedValue(config, key);
	});

	ipcMain.handle('config:set:key', async (_, key: string, value: any) => {
		const config = await loadWorkspaceConfig();
		const updatedConfig = setNestedValue(config, key, value);
		await saveWorkspaceConfig(updatedConfig);
	});

	ipcMain.handle('config:reset', async () => {
		const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');
		try {
			await access(configPath);
			const fs = await import('fs/promises');
			await fs.unlink(configPath);
			return await loadWorkspaceConfig();
		} catch (error) {
			return defaultConfig;
		}
	});
}