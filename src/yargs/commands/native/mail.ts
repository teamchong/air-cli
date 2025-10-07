/**
 * Mail Command - Access Mail.app inbox
 *
 * Retrieves messages from macOS Mail.app inbox using JXA.
 * Supports filtering by read status and outputting as JSON.
 */

import type { ArgumentsCamelCase } from 'yargs';

import { macOSAutomation } from '../../../lib/macos-automation';
import { createCommand } from '../../lib/command-builder';
import type { BaseCommandOptions } from '../../types';

interface MailCommandOptions extends BaseCommandOptions {
  unread?: boolean
  all?: boolean
  limit?: number
}

export const mailCommand = createCommand<MailCommandOptions>({
  metadata: {
    name: 'mail',
    category: 'native',
    description: 'Access Mail.app inbox messages',
    aliases: []
  },
  command: 'mail',
  describe: 'Access Mail.app inbox messages',
  requiresBrowser: false,

  builder: yargs =>
    yargs
      .option('unread', {
        type: 'boolean',
        describe: 'Only show unread messages',
        default: true
      })
      .option('all', {
        type: 'boolean',
        describe: 'Show all messages (read and unread)',
        default: false
      })
      .option('limit', {
        type: 'number',
        describe: 'Limit number of messages returned'
      })
      .example('$0 mail', 'Get unread messages from Mail.app')
      .example('$0 mail --all', 'Get all messages from inbox')
      .example('$0 mail --limit 10', 'Get first 10 unread messages')
      .example('$0 mail --json', 'Output messages as JSON'),

  handler: async context => {
    const { argv, logger } = context;

    try {
      // Check if running on macOS
      if (process.platform !== 'darwin') {
        throw new Error('Mail command only works on macOS');
      }

      // Get messages based on options
      let messages = argv.all
        ? await macOSAutomation.getAllMailMessages()
        : await macOSAutomation.getMailInbox();

      // Apply limit if specified
      if (argv.limit && argv.limit > 0) {
        messages = messages.slice(0, argv.limit);
      }

      // Output as JSON or formatted
      if (argv.json) {
        logger.json(messages);
      } else {
        if (messages.length === 0) {
          logger.info('No messages found');
          return;
        }

        logger.info(`Found ${messages.length} message(s):\n`);

        messages.forEach((msg, index) => {
          const status = msg.read ? '📖' : '📩';
          const date = new Date(msg.date).toLocaleString();

          logger.info(`${status} [${index + 1}] ${msg.subject}`);
          logger.info(`   From: ${msg.from}`);
          logger.info(`   Date: ${date}`);

          if (argv.verbose && msg.content) {
            const preview =
              msg.content.length > 100
                ? msg.content.substring(0, 100) + '...'
                : msg.content;
            logger.info(`   Preview: ${preview}`);
          }

          logger.info(''); // Blank line
        });

        logger.info(`Total: ${messages.length} message(s)`);
      }
    } catch (error: any) {
      if (error.message.includes("Application isn't running")) {
        logger.error('Mail.app is not running. Please open Mail.app first.');
      } else {
        logger.error(error.message);
      }
      throw error;
    }
  }
});
