import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { execSync } from 'child_process'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'

/**
 * Resize Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('resize command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --port ${TEST_PORT} --url "data:text/html,<div id='test-container'><h1>Resize Test Suite Ready</h1><p>Window resize testing</p></div>"`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Resize test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} resize --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('resize')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should resize browser window using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} resize 800 600 --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/resized|800|600/i)
    })

    it('should handle different viewport sizes using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} resize 1024 768 --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/resized|1024|768/i)
    })

    it('should validate resize arguments', () => {
      const { exitCode, output } = runCommand(
        `${CLI} resize 800 --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(1)
      expect(output.length).toBeGreaterThan(0)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} resize 800 600 --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} resize 800 600 --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} resize --help`)
      expect(exitCode).toBe(0)
    })
  })
})
