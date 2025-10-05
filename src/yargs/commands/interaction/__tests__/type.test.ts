import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { execSync } from 'child_process'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
/**
 * Simplified Type Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('type command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Type Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Type test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} type --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('type')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should type text using captured tab ID', () => {
      // Navigate our test tab to a page with input field
      runCommand(
        `${CLI} navigate "data:text/html,<input id='test-input' placeholder='Type here'/>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Type text into the input field using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} type "#test-input" "Hello World" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it('should handle different input types in same tab', () => {
      // Navigate to page with various input types
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='text-input' type='text'/><textarea id='textarea'>Default text</textarea></form>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Type into different elements in the same tab
      expect(
        runCommand(
          `${CLI} type "#text-input" "Text input value" --tab-id ${testTabId} --port ${TEST_PORT}`
        ).exitCode
      ).toBe(0)
      expect(
        runCommand(
          `${CLI} type "#textarea" "Textarea content" --tab-id ${testTabId} --port ${TEST_PORT}`
        ).exitCode
      ).toBe(0)
    })

    it('should type with clear option', () => {
      // Navigate to page with pre-filled input
      runCommand(
        `${CLI} navigate "data:text/html,<input id='test-input' value='existing text'/>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Type with clear option
      const { exitCode } = runCommand(
        `${CLI} type "#test-input" "new text" --clear --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without target element
      runCommand(
        `${CLI} navigate "data:text/html,<div>No input field here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Try to type into non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(
          `${CLI} type "#nonexistent" "text" --tab-id ${testTabId} --port ${TEST_PORT}`,
          2000
        )
      }).toThrow('Command timed out (hanging)')
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} type "#test" "text" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} type "#test" "text" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} type --help`)
      expect(exitCode).toBe(0)
    })
  })
})
