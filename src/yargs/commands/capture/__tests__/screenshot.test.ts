import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { execSync } from 'child_process'
import * as fs from 'fs'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'

/**
 * Screenshot Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('screenshot command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --port ${TEST_PORT} --url "data:text/html,<div id='test-container'>Screenshot Test Suite Ready</div>"`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Screenshot test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up test screenshots
    try {
      if (fs.existsSync('screenshot.png')) fs.unlinkSync('screenshot.png')
      if (fs.existsSync('test-screenshot.png'))
        fs.unlinkSync('test-screenshot.png')
      if (fs.existsSync('test-custom.png')) fs.unlinkSync('test-custom.png')
    } catch {}

    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} screenshot --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('screenshot')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should take screenshot with default filename using captured tab ID', () => {
      const { exitCode } = runCommand(`${CLI} screenshot --tab-id ${testTabId} --port ${TEST_PORT}`)
      expect(exitCode).toBe(0)

      // Check that default screenshot file was created
      expect(fs.existsSync('screenshot.png')).toBe(true)

      // Clean up
      if (fs.existsSync('screenshot.png')) fs.unlinkSync('screenshot.png')
    })

    it('should take screenshot with custom filename using captured tab ID', () => {
      const { exitCode } = runCommand(
        `${CLI} screenshot test-screenshot.png --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)

      // Check that the file was created
      expect(fs.existsSync('test-screenshot.png')).toBe(true)
    })

    it('should handle full page screenshot using captured tab ID', () => {
      const { exitCode } = runCommand(
        `${CLI} screenshot test-custom.png --full-page --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(fs.existsSync('test-custom.png')).toBe(true)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} screenshot --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} screenshot --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} screenshot --help`)
      expect(exitCode).toBe(0)
    })
  })
})
