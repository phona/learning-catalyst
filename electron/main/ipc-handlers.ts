import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import {
  setdbPath,
  executeQuery,
  executeMany,
  executeScript,
  fetchOne,
  fetchMany,
  fetchAll
} from 'sqlite-electron';

// Import the comprehensive database schema
import { DATABASE_SCHEMA, DEFAULT_DATA } from '../../src/modules/database/database-schema';

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

// Global workspace path variable
let globalWorkspacePath: string = process.cwd();

// Database variables
let isDatabaseInitialized = false;
let dbMemoryCleanupInterval: NodeJS.Timeout | null = null;
const DB_CLEANUP_INTERVAL = 300000; // 5分钟清理一次
const MAX_RESULT_SIZE = 10000; // 最大结果集大小限制

// Memory monitoring variables
let memoryMonitorInterval: NodeJS.Timeout | null = null;
const MEMORY_MONITOR_INTERVAL = 60000; // 1分钟检查一次
const MEMORY_WARNING_THRESHOLD = 1024 * 1024 * 1024; // 1GB 警告阈值
const MEMORY_CRITICAL_THRESHOLD = 1536 * 1024 * 1024; // 1.5GB 严重阈值

// Default configuration
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
    // Enhanced model type configuration
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

/**
 * Load configuration from workspace file and merge with defaults
 */
async function loadWorkspaceConfig(): Promise<AppConfig> {
  const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

  try {
    // Check if workspace config exists
    await access(configPath);
    const configContent = await readFile(configPath, 'utf-8');
    const workspaceConfig = JSON.parse(configContent);

    // Deep merge workspace config with defaults
    return mergeConfigs(defaultConfig, workspaceConfig);
  } catch (error) {
    // If file doesn't exist or is invalid, return defaults
    return defaultConfig;
  }
}

/**
 * Save configuration to workspace file
 */
async function saveWorkspaceConfig(config: AppConfig): Promise<void> {
  const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');

  try {
    // Ensure .catalyst directory exists
    const catalystDir = dirname(configPath);
    await mkdir(catalystDir, { recursive: true });

    // Write config to file
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save workspace config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deep merge two configuration objects
 */
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

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested value in object using dot notation
 */
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

/**
 * Delete nested value from object using dot notation
 */
function deleteNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current?.[key], obj);

  if (target && target.hasOwnProperty(lastKey)) {
    delete target[lastKey];
  }

  return obj;
}

function startDbMemoryCleanup(): void {
  if (dbMemoryCleanupInterval) {
    clearInterval(dbMemoryCleanupInterval);
  }

  dbMemoryCleanupInterval = setInterval(async () => {
    try {
      // 执行 VACUUM 来清理数据库文件碎片
      if (isDatabaseInitialized) {
        console.log('[DB Memory] Running periodic database cleanup...');

        // 执行内存优化命令
        await executeQuery('PRAGMA optimize');

        // 检查数据库大小
        const sizeResult = await fetchOne('PRAGMA page_count') as any;
        const pageSizeResult = await fetchOne('PRAGMA page_size') as any;
        const pageCount = sizeResult?.page_count || 0;
        const pageSize = pageSizeResult?.page_size || 4096;
        const dbSize = pageCount * pageSize;

        console.log(`[DB Memory] Database size: ${(dbSize / 1024 / 1024).toFixed(2)} MB, pages: ${pageCount}`);

        // 如果数据库过大，执行 VACUUM
        if (dbSize > 100 * 1024 * 1024) { // 大于100MB
          console.log('[DB Memory] Database is large, running VACUUM...');
          await executeQuery('VACUUM');
        }
      }
    } catch (error) {
      console.error('[DB Memory] Cleanup failed:', error);
    }
  }, DB_CLEANUP_INTERVAL);
}

function stopDbMemoryCleanup(): void {
  if (dbMemoryCleanupInterval) {
    clearInterval(dbMemoryCleanupInterval);
    dbMemoryCleanupInterval = null;
    console.log('[DB Memory] Stopped database memory cleanup');
  }
}

