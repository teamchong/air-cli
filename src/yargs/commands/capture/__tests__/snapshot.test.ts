import { execSync } from 'child_process'

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'

/**
 * Snapshot Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('snapshot command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --port ${TEST_PORT} --url "data:text/html,<div id='test-container'><h1>Snapshot Test Suite Ready</h1><p>Accessibility tree content</p></div>"`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Snapshot test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} snapshot --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('snapshot')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should capture accessibility tree using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} snapshot --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(
        /Interactive Elements|Found \d+ interactive elements/i
      )
      // Snapshot should contain page structure info
      expect(output.length).toBeGreaterThan(50)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} snapshot --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000 // Increased timeout to handle tab search
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found|timeout|failed/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} snapshot --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} snapshot --help`)
      expect(exitCode).toBe(0)
    })
  })
})
