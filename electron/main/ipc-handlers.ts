import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import sqlite3 from 'sqlite3';

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
let databasePath = '';
let db: sqlite3.Database | null = null;

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

/**
 * Auto-initialize database with default path
 */
async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔧 Starting database initialization...');

      // Create a default database path in the workspace
      const defaultDbPath = join(globalWorkspacePath, '.catalyst', 'learning_catalyst.db');
      console.log('🔧 Database path will be:', defaultDbPath);

      // Ensure .catalyst directory exists
      mkdir(dirname(defaultDbPath), { recursive: true })
        .then(() => {
          console.log('🔧 .catalyst directory created/verified');

          // Initialize SQLite3 database
          console.log('🔧 Opening SQLite3 database...');
          db = new sqlite3.Database(defaultDbPath, (err) => {
            if (err) {
              console.error('❌ Failed to open database:', err);
              reject(new Error(`DATABASE INITIALIZATION FAILED - This application cannot be used without a working database.\n\nError: ${err.message}\n\nPlease restart the application or contact support.`));
              return;
            }

            console.log('🔧 SQLite3 database opened successfully');

            // Create comprehensive database schema using imported schema
            console.log('🔧 Creating comprehensive database schema...');
            if (!db) {
              reject(new Error('Database connection failed during schema creation'));
              return;
            }
            db.exec(DATABASE_SCHEMA, (err) => {
              if (err) {
                console.error('❌ Failed to create database schema:', err);
                reject(new Error(`DATABASE SCHEMA CREATION FAILED: ${err.message}`));
                return;
              }

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

              if (!db) {
                reject(new Error('Database connection failed during index creation'));
                return;
              }
              db.exec(indexSchema, (indexErr) => {
                if (indexErr) {
                  console.warn('⚠️ Failed to create some indexes (non-critical):', indexErr.message);
                  // Don't reject - indexes are non-critical
                } else {
                  console.log('🔧 Database indexes created successfully');
                }

                // Insert default data
                console.log('🔧 Inserting default data...');
                if (!db) {
                  reject(new Error('Database connection failed during default data insertion'));
                  return;
                }
                db.exec(DEFAULT_DATA, (err) => {
                  if (err) {
                    console.error('❌ Failed to insert default data:', err);
                    reject(new Error(`DEFAULT DATA INSERTION FAILED: ${err.message}`));
                    return;
                  }

                  console.log('🔧 Default data inserted successfully');
                  console.log('✅ Database initialization completed successfully');

                  isDatabaseInitialized = true;
                  databasePath = defaultDbPath;
                  console.log('✅ Database initialized successfully at:', defaultDbPath);
                  resolve();
                });
              });
            });
          });
        })
        .catch((err) => {
          console.error('❌ Failed to create .catalyst directory:', err);
          reject(new Error(`DATABASE INITIALIZATION FAILED - Could not create directory: ${err.message}`));
        });

    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      console.error('Error details:', error instanceof Error ? error.stack : error);
      isDatabaseInitialized = false;
      reject(new Error(`DATABASE INITIALIZATION FAILED - This application cannot be used without a working database.\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease restart the application or contact support.`));
    }
  });
}

export function setupIpcHandlers(mainWindow: BrowserWindow | null, workspacePath: string): void {
  // Store workspace path globally
  globalWorkspacePath = workspacePath;

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
  ipcMain.handle('fs:readFile', async (_, path: string) => {
    try {
      const content = await readFile(path, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('fs:writeFile', async (_, path: string, content: string) => {
    try {
      await writeFile(path, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  ipcMain.handle('fs:existsFile', async (_, path: string) => {
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

  // SQLite3 Database Handlers
  ipcMain.handle('db:setPath', async (_, dbPath: string) => {
    return new Promise((resolve, reject) => {
      try {
        if (db) {
          db.close();
        }
        db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            reject({ success: false, error: err.message });
            return;
          }
          isDatabaseInitialized = true;
          databasePath = dbPath;
          console.log('Database initialized successfully at:', dbPath);
          resolve({ success: true, result: dbPath });
        });
      } catch (error) {
        reject({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
  });

  ipcMain.handle('db:executeQuery', async (_, query: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      if (!isDatabaseInitialized || !db) {
        reject(new Error('Database execute query failed: Database not initialized'));
        return;
      }

      try {
        db.run(query, params, function(err) {
          if (err) {
            reject(new Error(`Database execute query failed: ${err.message}`));
            return;
          }
          resolve({ success: true, result: this });
        });
      } catch (error) {
        reject(new Error(`Database execute query failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });

  ipcMain.handle('db:fetchOne', async (_, query: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      if (!isDatabaseInitialized || !db) {
        reject(new Error('Database fetch one failed: Database not initialized'));
        return;
      }

      try {
        db.get(query, params, (err, row) => {
          if (err) {
            reject(new Error(`Database fetch one failed: ${err.message}`));
            return;
          }
          resolve({ success: true, result: row });
        });
      } catch (error) {
        reject(new Error(`Database fetch one failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });

  ipcMain.handle('db:fetchMany', async (_, query: string, size: number, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      if (!isDatabaseInitialized || !db) {
        reject(new Error('Database fetch many failed: Database not initialized'));
        return;
      }

      try {
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(new Error(`Database fetch many failed: ${err.message}`));
            return;
          }
          resolve({ success: true, result: rows.slice(0, size) });
        });
      } catch (error) {
        reject(new Error(`Database fetch many failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });

  ipcMain.handle('db:fetchAll', async (_, query: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      if (!isDatabaseInitialized || !db) {
        reject(new Error('Database fetch all failed: Database not initialized'));
        return;
      }

      try {
        db.all(query, params, (err, rows) => {
          if (err) {
            reject(new Error(`Database fetch all failed: ${err.message}`));
            return;
          }
          resolve({ success: true, result: rows });
        });
      } catch (error) {
        reject(new Error(`Database fetch all failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });

  ipcMain.handle('db:executeMany', async (_, query: string, values: any[] = []) => {
    return new Promise((resolve, reject) => {
      if (!isDatabaseInitialized || !db) {
        reject(new Error('Database execute many failed: Database not initialized'));
        return;
      }

      try {
        const stmt = db.prepare(query);
        const executeMany = () => {
          if (values.length === 0) {
            resolve({ success: true, result: [] });
            return;
          }

          stmt.run(values.shift(), (err) => {
            if (err) {
              reject(new Error(`Database execute many failed: ${err.message}`));
              return;
            }

            if (values.length > 0) {
              executeMany();
            } else {
              stmt.finalize();
              resolve({ success: true, result: true });
            }
          });
        };
        executeMany();
      } catch (error) {
        reject(new Error(`Database execute many failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });

  ipcMain.handle('db:executeScript', async (_, script: string) => {
    return new Promise((resolve, reject) => {
      if (!isDatabaseInitialized || !db) {
        reject(new Error('Database execute script failed: Database not initialized'));
        return;
      }

      try {
        db.exec(script, (err) => {
          if (err) {
            reject(new Error(`Database execute script failed: ${err.message}`));
            return;
          }
          resolve({ success: true, result: true });
        });
      } catch (error) {
        reject(new Error(`Database execute script failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  });

  // Dev tools handler (development only)
  ipcMain.handle('dev:openDevTools', () => {
    if (mainWindow && process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });
}