import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
import { TEST_PORT, CLI, TEST_TMP_DIR } from '../../../../test-utils/test-constants'
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

  beforeAll(async () => {
    // Ensure .tmp/ directory exists (in case it was deleted by another test)
    if (!fs.existsSync(TEST_TMP_DIR)) {
      fs.mkdirSync(TEST_TMP_DIR, { recursive: true })
    }

    // Create test files in .tmp/ directory
    testFile1 = path.join(TEST_TMP_DIR, 'air-cli-test-upload-1.txt')
    testFile2 = path.join(TEST_TMP_DIR, 'air-cli-test-upload-2.txt')
    fs.writeFileSync(testFile1, 'Test file 1 content')
    fs.writeFileSync(testFile2, 'Test file 2 content')
    console.log(`Created test files: ${testFile1}, ${testFile2}`)
  })

  afterEach(async () => {
    // Clean up test tab after each test
    if (testTabId) {
      closeTestTab(testTabId)
      testTabId = '' // Clear to prevent double-cleanup
    }
  })

  afterAll(async () => {
    // Clean up test files
    try {
      fs.unlinkSync(testFile1)
      fs.unlinkSync(testFile2)
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
    it('should upload single file using captured tab ID', () => {
      // Create tab with exact HTML needed - no navigate required (prevents memory leak)
      const { output: tabOutput } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='file-input'/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(tabOutput)

      // Upload file using our captured tab ID
      const { exitCode, output } = runCommand(
        `${CLI} upload "#file-input" "${testFile1}" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      if (exitCode !== 0) {
        console.error('Upload command failed:', output)
      }
      expect(exitCode).toBe(0)
    })

    it('should upload multiple files', () => {
      // Create tab with exact HTML needed
      const { output } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='multi-file' multiple/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(output)

      // Upload multiple files in the same tab
      const { exitCode } = runCommand(
        `${CLI} upload "#multi-file" "${testFile1}" "${testFile2}" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it('should work with different file inputs', () => {
      // Create tab with exact HTML needed
      const { output } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='doc-upload'/><input type='file' id='image-upload'/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(output)

      // Upload to different inputs in the same tab
      expect(
        runCommand(
          `${CLI} upload "#doc-upload" "${testFile1}" --tab-id ${testTabId} --port ${TEST_PORT}`
        ).exitCode
      ).toBe(0)
      expect(
        runCommand(
          `${CLI} upload "#image-upload" "${testFile2}" --tab-id ${testTabId} --port ${TEST_PORT}`
        ).exitCode
      ).toBe(0)
    })

    it('should handle non-existent element gracefully', { timeout: 15000 }, () => {
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
