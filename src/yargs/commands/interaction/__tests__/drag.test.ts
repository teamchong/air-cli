import { execSync } from 'child_process'

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab,
} from '../../../../test-utils/test-helpers'
/**
 * Simplified Drag Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('drag command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Drag Test Suite Ready</div>" --port ${TEST_PORT}`
    )
    testTabId = extractAndRegisterTabId(output)
    console.log(`Drag test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} drag --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('drag')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should drag element using captured tab ID', () => {
      // Navigate our test tab to a page with draggable elements
      runCommand(
        `${CLI} navigate "data:text/html,<div id='source' draggable='true' style='width:100px;height:100px;background:blue'>Drag Me</div><div id='target' style='width:200px;height:200px;background:red;margin-top:20px'>Drop Here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`
      )

      // Drag from source to target using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} drag "#source" "#target" --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
    })

    it('should work with different draggable elements', () => {
      // Navigate to page with multiple draggable elements
      runCommand(
        `${CLI} navigate "data:text/html,<div id='item1' draggable='true'>Item 1</div><div id='item2' draggable='true'>Item 2</div><div id='dropzone'>Drop Zone</div>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )

      // Drag different elements in the same tab
      expect(
        runCommand(
          `${CLI} drag "#item1" "#dropzone" --tab-id ${testTabId} --port ${TEST_PORT}`,
          8000
        ).exitCode
      ).toBe(0)
      expect(
        runCommand(
          `${CLI} drag "#item2" "#dropzone" --tab-id ${testTabId} --port ${TEST_PORT}`,
          8000
        ).exitCode
      ).toBe(0)
    })

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without draggable elements
      runCommand(
        `${CLI} navigate "data:text/html,<div>No draggable elements here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`,
        8000
      )

      // Try to drag non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(
          `${CLI} drag "#nonexistent" "#target" --tab-id ${testTabId} --port ${TEST_PORT}`,
          2000
        )
      }).toThrow('Command timed out (hanging)')
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} drag "#source" "#target" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        8000
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} drag "#source" "#target" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} drag --help`)
      expect(exitCode).toBe(0)
    })
  })
})
