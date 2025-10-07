/**
 * Mesh networking commands
 */

import { CommandModule } from 'yargs';

import { connectMeshCommand } from './connect';
import { listMeshCommand } from './list';
import { startMeshCommand } from './start';

export const meshCommand: CommandModule = {
  command: 'mesh <command>',
  describe: 'Distributed mesh networking for AIR',

  builder: (yargs) => {
    return yargs
      .command(startMeshCommand)
      .command(connectMeshCommand)
      .command(listMeshCommand)
      .demandCommand(1, 'You must specify a mesh command')
      .example('$0 mesh start --name my-laptop', 'Start a mesh node')
      .example('$0 mesh list', 'List available nodes')
      .example('$0 mesh connect laptop-1', 'Connect to remote node');
  },

  handler: () => {
    // Parent command, subcommands handle execution
  }
};
