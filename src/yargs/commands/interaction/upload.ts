/**
 * Upload Command - Yargs Implementation
 *
 * Uploads files to file input elements using Playwright's page.setInputFiles() method.
 * Supports uploading single or multiple files.
 */

import * as path from 'path'

import { BrowserHelper } from '../../../lib/browser-helper'
import { createCommand } from '../../lib/command-builder'
import type { UploadOptions } from '../../types'

export const uploadCommand = createCommand<UploadOptions>({
  metadata: {
    name: 'upload',
    category: 'interaction',
    description: 'Upload file(s) to a file input',
    aliases: [],
  },

  command: 'upload <selector> <files...>',
  describe: 'Upload file(s) to a file input',

  builder: yargs => {
    return yargs
      .positional('selector', {
        describe: 'File input selector',
        type: 'string',
        demandOption: true,
      })
      .positional('files', {
        describe: 'File path(s) to upload',
        type: 'string',
        array: true,
        demandOption: true,
      })
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p',
      })
      .option('timeout', {
        describe: 'Timeout in milliseconds',
        type: 'number',
        default: 5000,
      })
      .option('tab-index', {
        describe: 'Target specific tab by index (0-based)',
        type: 'number',
        alias: 'tab',
      })
      .option('tab-id', {
        describe: 'Target specific tab by unique ID',
        type: 'string',
      })
      .conflicts('tab-index', 'tab-id')
  },

  handler: async ({ argv, logger, spinner }) => {
    const { selector, files, port, timeout } = argv
    const tabIndex = argv['tab-index'] as number | undefined
    const tabId = argv['tab-id'] as string | undefined

    if (spinner) {
      spinner.text = `Uploading ${files.length} file(s) to ${selector}...`
    }

    await BrowserHelper.withTargetPage(port, tabIndex, tabId, async page => {
      // Resolve absolute paths
      const absolutePaths = files.map((file: string) =>
        path.isAbsolute(file) ? file : path.resolve(process.cwd(), file)
      )

      // Verify files exist
      for (const filePath of absolutePaths) {
        const file = Bun.file(filePath)
        if (!(await file.exists())) {
          throw new Error(`File not found: ${filePath}`)
        }
      }

      // Use CDP DOM.setFileInputFiles for better compatibility with long-running browser sessions
      // This bypasses Chrome's sandbox file access restrictions
      try {
        const client = await (page.context() as any).newCDPSession(page)

        // Get the backend node ID using CDP
        await client.send('DOM.enable')
        const { root } = await client.send('DOM.getDocument')
        const { nodeId } = await client.send('DOM.querySelector', {
          nodeId: root.nodeId,
          selector,
        })

        if (!nodeId) {
          throw new Error(`Element not found: ${selector}`)
        }

        const { node } = await client.send('DOM.describeNode', { nodeId })

        // Set files using CDP (bypasses Chrome sandbox restrictions)
        await client.send('DOM.setFileInputFiles', {
          files: absolutePaths,
          backendNodeId: node.backendNodeId,
        })

        await client.detach()
      } catch (error: any) {
        if (
          error.code === 'ENOENT' ||
          error.message?.includes('File not found')
        ) {
          throw new Error(
            `File access error: ${error.message}\nNote: Ensure files exist and are accessible`
          )
        }
        throw error
      }
    })

    logger.success(`Uploaded ${files.length} file(s) to ${selector}`)
  },
})