function limitResultSize(results: any[]): any[] {
  if (Array.isArray(results) && results.length > MAX_RESULT_SIZE) {
    console.warn(`[DB Memory] Result set too large (${results.length} rows), limiting to ${MAX_RESULT_SIZE}`);
    return results.slice(0, MAX_RESULT_SIZE);
  }
  return results;
}

function startMemoryMonitoring(): void {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
  }

  memoryMonitorInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const rssMB = memUsage.rss / 1024 / 1024;
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;

    console.log(`[Memory Monitor] RSS: ${rssMB.toFixed(1)}MB, Heap: ${heapUsedMB.toFixed(1)}/${heapTotalMB.toFixed(1)}MB, External: ${externalMB.toFixed(1)}MB`);

    // 检查内存使用阈值
    if (memUsage.rss > MEMORY_CRITICAL_THRESHOLD) {
      console.error(`[Memory Monitor] ⚠️ CRITICAL: Memory usage is extremely high (${rssMB.toFixed(1)}MB)`);
      console.log('[Memory Monitor] Forcing garbage collection...');

      // 强制垃圾回收
      if (global.gc) {
        global.gc();

        // 检查垃圾回收后的内存
        setTimeout(() => {
          const newMemUsage = process.memoryUsage();
          const freedMB = (memUsage.rss - newMemUsage.rss) / 1024 / 1024;
          console.log(`[Memory Monitor] Garbage collection freed ${freedMB.toFixed(1)}MB`);
        }, 1000);
      } else {
        console.warn('[Memory Monitor] Garbage collection not available. Run with --expose-gc flag.');
      }
    } else if (memUsage.rss > MEMORY_WARNING_THRESHOLD) {
      console.warn(`[Memory Monitor] ⚠️ WARNING: Memory usage is high (${rssMB.toFixed(1)}MB)`);
    }
  }, MEMORY_MONITOR_INTERVAL);
}

function stopMemoryMonitoring(): void {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = null;
    console.log('[Memory Monitor] Stopped memory monitoring');
  }
}

/**
 * Auto-initialize database with default path
 */
async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔧 Starting database initialization...');

    // Create a default database path in the workspace
    const defaultDbPath = join(globalWorkspacePath, '.catalyst', 'learning_catalyst.db');
    console.log('🔧 Database path will be:', defaultDbPath);

    // Ensure .catalyst directory exists
    await mkdir(dirname(defaultDbPath), { recursive: true });
    console.log('🔧 .catalyst directory created/verified');

    // Initialize SQLite database using sqlite-electron
    console.log('🔧 Opening SQLite database...');
    await setdbPath(defaultDbPath, false, false);
    console.log('🔧 SQLite database opened successfully');

    // Create comprehensive database schema using imported schema
    console.log('🔧 Creating comprehensive database schema...');
    await executeScript(DATABASE_SCHEMA);
    console.log('🔧 Database schema created successfully');

    // Create indexes separately to avoid potential column reference issues
    console.log('🔧 Creating database indexes...');
    const indexSchema = `
      CREATE INDEX IF NOT EXISTS idx_concepts_type ON concepts(concept_type);
      CREATE INDEX IF NOT EXISTS idx_concepts_mastery_level ON concepts(mastery_level);
      CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
      CREATE INDEX IF NOT EXISTS idx_concepts_parent ON concepts(parent_concept_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_concept_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_concept_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
      CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON learning_sessions(start_time);
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_session_concepts_session_id ON session_concepts(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_concepts_concept_id ON session_concepts(concept_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_knowledge_graph_cache_key ON knowledge_graph_cache(cache_key);
      CREATE INDEX IF NOT EXISTS idx_knowledge_graph_cache_expires_at ON knowledge_graph_cache(expires_at);
    `;

    try {
      await executeScript(indexSchema);
      console.log('🔧 Database indexes created successfully');
    } catch (indexErr: any) {
      console.warn('⚠️ Failed to create some indexes (non-critical):', indexErr.message);
      // Don't reject - indexes are non-critical
    }

    // Insert default data
    console.log('🔧 Inserting default data...');
    await executeScript(DEFAULT_DATA);
    console.log('🔧 Default data inserted successfully');
    console.log('✅ Database initialization completed successfully');

    isDatabaseInitialized = true;

    // 启动内存清理定时器
    startDbMemoryCleanup();

    console.log('✅ Database initialized successfully at:', defaultDbPath);

  } catch (error: any) {
    console.error('❌ Failed to initialize database:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    isDatabaseInitialized = false;
    throw new Error(`DATABASE INITIALIZATION FAILED - This application cannot be used without a working database.\n\nError: ${error?.message || String(error)}\n\nPlease restart the application or contact support.`);
  }
}

