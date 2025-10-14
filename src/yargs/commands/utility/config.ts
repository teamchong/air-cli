/**
 * Config Command - Manage air-cli configuration
 *
 * Allows users to view, edit, and manage configuration settings.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

import { ConfigManager } from '../../../lib/config-manager';
import { createCommand } from '../../lib/command-builder';

interface ConfigOptions {
  action?: string;
  key?: string;
  value?: string;
  port: number;
  verbose?: boolean;
  json?: boolean;
}

export const configCommand = createCommand<ConfigOptions>({
  metadata: {
    name: 'config',
    category: 'utility',
    description: 'Manage configuration settings',
    aliases: []
  },

  command: 'config [action] [key] [value]',
  describe: 'Manage configuration settings',

  builder: yargs => {
    return yargs
      .positional('action', {
        describe: 'Action to perform',
        type: 'string',
        choices: ['get', 'set', 'list', 'edit', 'reset', 'path'],
        default: 'list'
      })
      .positional('key', {
        describe: 'Configuration key (for get/set)',
        type: 'string'
      })
      .positional('value', {
        describe: 'Configuration value (for set)',
        type: 'string'
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .example('$0 config list', 'List all configuration settings')
      .example('$0 config get browser.port', 'Get specific setting')
      .example('$0 config set browser.port 9223', 'Set specific setting')
      .example('$0 config edit', 'Open config file in editor')
      .example('$0 config reset', 'Reset to default configuration')
      .example('$0 config path', 'Show config file path');
  },

  handler: async ({ argv, logger }) => {
    try {
      const configManager = ConfigManager.getInstance();
      const { action, key, value } = argv;

      switch (action) {
        case 'list': {
          const config = configManager.get();

          if (argv.json) {
            logger.json({
              success: true,
              config
            });
          } else {
            logger.info('Current configuration:');
            logger.info('');
            logger.info(JSON.stringify(config, null, 2));
            logger.info('');
            logger.info(`Config file: ${configManager.getConfigPath()}`);
          }
          break;
        }

        case 'get': {
          if (!key) {
            throw new Error('Key is required for get action');
          }

          const config = configManager.get();
          const keys = key.split('.');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let value: any = config;

          for (const k of keys) {
            value = value?.[k];
          }

          if (value === undefined) {
            throw new Error(`Config key not found: ${key}`);
          }

          if (argv.json) {
            logger.json({
              success: true,
              key,
              value
            });
          } else {
            logger.info(`${key}: ${JSON.stringify(value)}`);
          }
          break;
        }

        case 'set': {
          if (!key || !value) {
            throw new Error('Key and value are required for set action');
          }

          // Parse value
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsedValue: any = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (!isNaN(Number(value))) parsedValue = Number(value);

          // Update config
          const keys = key.split('.');
          const config = configManager.get();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let current: any = config;
          for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k]) {
              current[k] = {};
            }
            current = current[k];
          }

          current[keys[keys.length - 1]] = parsedValue;
          configManager.update(config);

          if (argv.json) {
            logger.json({
              success: true,
              key,
              value: parsedValue
            });
          } else {
            logger.success(`Set ${key} = ${parsedValue}`);
          }
          break;
        }

        case 'edit': {
          const configPath = configManager.getConfigPath();

          if (!existsSync(configPath)) {
            throw new Error(`Config file not found: ${configPath}`);
          }

          // Determine editor
          const editor =
            process.env.EDITOR ||
            process.env.VISUAL ||
            (process.platform === 'darwin' ? 'open' : 'nano');

          logger.info(`Opening config in ${editor}...`);
          logger.info(`Config path: ${configPath}`);

          // Open editor
          const child = spawn(editor, [configPath], {
            stdio: 'inherit'
          });

          await new Promise<void>((resolve, reject) => {
            child.on('close', code => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`Editor exited with code ${code}`));
              }
            });

            child.on('error', err => {
              reject(err);
            });
          });

          logger.success('Config file closed');
          break;
        }

        case 'reset': {
          configManager.reset();

          if (argv.json) {
            logger.json({
              success: true,
              message: 'Configuration reset to defaults'
            });
          } else {
            logger.success('Configuration reset to defaults');
          }
          break;
        }

        case 'path': {
          const configPath = configManager.getConfigPath();

          if (argv.json) {
            logger.json({
              success: true,
              path: configPath
            });
          } else {
            logger.info(`Config file: ${configPath}`);
          }
          break;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const err = error as Error;
      logger.error(`Config command failed: ${err.message}`);
      throw new Error('Command failed');
    }
  },

  supportsJson: true
});
