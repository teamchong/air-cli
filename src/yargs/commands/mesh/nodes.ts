/**
 * List available nodes in the mesh
 */

import { CommandModule } from 'yargs'

interface NodesOptions {
  json?: boolean
}

export const nodesCommand: CommandModule<object, NodesOptions> = {
  command: 'nodes',
  describe: 'List available nodes in the mesh',

  builder: yargs => {
    return yargs
      .option('json', {
        type: 'boolean',
        describe: 'Output as JSON',
        default: false,
      })
      .example('$0 mesh nodes', 'List all nodes')
      .example('$0 mesh nodes --json', 'List nodes as JSON')
  },

  handler: async _argv => {
    console.error('❌ This command requires an active mesh node')
    console.error('💡 Start a node first: air mesh start --name my-node')
    process.exit(1)

    // TODO: Implement client-side node listing (need to connect to local node's API)
    // For now, this is a placeholder showing the desired interface
  },
}
