/**
 * Command: air mesh list
 *
 * List connected nodes and available services
 */

import { AirMesh } from '../../../mesh/air-mesh'
import { createCommand } from '../../lib/command-builder'
import type { BaseCommandOptions } from '../../types'

interface ListMeshOptions extends BaseCommandOptions {
  node: string
  services?: boolean
  nodes?: boolean
}

export const listMeshCommand = createCommand<ListMeshOptions>({
  metadata: {
    name: 'list',
    category: 'mesh',
    description: 'List nodes and services in the mesh',
    aliases: [],
  },
  command: 'list',
  describe: 'List nodes and services in the mesh',
  requiresBrowser: false,
  builder: yargs =>
    yargs
      .option('node', {
        type: 'string',
        describe: 'Local node name',
        demandOption: true,
      })
      .option('services', {
        type: 'boolean',
        describe: 'List services on this node',
        default: false,
      })
      .option('nodes', {
        type: 'boolean',
        describe: 'List connected nodes',
        default: false,
      })
      .example('$0 mesh list --node my-node', 'List everything')
      .example('$0 mesh list --node my-node --services', 'List local services')
      .example('$0 mesh list --node my-node --nodes', 'List connected nodes'),
  handler: async context => {
    const { node: nodeName, services, nodes, json } = context.argv

    const node = new AirMesh(nodeName)

    const output: any = {}

    // List local services
    if (services || (!services && !nodes)) {
      const serviceList = node.listServices()
      output.services = serviceList

      if (!json) {
        console.log(`📋 Local services on ${nodeName}:`)
        if (serviceList.length === 0) {
          console.log('   (none)')
        } else {
          serviceList.forEach(s => console.log(`   - ${s}`))
        }
      }
    }

    // List connected nodes
    if (nodes || (!services && !nodes)) {
      const nodeList = node.listNodes()
      output.nodes = nodeList

      if (!json) {
        console.log('\n🌐 Connected nodes:')
        if (nodeList.length === 0) {
          console.log('   (none)')
        } else {
          nodeList.forEach(n => {
            console.log(`   - ${n.name} (${n.host}:${n.port}) [${n.protocol}]`)
            if (n.services.length > 0) {
              console.log(`     Services: ${n.services.join(', ')}`)
            }
          })
        }
      }
    }

    if (json) {
      console.log(JSON.stringify(output, null, 2))
    }
  },
})
