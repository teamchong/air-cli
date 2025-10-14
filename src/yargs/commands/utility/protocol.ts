/**
 * Protocol Command - Handle air:// and air+command:// URLs
 *
 * This command is invoked when the system opens an air:// URL
 * via the protocol handler registration.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

import { ProtocolHandler } from '../../../lib/protocol-handler';
import { createCommand } from '../../lib/command-builder';

interface ProtocolOptions {
  port: number;
  verbose?: boolean;
  json?: boolean;
}

export const protocolCommand = createCommand<ProtocolOptions>({
  metadata: {
    name: 'protocol',
    category: 'utility',
    description: 'Handle air:// protocol URLs',
    aliases: []
  },

  command: 'protocol <url>',
  describe: 'Handle air:// protocol URLs (internal use)',

  builder: yargs => {
    return yargs
      .positional('url', {
        describe: 'Protocol URL (air:// or air+command://)',
        type: 'string',
        demandOption: true
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .example(
        '$0 protocol "air://https://google.com"',
        'Open URL via protocol'
      )
      .example(
        '$0 protocol "air+screenshot://https://example.com"',
        'Open and screenshot'
      );
  },

  handler: async ({ argv, logger }) => {
    try {
      const protocolUrl = argv.url as string;

      // Parse protocol URL
      logger.info(`Parsing protocol URL: ${protocolUrl}`);
      const commands = ProtocolHandler.parse(protocolUrl);

      logger.info(`Executing ${commands.length} command(s)...`);

      // Execute commands sequentially
      for (const cmd of commands) {
        const fullCommand = [cmd.command, ...cmd.args];
        logger.info(`Running: air ${fullCommand.join(' ')}`);

        // Execute command by spawning new air process
        await new Promise<void>((resolve, reject) => {
          // Find air executable - check common locations
          let airPath = 'air'; // Default: use PATH

          // Try to find absolute path to avoid Bun internal paths
          if (process.env.HOME) {
            const localBin = `${process.env.HOME}/.local/bin/air`;
            if (existsSync(localBin)) {
              airPath = localBin;
            }
          }

          const child = spawn(airPath, fullCommand, {
            stdio: 'inherit', // Show output in console
            shell: true, // Use shell to resolve PATH
            env: {
              ...process.env,
              AIR_PROTOCOL_MODE: 'true' // Prevent infinite loops
            }
          });

          child.on('close', code => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Command failed with exit code ${code}`));
            }
          });

          child.on('error', err => {
            reject(err);
          });
        });
      }

      logger.success('Protocol URL executed successfully');

      if (argv.json) {
        logger.json({
          success: true,
          url: protocolUrl,
          commands: commands.map(cmd => ({
            command: cmd.command,
            args: cmd.args
          }))
        });
      }
    } catch (error) {
      const err = error as Error;
      logger.error(`Protocol handler failed: ${err.message}`);
      throw new Error('Command failed');
    }
  },

  supportsJson: true
});
