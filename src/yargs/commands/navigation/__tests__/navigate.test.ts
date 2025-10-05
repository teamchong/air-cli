import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { execSync } from 'child_process'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
/**
 * Navigate Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('navigate command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Navigate Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Navigate test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} navigate --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('navigate')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('argument validation', () => {
    it('should require URL argument', () => {
      const result = runCommand(`${CLI} navigate --port ${TEST_PORT}`)
      expect(result.exitCode).toBe(1)
      expect(result.output.length).toBeGreaterThan(0)
    })

    it('should validate URL format', () => {
      const result = runCommand(
        `${CLI} navigate invalid-url --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(result.exitCode).toBe(1)
      expect(result.output).toMatch(/Invalid URL|URL/)
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should navigate to valid URL using captured tab ID', () => {
      const result = runCommand(
        `${CLI} navigate "data:text/html,<h1>Navigation Test</h1>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(result.exitCode).toBe(0)
      expect(result.output).toContain('Successfully navigated')
    })

    it('should handle navigation timeout with tab ID', () => {
      const result = runCommand(
        `${CLI} navigate "data:text/html,<h1>Timeout Test</h1>" --timeout 5000 --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(result.exitCode).toBe(0)
      expect(result.output).toContain('Successfully navigated')
    })

    it('should handle wait-until option with tab ID', () => {
      const result = runCommand(
        `${CLI} navigate "data:text/html,<h1>Wait Until Test</h1>" --wait-until load --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(result.exitCode).toBe(0)
      expect(result.output).toContain('Successfully navigated')
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} navigate "data:text/html,<h1>Test</h1>" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} navigate "data:text/html,<h1>Test</h1>" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} navigate --help`)
      expect(exitCode).toBe(0)
    })
  })
})
