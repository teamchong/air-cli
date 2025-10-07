/**
 * App Command - Generic macOS Application Automation
 *
 * Provides access to any native macOS application using JXA.
 * Supports launching apps, getting UI trees, and executing custom JXA scripts.
 */

import { run } from '@jxa/run'
import type { ArgumentsCamelCase } from 'yargs'

import { macOSAutomation } from '../../../lib/macos-automation'
import { createCommand } from '../../lib/command-builder'
import type { BaseCommandOptions } from '../../types'

interface AppCommandOptions extends BaseCommandOptions {
  name: string
  action?: string
  script?: string
  launch?: boolean
  quit?: boolean
  tree?: boolean
}

export const appCommand = createCommand<AppCommandOptions>({
  metadata: {
    name: 'app',
    category: 'native',
    description: 'Interact with native macOS applications',
    aliases: [],
  },
  command: 'app <name>',
  describe: 'Interact with native macOS applications',
  requiresBrowser: false,

  builder: yargs =>
    yargs
      .positional('name', {
        type: 'string',
        describe: 'Application name (e.g., Mail, Calendar, Finder, Safari)',
        demandOption: true,
      })
      .option('action', {
        type: 'string',
        describe:
          'Pre-defined action (mail-inbox, mail-unread, calendar-today, calendar-all)',
      })
      .option('script', {
        type: 'string',
        describe: 'Custom JXA script to execute',
      })
      .option('launch', {
        type: 'boolean',
        describe: 'Launch the application if not running',
      })
      .option('quit', {
        type: 'boolean',
        describe: 'Quit the application',
      })
      .option('tree', {
        type: 'boolean',
        describe: 'Get UI element tree (for automation)',
      })
      .example(
        '$0 app Mail --action mail-unread',
        'Get unread emails from Mail.app'
      )
      .example('$0 app Calendar --action calendar-today', "Get today's events")
      .example('$0 app Finder --tree', 'Get Finder UI tree')
      .example('$0 app Safari --launch', 'Launch Safari if not running')
      .example(
        '$0 app Mail --script "Application(\'Mail\').inbox.messages().length"',
        'Custom JXA'
      ),

  handler: async context => {
    const { argv, logger } = context

    try {
      // Check if running on macOS
      if (process.platform !== 'darwin') {
        throw new Error('App command only works on macOS')
      }

      const appName = argv.name

      // Handle launch
      if (argv.launch) {
        await macOSAutomation.launchApp(appName)
        logger.success(`Launched ${appName}`)
        return
      }

      // Handle quit
      if (argv.quit) {
        await macOSAutomation.quitApp(appName)
        logger.success(`Quit ${appName}`)
        return
      }

      // Handle UI tree
      if (argv.tree) {
        const isRunning = await macOSAutomation.isAppRunning(appName)
        if (!isRunning) {
          throw new Error(
            `${appName} is not running. Use --launch to start it.`
          )
        }

        const tree = await macOSAutomation.getUITree(appName)
        logger.json(tree)
        return
      }

      // Handle custom script
      if (argv.script) {
        const result = await run((scriptCode: string) => {
          return eval(scriptCode)
        }, argv.script)

        if (argv.json) {
          logger.json(result)
        } else {
          logger.info(JSON.stringify(result, null, 2))
        }
        return
      }

      // Handle pre-defined actions
      if (argv.action) {
        await handleAction(argv.action, appName, argv.json ?? false, logger)
        return
      }

      // Default: check if app is running
      const isRunning = await macOSAutomation.isAppRunning(appName)
      logger.info(`${appName} is ${isRunning ? 'running' : 'not running'}`)
    } catch (error: any) {
      logger.error(error.message)
      throw error
    }
  },
})

/**
 * Handle pre-defined actions for common apps
 */
async function handleAction(
  action: string,
  appName: string,
  jsonOutput: boolean,
  logger: any
): Promise<void> {
  switch (action) {
    case 'mail-inbox':
    case 'mail-all': {
      const messages = await macOSAutomation.getAllMailMessages()
      if (jsonOutput) {
        logger.json(messages)
      } else {
        logger.info(`Found ${messages.length} message(s) in inbox`)
        messages.slice(0, 10).forEach((msg, i) => {
          const status = msg.read ? '📖' : '📩'
          logger.info(`${status} [${i + 1}] ${msg.subject} (from: ${msg.from})`)
        })
        if (messages.length > 10) {
          logger.info(`... and ${messages.length - 10} more`)
        }
      }
      break
    }

    case 'mail-unread': {
      const messages = await macOSAutomation.getMailInbox()
      if (jsonOutput) {
        logger.json(messages)
      } else {
        logger.info(`Found ${messages.length} unread message(s)`)
        messages.forEach((msg, i) => {
          logger.info(`📩 [${i + 1}] ${msg.subject} (from: ${msg.from})`)
        })
      }
      break
    }

    case 'calendar-today': {
      const events = await macOSAutomation.getTodayCalendarEvents()
      if (jsonOutput) {
        logger.json(events)
      } else {
        logger.info(`Found ${events.length} event(s) today`)
        events.forEach((evt, i) => {
          const start = new Date(evt.startDate).toLocaleTimeString()
          logger.info(`📅 [${i + 1}] ${evt.title} at ${start}`)
        })
      }
      break
    }

    case 'calendar-all': {
      const events = await macOSAutomation.getAllCalendarEvents()
      if (jsonOutput) {
        logger.json(events)
      } else {
        logger.info(`Found ${events.length} event(s) total`)
        events.slice(0, 10).forEach((evt, i) => {
          const start = new Date(evt.startDate).toLocaleDateString()
          logger.info(`📅 [${i + 1}] ${evt.title} on ${start}`)
        })
        if (events.length > 10) {
          logger.info(`... and ${events.length - 10} more`)
        }
      }
      break
    }

    default:
      throw new Error(
        `Unknown action: ${action}. Available: mail-inbox, mail-unread, calendar-today, calendar-all`
      )
  }
}
