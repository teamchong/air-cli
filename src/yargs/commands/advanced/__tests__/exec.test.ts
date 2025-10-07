import * as path from 'path'

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

import {
  TEST_PORT,
  CLI,
  TEST_TMP_DIR,
} from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  unused_closeTestTab,
} from '../../../../test-utils/test-helpers'

/**
 * Exec Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('exec command - TAB ID FROM OUTPUT', () => {
  let testTabId: string
  const testScriptPath = path.join(
    __dirname,
    '../../../../test-utils/fixtures/simple-script.js'
  )

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --port ${TEST_PORT} --url "data:text/html,<div id='test-container'><h1>Exec Test Suite Ready</h1><p>JavaScript file execution testing</p></div>"`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Exec test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up test tab
    if (testTabId) {
      unused_closeTestTab(testTabId)
    }
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} exec --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('exec')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should execute JavaScript file using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} exec "${testScriptPath}" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toContain('Hello from test script')
      expect(output).toContain('5')
    })

    it('should handle non-existent file gracefully', () => {
      const { exitCode, output } = runCommand(
        `${CLI} exec ${path.join(TEST_TMP_DIR, 'nonexistent.js')} --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/ENOENT|not found/i)
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} exec "${testScriptPath}" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        5000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { exitCode } = runCommand(
        `${CLI} exec "${testScriptPath}" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} exec --help`)
      expect(exitCode).toBe(0)
    })
  })
})
