/**
 * Config Manager - Handle air-cli configuration
 *
 * Manages user configuration stored in ~/.config/air-cli/config.yml
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface AirConfig {
  // Browser settings
  browser?: {
    type?: 'chromium' | 'webkit' | 'firefox';
    port?: number;
    headless?: boolean;
    viewport?: {
      width?: number;
      height?: number;
    };
    executablePath?: string;
  };

  // Session settings
  session?: {
    defaultTimeout?: number;
    autoSave?: boolean;
    directory?: string;
  };

  // Protocol settings
  protocol?: {
    enabled?: boolean;
    allowedCommands?: string[];
    openInTerminal?: boolean;
  };

  // Output settings
  output?: {
    json?: boolean;
    verbose?: boolean;
    color?: boolean;
  };

  // Bookmarks/shortcuts
  bookmarks?: Record<string, string>;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private configPath: string;
  private configDir: string;
  private config: AirConfig;

  private constructor() {
    // Config directory: ~/.config/air-cli/
    this.configDir = join(homedir(), '.config', 'air-cli');
    this.configPath = join(this.configDir, 'config.yml');

    // Load or create config
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): AirConfig {
    // Create config directory if it doesn't exist
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }

    // Create default config if it doesn't exist
    if (!existsSync(this.configPath)) {
      const defaultConfig = this.getDefaultConfig();
      this.saveConfig(defaultConfig);
      return defaultConfig;
    }

    // Read and parse config file
    try {
      const content = readFileSync(this.configPath, 'utf-8');
      return this.parseYaml(content);
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AirConfig {
    return {
      browser: {
        type: 'chromium',
        port: 9222,
        headless: false,
        viewport: {
          width: 1920,
          height: 1080
        }
      },
      session: {
        defaultTimeout: 30000,
        autoSave: false,
        directory: join(homedir(), '.config', 'air-cli', 'sessions')
      },
      protocol: {
        enabled: true,
        allowedCommands: ['open', 'screenshot', 'console', 'snapshot', 'tabs'],
        openInTerminal: true
      },
      output: {
        json: false,
        verbose: false,
        color: true
      },
      bookmarks: {}
    };
  }

  /**
   * Save configuration to file
   */
  private saveConfig(config: AirConfig): void {
    try {
      const yaml = this.toYaml(config);
      writeFileSync(this.configPath, yaml, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  /**
   * Parse YAML content (simple parser for our use case)
   */
  private parseYaml(content: string): AirConfig {
    // Simple YAML parser - good enough for our config format
    // For production, consider using a proper YAML library
    const config: AirConfig = {};
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentSubsection: string | null = null;

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        continue;
      }

      // Detect sections (no indentation)
      if (!line.startsWith(' ') && line.includes(':')) {
        const [key] = line.split(':');
        currentSection = key.trim();
        currentSubsection = null;
        if (!config[currentSection as keyof AirConfig]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config as any)[currentSection] = {};
        }
        continue;
      }

      // Detect subsections (2 spaces indentation)
      if (
        line.startsWith('  ') &&
        !line.startsWith('    ') &&
        line.includes(':')
      ) {
        const [key, value] = line.trim().split(':');
        currentSubsection = key.trim();

        if (currentSection && value && value.trim()) {
          // Direct value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config as any)[currentSection][currentSubsection] = this.parseValue(
            value.trim()
          );
        } else if (currentSection) {
          // Object value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config as any)[currentSection][currentSubsection] = {};
        }
        continue;
      }

      // Parse values (4 spaces indentation)
      if (line.startsWith('    ') && line.includes(':')) {
        const [key, value] = line.trim().split(':');
        if (currentSection && currentSubsection && value) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (config as any)[currentSection][currentSubsection][key.trim()] =
            this.parseValue(value.trim());
        }
      }
    }

    return config;
  }

  /**
   * Parse YAML value to appropriate type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseValue(value: string): any {
    // Remove quotes
    value = value.replace(/^["']|["']$/g, '');

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number
    if (!isNaN(Number(value))) return Number(value);

    // String
    return value;
  }

  /**
   * Convert config to YAML (simple serializer)
   */
  private toYaml(config: AirConfig, indent = 0): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);

    for (const [key, value] of Object.entries(config)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        yaml += `${spaces}${key}:\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          if (
            typeof subValue === 'object' &&
            subValue !== null &&
            !Array.isArray(subValue)
          ) {
            yaml += `${spaces}  ${subKey}:\n`;
            for (const [subSubKey, subSubValue] of Object.entries(subValue)) {
              yaml += `${spaces}    ${subSubKey}: ${subSubValue}\n`;
            }
          } else {
            yaml += `${spaces}  ${subKey}: ${subValue}\n`;
          }
        }
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          yaml += `${spaces}  - ${item}\n`;
        }
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * Get current configuration
   */
  get(): AirConfig {
    return { ...this.config };
  }

  /**
   * Get specific config value
   */
  getValue<K extends keyof AirConfig>(key: K): AirConfig[K] {
    return this.config[key];
  }

  /**
   * Set config value
   */
  setValue<K extends keyof AirConfig>(key: K, value: AirConfig[K]): void {
    this.config[key] = value;
    this.saveConfig(this.config);
  }

  /**
   * Update nested config value
   */
  update(updates: Partial<AirConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    this.saveConfig(this.config);
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig(this.config);
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Add bookmark
   */
  addBookmark(name: string, url: string): void {
    if (!this.config.bookmarks) {
      this.config.bookmarks = {};
    }
    this.config.bookmarks[name] = url;
    this.saveConfig(this.config);
  }

  /**
   * Remove bookmark
   */
  removeBookmark(name: string): void {
    if (this.config.bookmarks) {
      delete this.config.bookmarks[name];
      this.saveConfig(this.config);
    }
  }

  /**
   * Get bookmark URL
   */
  getBookmark(name: string): string | undefined {
    return this.config.bookmarks?.[name];
  }

  /**
   * List all bookmarks
   */
  listBookmarks(): Record<string, string> {
    return { ...this.config.bookmarks };
  }
}
