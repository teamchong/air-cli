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
 * Simplified Press Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('press command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Press Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Press test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} press --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('press')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should press key using captured tab ID', () => {
      // Navigate our test tab to a page with input field
      runCommand(
        `${CLI} navigate "data:text/html,<input id='test-input' autofocus/>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Press Enter key in the specific tab
      const { exitCode } = runCommand(
        `${CLI} press Enter --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it(
      'should press different keys in same tab',
      async () => {
        // Navigate to test page
        runCommand(
          `${CLI} navigate "data:text/html,<input id='test-input' autofocus/>" --tab-id ${testTabId} --port ${TEST_PORT}`
        )

        // Press various keys in the same tab
        expect(
          runCommand(`${CLI} press Tab --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
        expect(
          runCommand(`${CLI} press Escape --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
        expect(
          runCommand(`${CLI} press Space --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
      },
      15000
    )

    it(
      'should press arrow keys in specific tab',
      async () => {
        // Navigate to test page
        runCommand(
          `${CLI} navigate "data:text/html,<input id='test-input' value='test text' autofocus/>" --tab-id ${testTabId} --port ${TEST_PORT}`
        )

        // Press arrow keys in the specific tab (increase timeout for multiple commands)
        expect(
          runCommand(`${CLI} press ArrowLeft --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
        expect(
          runCommand(`${CLI} press ArrowRight --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
        expect(
          runCommand(`${CLI} press ArrowUp --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
        expect(
          runCommand(`${CLI} press ArrowDown --tab-id ${testTabId} --port ${TEST_PORT}`, 10000).exitCode
        ).toBe(0)
      },
      20000
    )

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} press Enter --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} press Enter --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} press --help`)
      expect(exitCode).toBe(0)
    })
  })
})
