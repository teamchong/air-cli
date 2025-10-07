/**
 * Command: air mesh connect
 *
 * Connect to another mesh node
 */

import { AirMesh } from '../../../mesh/air-mesh';
import { createCommand } from '../../lib/command-builder';
import type { BaseCommandOptions } from '../../types';

interface ConnectMeshOptions extends BaseCommandOptions {
  localNode: string;
  remoteNode: string;
  host: string;
}

export const connectMeshCommand = createCommand<ConnectMeshOptions>({
  metadata: {
    name: 'connect',
    category: 'mesh',
    description: 'Connect to another mesh node',
    aliases: []
  },
  command: 'connect',
  describe: 'Connect to another mesh node',
  requiresBrowser: false,
  builder: yargs =>
    yargs
      .option('local-node', {
        type: 'string',
        describe: 'Local node name',
        demandOption: true
      })
      .option('remote-node', {
        type: 'string',
        describe: 'Remote node name to connect to',
        demandOption: true
      })
      .option('host', {
        type: 'string',
        describe: 'Remote host address',
        demandOption: true
      })
      .example(
        '$0 mesh connect --local-node my-node --remote-node mail-node --host localhost',
        'Connect to local node'
      )
      .example(
        '$0 mesh connect --local-node my-node --remote-node cloud-node --host 192.168.1.100',
        'Connect to remote node'
      ),
  handler: async context => {
    const { localNode, remoteNode, host, port } = context.argv;

    console.log(`🔗 Connecting ${localNode} → ${remoteNode}...`);

    // Note: This assumes local node is already running
    // In a real implementation, we'd need to manage node instances
    const node = new AirMesh(localNode);

    try {
      await node.connect(remoteNode, host, port);

      console.log(`✅ Connected to ${remoteNode}`);
      console.log('\n💡 Call services:');
      console.log(
        `   air mesh call --from ${localNode} --to ${remoteNode} --service <name>`
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`❌ Connection failed: ${error.message}`);
      process.exit(1);
    }
  }
});
