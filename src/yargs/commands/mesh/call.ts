/**
 * Command: air mesh call
 *
 * Call a service on a remote mesh node
 */

import { AirMesh } from '../../../mesh/air-mesh'
import { createCommand } from '../../lib/command-builder'
import type { BaseCommandOptions } from '../../types'

interface CallMeshOptions extends BaseCommandOptions {
  from: string
  to: string
  service: string
  params?: string
  timeout?: number
}

export const callMeshCommand = createCommand<CallMeshOptions>({
  metadata: {
    name: 'call',
    category: 'mesh',
    description: 'Call a service on a remote node',
    aliases: [],
  },
  command: 'call',
  describe: 'Call a service on a remote node',
  requiresBrowser: false,
  builder: yargs =>
    yargs
      .option('from', {
        type: 'string',
        describe: 'Local node name',
        demandOption: true,
      })
      .option('to', {
        type: 'string',
        describe: 'Remote node name',
        demandOption: true,
      })
      .option('service', {
        type: 'string',
        describe: 'Service name to call',
        demandOption: true,
      })
      .option('params', {
        type: 'string',
        describe: 'Parameters as JSON string',
      })
      .option('timeout', {
        type: 'number',
        describe: 'Timeout in milliseconds',
        default: 30000,
      })
      .example(
        '$0 mesh call --from my-node --to mail-node --service get-mail-inbox',
        'Call mail service'
      )
      .example(
        '$0 mesh call --from my-node --to mail-node --service get-mail-inbox --json',
        'Get JSON output'
      ),
  handler: async context => {
    const { from, to, service, params, json, timeout } = context.argv

    if (!json) {
      console.log(`📞 Calling ${service} on ${to}...`)
    }

    // Parse params if provided
    let parsedParams: any = undefined
    if (params) {
      try {
        parsedParams = JSON.parse(params)
      } catch (error) {
        console.error(`❌ Invalid JSON params: ${params}`)
        process.exit(1)
      }
    }

    // Note: This assumes local node is already running
    const node = new AirMesh(from)

    try {
      const result = await node.call(to, service, parsedParams, { timeout })

      if (json) {
        console.log(JSON.stringify({ success: true, data: result }, null, 2))
      } else {
        console.log('\n✅ Result:')
        console.log(JSON.stringify(result, null, 2))
      }
    } catch (error: any) {
      if (json) {
        console.log(
          JSON.stringify({ success: false, error: error.message }, null, 2)
        )
      } else {
        console.error(`❌ Call failed: ${error.message}`)
      }
      process.exit(1)
    }
  },
})