// Store registered handlers for cleanup
const registeredHandlers: string[] = []

// Helper function to register and track handlers
function registerHandler(channel: string, handler: (...args: any[]) => any) {
  if (!registeredHandlers.includes(channel)) {
    ipcMain.handle(channel, handler)
    registeredHandlers.push(channel)
  }
}

export function cleanupIpcHandlers() {
  registeredHandlers.forEach(channel => {
    ipcMain.removeHandler(channel)
  })
  registeredHandlers.length = 0

  // Enhanced SQLite database cleanup
  cleanupDatabase()
}

// Enhanced database cleanup function
function cleanupDatabase() {
  if (!isDatabaseInitialized) {
    console.log('🗑️ Database already closed')
    return
  }

  console.log('🧹 Cleaning up SQLite database...')

  try {
    // sqlite-electron doesn't have explicit close method
    // Just reset the initialization state
    isDatabaseInitialized = false
    console.log('✅ Database closed successfully')
  } catch (error: any) {
    console.error('❌ Database cleanup error:', error)
    isDatabaseInitialized = false
  }
}

export function setupIpcHandlers(mainWindow: BrowserWindow | null, workspacePath: string): void {
  // Store workspace path globally
  globalWorkspacePath = workspacePath;

  // 启动内存监控
  startMemoryMonitoring();

  // Initialize database if not already done
  if (!isDatabaseInitialized) {
    initializeDatabase()
      .then(() => {
        console.log('✅ Database initialization completed successfully');
      })
      .catch((error) => {
        console.error('❌ Database initialization failed:', error);

        // Show user-friendly error message in main window if available
        if (mainWindow) {
          mainWindow.webContents.send('database:error', {
            message: error.message,
            title: 'Database Initialization Failed'
          });
        }
      });
  }

  // File system handlers
  registerHandler('fs:readFile', async (_, path: string) => {
    try {
      const content = await readFile(path, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  registerHandler('fs:writeFile', async (_, path: string, content: string) => {
    try {
      await writeFile(path, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  registerHandler('fs:existsFile', async (_, path: string) => {
    try {
      await access(path);
      return true;
    } catch (error) {
      return false;
    }
  });

  // Dialog handlers
  ipcMain.handle('dialog:openFile', async (_, options: Electron.OpenDialogOptions) => {
    if (!mainWindow) throw new Error('No main window');
    return await dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle('dialog:saveFile', async (_, options: Electron.SaveDialogOptions) => {
    if (!mainWindow) throw new Error('No main window');
    return await dialog.showSaveDialog(mainWindow, options);
  });

  // App handlers
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  ipcMain.handle('app:getApp', () => {
    return app;
  });

  // Configuration handlers
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
    // Reset to defaults by deleting workspace config file
    const configPath = join(globalWorkspacePath, '.catalyst', 'config.json');
    try {
      await access(configPath);
      const fs = await import('fs/promises');
      await fs.unlink(configPath);
      return await loadWorkspaceConfig(); // Return defaults
    } catch (error) {
      // File doesn't exist, just return defaults
      return defaultConfig;
    }
  });

  // Workspace handlers
  ipcMain.handle('workspace:getPath', () => {
    return globalWorkspacePath;
  });

  ipcMain.handle('workspace:resolvePath', (_, relativePath: string) => {
    return join(globalWorkspacePath, relativePath);
  });

  ipcMain.handle('workspace:readFile', async (_, relativePath: string) => {
    try {
      const fullPath = join(globalWorkspacePath, relativePath);
      const content = await readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('workspace:writeFile', async (_, relativePath: string, content: string) => {
    try {
      const fullPath = join(globalWorkspacePath, relativePath);
      await writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('workspace:existsFile', async (_, relativePath: string) => {
    try {
      const fullPath = join(globalWorkspacePath, relativePath);
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('workspace:openDialog', async (_, options: Electron.OpenDialogOptions) => {
    if (!mainWindow) throw new Error('No main window');
    const updatedOptions = {
      ...options,
      defaultPath: globalWorkspacePath,
    };
    return await dialog.showOpenDialog(mainWindow, updatedOptions);
  });

  // Session handlers
  ipcMain.handle('session:getUserDataPath', () => {
    return app.getPath('userData');
  });

  ipcMain.handle('session:getDocumentsPath', () => {
    return app.getPath('documents');
  });

  ipcMain.handle('session:getAppPath', () => {
    return app.getAppPath();
  });

  // Window handlers
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  // SQLite Database Handlers
  ipcMain.handle('db:setPath', async (_, dbPath: string) => {
    try {
      await setdbPath(dbPath, false, false);
      isDatabaseInitialized = true;
      console.log('Database initialized successfully at:', dbPath);
      return { success: true, result: dbPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:executeQuery', async (_, query: string, params: any[] = []) => {
    try {
      if (!isDatabaseInitialized) {
        throw new Error('Database execute query failed: Database not initialized');
      }
      const result = await executeQuery(query, params);
      return { success: true, result };
    } catch (error: any) {
      throw new Error(`Database execute query failed: ${error.message}`);
    }
  });

  ipcMain.handle('db:fetchOne', async (_, query: string, params: any[] = []) => {
    try {
      if (!isDatabaseInitialized) {
        throw new Error('Database fetch one failed: Database not initialized');
      }
      const result = await fetchOne(query, params);
      return { success: true, result };
    } catch (error: any) {
      throw new Error(`Database fetch one failed: ${error.message}`);
    }
  });

  ipcMain.handle('db:fetchMany', async (_, query: string, size: number, params: any[] = []) => {
    try {
      if (!isDatabaseInitialized) {
        throw new Error('Database fetch many failed: Database not initialized');
      }
      const result = await fetchMany(query, size, params);
      return { success: true, result };
    } catch (error: any) {
      throw new Error(`Database fetch many failed: ${error.message}`);
    }
  });

  ipcMain.handle('db:fetchAll', async (_, query: string, params: any[] = []) => {
    try {
      if (!isDatabaseInitialized) {
        throw new Error('Database fetch all failed: Database not initialized');
      }
      const result = await fetchAll(query, params);
      const limitedResult = limitResultSize(result);
      return { success: true, result: limitedResult };
    } catch (error: any) {
      throw new Error(`Database fetch all failed: ${error.message}`);
    }
  });

  ipcMain.handle('db:executeMany', async (_, query: string, values: any[] = []) => {
    try {
      if (!isDatabaseInitialized) {
        throw new Error('Database execute many failed: Database not initialized');
      }
      const result = await executeMany(query, values);
      return { success: true, result };
    } catch (error: any) {
      throw new Error(`Database execute many failed: ${error.message}`);
    }
  });

  ipcMain.handle('db:executeScript', async (_, script: string) => {
    try {
      if (!isDatabaseInitialized) {
        throw new Error('Database execute script failed: Database not initialized');
      }
      const result = await executeScript(script);
      return { success: true, result };
    } catch (error: any) {
      throw new Error(`Database execute script failed: ${error.message}`);
    }
  });

  // Dev tools handler (development only)
  ipcMain.handle('dev:openDevTools', () => {
    if (mainWindow && process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Add cleanup handler for app shutdown
  app.on('before-quit', () => {
    console.log('[Memory Monitor] App shutting down, stopping all monitoring...');
    stopMemoryMonitoring();
    stopDbMemoryCleanup();
  });

  }