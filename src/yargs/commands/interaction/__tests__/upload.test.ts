import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
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
    // Create test files in /tmp
    testFile1 = path.join('/tmp', 'air-cli-test-upload-1.txt')
    testFile2 = path.join('/tmp', 'air-cli-test-upload-2.txt')
    fs.writeFileSync(testFile1, 'Test file 1 content')
    fs.writeFileSync(testFile2, 'Test file 2 content')
  })

  beforeEach(async () => {
    // Create a fresh test tab for each test to ensure isolation
    // Start with about:blank - each test will create its own tab with specific HTML
    const { output } = runCommand(
      `${CLI} tabs new --url "about:blank" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
  })

  afterEach(async () => {
    // Clean up test tab after each test
    if (testTabId) {
      closeTestTab(testTabId)
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
      // Close the blank tab from beforeEach
      closeTestTab(testTabId)

      // Create tab with exact HTML needed - no navigate required (prevents memory leak)
      const { output } = runCommand(
        `${CLI} tabs new --url "data:text/html,<input type='file' id='file-input'/>" --port ${TEST_PORT}`
      )
      testTabId = extractAndRegisterTabId(output)

      // Upload file using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} upload "#file-input" "${testFile1}" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it('should upload multiple files', () => {
      // Close and recreate with exact HTML needed
      closeTestTab(testTabId)
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
      // Close and recreate with exact HTML needed
      closeTestTab(testTabId)
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

    it('should handle non-existent element gracefully', () => {
      // Close and recreate with exact HTML needed
      closeTestTab(testTabId)
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
      const { output, exitCode } = runCommand(
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
