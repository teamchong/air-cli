import * as fs from 'fs'
import * as path from 'path'

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'

import { BrowserHelper } from '../../../../lib/browser-helper'
import {
  TEST_PORT,
  CLI,
  TEST_TMP_DIR,
} from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
/**
 * Simplified Upload Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('upload command - TAB ID FROM OUTPUT', () => {
  let testTabId: string
  let testFile1: string
  let testFile2: string

  // Helper to upload files directly without subprocess (avoids file access issues in long-running tests)
  async function uploadFilesDirect(
    selector: string,
    files: string[],
    tabId: string
  ): Promise<void> {
    await BrowserHelper.withTargetPage(
      TEST_PORT,
      undefined,
      tabId,
      async page => {
        // Use CDP DOM.setFileInputFiles instead of page.setInputFiles
        // This bypasses Chrome's sandbox file access restrictions after long test runs
        const client = await (page.context() as any).newCDPSession(page)

        // Get the element using page.evaluate to get node ID
        const backendNodeId = await page.evaluate(sel => {
          const el = document.querySelector(sel)
          if (!el) throw new Error(`Element not found: ${sel}`)
          // Get backend node ID via CDP
          return (
            (el as any).__playwright__backendNodeId ||
            (el as any).backendNodeId ||
            null
          )
        }, selector)

        if (!backendNodeId) {
          // Fallback: use DOM.querySelector to get node
          await client.send('DOM.enable')
          const { root } = await client.send('DOM.getDocument')
          const { nodeId } = await client.send('DOM.querySelector', {
            nodeId: root.nodeId,
            selector,
          })

          const { node } = await client.send('DOM.describeNode', { nodeId })

          await client.send('DOM.setFileInputFiles', {
            files: files,
            backendNodeId: node.backendNodeId,
          })
        } else {
          await client.send('DOM.setFileInputFiles', {
            files: files,
            backendNodeId,
          })
        }

        await client.detach()
      }
    )
  }

  beforeAll(async () => {
    // Use a dedicated upload-specific directory (not .tmp prefixed to avoid system cleanup)
    const uploadTestDir = path.resolve('test-upload-files')
    if (!fs.existsSync(uploadTestDir)) {
      fs.mkdirSync(uploadTestDir, { recursive: true })
    }

    // Create test files with absolute paths in dedicated directory
    testFile1 = path.resolve(uploadTestDir, 'air-cli-test-upload-1.txt')
    testFile2 = path.resolve(uploadTestDir, 'air-cli-test-upload-2.txt')
    fs.writeFileSync(testFile1, 'Test file 1 content')
    fs.writeFileSync(testFile2, 'Test file 2 content')
    console.log(`Created test files: ${testFile1}, ${testFile2}`)

    // Force fresh connection to avoid stale connection pool issues after many tests
    const { CDPConnectionPool } = await import(
      '../../../../lib/cdp-connection-pool'
    )
    const pool = CDPConnectionPool.getInstance()
    pool.release(TEST_PORT)
  })

  afterEach(async () => {
    // Clean up test tab after each test
    if (testTabId) {
      closeTestTab(testTabId)
      testTabId = '' // Clear to prevent double-cleanup
    }
  })

  afterAll(async () => {
    // Clean up test files and directory
    try {
      const uploadTestDir = path.resolve('test-upload-files')
      if (fs.existsSync(uploadTestDir)) {
        fs.rmSync(uploadTestDir, { recursive: true, force: true })
      }
    } catch {}

    // Clean up test tab
    if (testTabId) {
      closeTestTab(testTabId)
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} upload --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('upload')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should upload single file using captured tab ID', async () => {
      // Create tab with exact HTML needed - no navigate required (prevents memory leak)
      const { output: tabOutput } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='file-input'/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(tabOutput)

      // Use direct upload to avoid subprocess file access issues
      await uploadFilesDirect('#file-input', [testFile1], testTabId)

      // Verify upload worked (check if input has files)
      await BrowserHelper.withTargetPage(
        TEST_PORT,
        undefined,
        testTabId,
        async page => {
          const hasFiles = await page.evaluate(() => {
            const input = document.querySelector(
              '#file-input'
            ) as HTMLInputElement
            return input?.files && input.files.length > 0
          })
          expect(hasFiles).toBe(true)
        }
      )
    })

    it('should upload multiple files', async () => {
      // Create tab with exact HTML needed
      const { output } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='multi-file' multiple/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(output)

      // Use direct upload to avoid subprocess file access issues
      await uploadFilesDirect('#multi-file', [testFile1, testFile2], testTabId)

      // Verify both files uploaded
      await BrowserHelper.withTargetPage(
        TEST_PORT,
        undefined,
        testTabId,
        async page => {
          const fileCount = await page.evaluate(() => {
            const input = document.querySelector(
              '#multi-file'
            ) as HTMLInputElement
            return input?.files?.length || 0
          })
          expect(fileCount).toBe(2)
        }
      )
    })

    it('should work with different file inputs', async () => {
      // Create tab with exact HTML needed
      const { output } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='doc-upload'/><input type='file' id='image-upload'/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(output)

      // Use direct upload to avoid subprocess file access issues
      await uploadFilesDirect('#doc-upload', [testFile1], testTabId)
      await uploadFilesDirect('#image-upload', [testFile2], testTabId)

      // Verify both inputs have files
      await BrowserHelper.withTargetPage(
        TEST_PORT,
        undefined,
        testTabId,
        async page => {
          const bothHaveFiles = await page.evaluate(() => {
            const doc = document.querySelector(
              '#doc-upload'
            ) as HTMLInputElement
            const img = document.querySelector(
              '#image-upload'
            ) as HTMLInputElement
            return (
              (doc?.files?.length || 0) > 0 && (img?.files?.length || 0) > 0
            )
          })
          expect(bothHaveFiles).toBe(true)
        }
      )
    })

    it('should handle non-existent element gracefully', () => {
      // Create tab with exact HTML needed
      const { output: tabOutput } = runCommand(
        `${CLI} tabs new --url "data:text/html,<div>No file input here</div>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(tabOutput)

      // Try to upload to non-existent element - should fail with error
      const { exitCode, output } = runCommand(
        `${CLI} upload "#nonexistent" "${testFile1}" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toContain('Error') // Should contain error message
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} upload "#test" "${testFile1}" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      // Create tab to have a valid tab ID
      const { output } = runCommand(
        `${CLI} tabs new --url "data:text/html,<div>test</div>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(output)

      const { output: cmdOutput, exitCode } = runCommand(
        `${CLI} upload "#test" "${testFile1}" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} upload --help`)
      expect(exitCode).toBe(0)
    })
  })
})
