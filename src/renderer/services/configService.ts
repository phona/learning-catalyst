import type {
  AppConfig,
  ProviderConfig,
  ValidationResult,
  ValidationError,
} from '@/types/config';

/**
 * Configuration management service
 * Converted from Python configuration management
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;
  private configLoadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load configuration from Electron store
   */
  async loadConfig(): Promise<AppConfig> {
    // If already loading, return the existing promise
    if (this.configLoadPromise) {
      await this.configLoadPromise;
      return this.config!;
    }

    this.configLoadPromise = this.doLoadConfig();
    await this.configLoadPromise;
    return this.config!;
  }

  private async doLoadConfig(): Promise<void> {
    try {
      const storedConfig = await window.electronAPI.getConfig();

      if (storedConfig) {
        this.config = this.migrateConfig(storedConfig);
      } else {
        this.config = this.getDefaultConfig();
      }

      // Validate loaded config
      const validation = this.validateConfig(this.config);
      if (!validation.valid) {
        console.warn('Configuration validation failed:', validation.errors);
        // Use default config for invalid fields
        this.config = { ...this.getDefaultConfig(), ...this.config };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to Electron store
   */
  async saveConfig(config: Partial<AppConfig>): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    const updatedConfig = { ...this.config!, ...config };

    // Validate before saving
    const validation = this.validateConfig(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    try {
      await window.electronAPI.setConfig(updatedConfig);
      this.config = updatedConfig;
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AppConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Get configuration value by key
   */
  async getConfigValue(key: string): Promise<any> {
    const config = await this.getConfig();
    return this.getNestedValue(config, key);
  }

  /**
   * Set configuration value by key
   */
  async setConfigValue(key: string, value: any): Promise<void> {
    const config = await this.getConfig();
    const updatedConfig = this.setNestedValue(config, key, value);
    await this.saveConfig(updatedConfig);
  }

  /**
   * Get provider configuration
   */
  async getProviderConfig(providerName: string): Promise<ProviderConfig | undefined> {
    const config = await this.getConfig();
    return config.ai.providers[providerName];
  }

  /**
   * Set provider configuration
   */
  async setProviderConfig(providerName: string, providerConfig: ProviderConfig): Promise<void> {
    const config = await this.getConfig();
    const updatedConfig = {
      ...config,
      ai: {
        ...config.ai,
        providers: {
          ...config.ai.providers,
          [providerName]: providerConfig,
        },
      },
    };
    await this.saveConfig(updatedConfig);
  }

  /**
   * Remove provider configuration
   */
  async removeProviderConfig(providerName: string): Promise<void> {
    const config = await this.getConfig();
    const { [providerName]: removed, ...remainingProviders } = config.ai.providers;

    const updatedConfig = {
      ...config,
      ai: {
        ...config.ai,
        providers: remainingProviders,
      },
    };
    await this.saveConfig(updatedConfig);
  }

  /**
   * Set default provider and model
   */
  async setDefaultProvider(providerName: string, modelName: string): Promise<void> {
    const config = await this.getConfig();
    const updatedConfig = {
      ...config,
      ai: {
        ...config.ai,
        default_provider: providerName,
        default_model: modelName,
      },
    };
    await this.saveConfig(updatedConfig);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AppConfig {
    return {
      ai: {
        default_provider: 'openai',
        default_model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 4096,
        providers: {},
        streaming: true,
        enable_thinking: true,
        context_window_size: 10,
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
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      errors.push({ field: 'root', message: 'Configuration must be an object', value: config });
      return { valid: false, errors };
    }

    // AI section validation
    if (!config.ai || typeof config.ai !== 'object') {
      errors.push({ field: 'ai', message: 'AI configuration is required', value: config.ai });
    } else {
      if (!config.ai.default_provider || typeof config.ai.default_provider !== 'string') {
        errors.push({ field: 'ai.default_provider', message: 'Default provider is required', value: config.ai.default_provider });
      }
      if (!config.ai.default_model || typeof config.ai.default_model !== 'string') {
        errors.push({ field: 'ai.default_model', message: 'Default model is required', value: config.ai.default_model });
      }
      if (typeof config.ai.temperature !== 'number' || config.ai.temperature < 0 || config.ai.temperature > 2) {
        errors.push({ field: 'ai.temperature', message: 'Temperature must be between 0 and 2', value: config.ai.temperature });
      }
    }

    // UI section validation
    if (config.ui && typeof config.ui === 'object') {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(config.ui.theme)) {
        errors.push({ field: 'ui.theme', message: `Theme must be one of: ${validThemes.join(', ')}`, value: config.ui.theme });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Migrate configuration to latest version
   */
  private migrateConfig(config: any): AppConfig {
    // TODO: Implement configuration migration logic
    // For now, assume config is already in correct format
    return config as AppConfig;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): any {
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
}

// Export singleton instance
export const configService = ConfigService.getInstance();