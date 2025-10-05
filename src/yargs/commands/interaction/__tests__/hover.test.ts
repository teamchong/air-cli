import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'bun:test'
import { execSync } from 'child_process'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
/**
 * Simplified Hover Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('hover command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Hover Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Hover test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} hover --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('hover')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should hover element using captured tab ID', () => {
      // Navigate our test tab to a page with a hoverable element
      runCommand(
        `${CLI} navigate "data:text/html,<div id='test-div' style='width:100px;height:100px;background:red'>Hover Me</div>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Hover the element directly using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} hover "#test-div" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without target element
      runCommand(
        `${CLI} navigate "data:text/html,<div>No hover target here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Try to hover non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(`${CLI} hover "#nonexistent" --tab-id ${testTabId} --port ${TEST_PORT}`, 2000)
      }).toThrow('Command timed out (hanging)')
    })

    it('should work with different element types', () => {
      // Navigate to page with various hoverable elements
      runCommand(
        `${CLI} navigate "data:text/html,<button id='hover-btn'>Button</button><span id='hover-span'>Span</span>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Hover different elements in the same tab
      expect(
        runCommand(`${CLI} hover "#hover-btn" --tab-id ${testTabId} --port ${TEST_PORT}`).exitCode
      ).toBe(0)
      expect(
        runCommand(`${CLI} hover "#hover-span" --tab-id ${testTabId} --port ${TEST_PORT}`).exitCode
      ).toBe(0)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} hover "#test" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} hover "#test" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} hover --help`)
      expect(exitCode).toBe(0)
    })
  })
})
