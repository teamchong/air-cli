/**
 * Calendar Command - Access Calendar.app events
 *
 * Retrieves events from macOS Calendar.app using JXA.
 * Supports showing today's events or all events.
 */

import { macOSAutomation } from '../../../lib/macos-automation'
import { createCommand } from '../../lib/command-builder'
import type { BaseCommandOptions } from '../../types'

interface CalendarCommandOptions extends BaseCommandOptions {
  today?: boolean
  all?: boolean
  limit?: number
}

export const calendarCommand = createCommand<CalendarCommandOptions>({
  metadata: {
    name: 'calendar',
    category: 'native',
    description: 'Access Calendar.app events',
    aliases: [],
  },
  command: 'calendar',
  describe: 'Access Calendar.app events',
  requiresBrowser: false,

  builder: yargs =>
    yargs
      .option('today', {
        type: 'boolean',
        describe: "Only show today's events",
        default: true,
      })
      .option('all', {
        type: 'boolean',
        describe: 'Show all events',
        default: false,
      })
      .option('limit', {
        type: 'number',
        describe: 'Limit number of events returned',
      })
      .example('$0 calendar', "Get today's events from Calendar.app")
      .example('$0 calendar --all', 'Get all events')
      .example('$0 calendar --limit 5', 'Get first 5 events')
      .example('$0 calendar --json', 'Output events as JSON'),

  handler: async context => {
    const { argv, logger } = context

    try {
      // Check if running on macOS
      if (process.platform !== 'darwin') {
        throw new Error('Calendar command only works on macOS')
      }

      // Get events based on options
      let events = argv.all
        ? await macOSAutomation.getAllCalendarEvents()
        : await macOSAutomation.getTodayCalendarEvents()

      // Apply limit if specified
      if (argv.limit && argv.limit > 0) {
        events = events.slice(0, argv.limit)
      }

      // Output as JSON or formatted
      if (argv.json) {
        logger.json(events)
      } else {
        if (events.length === 0) {
          logger.info(argv.all ? 'No events found' : 'No events today')
          return
        }

        logger.info(`Found ${events.length} event(s):\n`)

        events.forEach((evt, index) => {
          const start = new Date(evt.startDate).toLocaleString()
          const end = new Date(evt.endDate).toLocaleString()

          logger.info(`📅 [${index + 1}] ${evt.title}`)
          logger.info(`   Start: ${start}`)
          logger.info(`   End:   ${end}`)

          if (evt.location) {
            logger.info(`   Location: ${evt.location}`)
          }

          if (argv.verbose && evt.notes) {
            const preview =
              evt.notes.length > 100
                ? evt.notes.substring(0, 100) + '...'
                : evt.notes
            logger.info(`   Notes: ${preview}`)
          }

          logger.info('') // Blank line
        })

        logger.info(`Total: ${events.length} event(s)`)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.message.includes("Application isn't running")) {
        logger.error(
          'Calendar.app is not running. Please open Calendar.app first.'
        )
      } else {
        logger.error(error.message)
      }
      throw error
    }
  },
})
