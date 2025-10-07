/**
 * Command: air mesh start
 *
 * Start a mesh node to enable distributed service sharing
 */

import { macOSAutomation } from '../../../lib/macos-automation'
import { AirMesh } from '../../../mesh/air-mesh'
import { createCommand } from '../../lib/command-builder'
import type { BaseCommandOptions } from '../../types'

interface StartMeshOptions extends BaseCommandOptions {
  name: string
  services?: string[]
  daemon?: boolean
}

export const startMeshCommand = createCommand<StartMeshOptions>({
  metadata: {
    name: 'start',
    category: 'mesh',
    description: 'Start a mesh node',
    aliases: [],
  },
  command: 'start',
  describe: 'Start a mesh node',
  requiresBrowser: false,
  builder: yargs =>
    yargs
      .option('name', {
        type: 'string',
        describe: 'Node name',
        demandOption: true,
      })
      .option('services', {
        type: 'array',
        describe: 'Services to register (mail, calendar, browser, etc.)',
      })
      .option('daemon', {
        type: 'boolean',
        describe: 'Run in background (daemon mode)',
        default: false,
      })
      .example('$0 mesh start --name my-node', 'Start mesh node')
      .example(
        '$0 mesh start --name mail-node --services mail calendar',
        'Start with services'
      ),
  handler: async context => {
    const { name, port, services, daemon } = context.argv

    console.log(`🌐 Starting mesh node: ${name}`)

    const node = new AirMesh(name)
    await node.start(port)

    // Register requested services
    if (services?.includes('mail')) {
      node.handle('get-mail-inbox', async () => {
        return await macOSAutomation.getMailInbox()
      })
      node.handle('get-all-mail', async () => {
        return await macOSAutomation.getAllMailMessages()
      })
      console.log('📧 Registered mail services')
    }

    if (services?.includes('calendar')) {
      node.handle('get-today-events', async () => {
        return await macOSAutomation.getTodayCalendarEvents()
      })
      node.handle('get-all-events', async () => {
        return await macOSAutomation.getAllCalendarEvents()
      })
      console.log('📅 Registered calendar services')
    }

    if (services?.includes('browser')) {
      // TODO: Register browser automation services
      console.log('🌐 Browser services not yet implemented')
    }

    console.log(`\n✅ Mesh node '${name}' is running`)
    console.log(`   Services: ${node.listServices().join(', ') || 'none'}`)
    console.log('\n💡 Connect from other nodes:')
    console.log(
      `   air mesh connect --node ${name} --host localhost --port ${port}`
    )
    console.log('\n💡 Call services:')
    console.log(`   air mesh call --node ${name} --service <service-name>`)

    if (daemon) {
      console.log('\n🔄 Running in daemon mode (press Ctrl+C to stop)')
      // Keep process alive
      await new Promise(() => {})
    } else {
      console.log('\n⌨️  Press Ctrl+C to stop')
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down...')
        await node.stop()
        process.exit(0)
      })
      // Keep process alive
      await new Promise(() => {})
    }
  },
})
