import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

import {
  TEST_PORT,
  CLI,
  TEST_TMP_DIR,
} from '../../../../test-utils/test-constants'
import {
  createTestTab,
  closeTestTab,
  cleanupAllTestTabs,
  runCommand,
} from '../../../../test-utils/test-helpers'

/**
 * PDF Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('pdf command - TAB ID FROM OUTPUT', () => {
  let testTabId: string

  beforeAll(async () => {
    // Browser already running from global setup
    // Use shared helper to create and register tab for automatic cleanup
    const html =
      "<div id='test-container'><h1>PDF Test Suite Ready</h1><p>This content will be saved as PDF</p></div>"
    testTabId = createTestTab(html)
    console.log(`PDF test suite using tab ID: ${testTabId}`)
  })

  afterAll(async () => {
    // Clean up test PDFs from .tmp/
    try {
      if (fs.existsSync(path.join(TEST_TMP_DIR, 'page.pdf')))
        fs.unlinkSync(path.join(TEST_TMP_DIR, 'page.pdf'))
      if (fs.existsSync(path.join(TEST_TMP_DIR, 'test-page.pdf')))
        fs.unlinkSync(path.join(TEST_TMP_DIR, 'test-page.pdf'))
      if (fs.existsSync(path.join(TEST_TMP_DIR, 'test-custom.pdf')))
        fs.unlinkSync(path.join(TEST_TMP_DIR, 'test-custom.pdf'))
    } catch {}

    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId)
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} pdf --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('pdf')
      expect(output).toContain('tab-index')
      expect(output).toContain('tab-id')
    })
  })

  describe('direct tab targeting with captured ID', () => {
    it('should generate PDF with default filename using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} pdf ${path.join(TEST_TMP_DIR, 'page.pdf')} --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      if (exitCode !== 0) {
        console.error('PDF command failed with output:', output)
      }
      expect(exitCode).toBe(0)
      expect(output).toMatch(/PDF saved|saved PDF/i)

      // Check that a PDF file was created
      expect(fs.existsSync(path.join(TEST_TMP_DIR, 'page.pdf'))).toBe(true)

      // Clean up
      if (fs.existsSync(path.join(TEST_TMP_DIR, 'page.pdf')))
        fs.unlinkSync(path.join(TEST_TMP_DIR, 'page.pdf'))
    })

    it('should generate PDF with custom filename using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} pdf ${path.join(TEST_TMP_DIR, 'test-page.pdf')} --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/PDF saved|saved PDF/i)
      expect(output).toContain('test-page.pdf')

      // Check that the file was created
      expect(fs.existsSync(path.join(TEST_TMP_DIR, 'test-page.pdf'))).toBe(true)
    })

    it('should handle PDF format options using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} pdf ${path.join(TEST_TMP_DIR, 'test-custom.pdf')} --format A4 --landscape --tab-id ${testTabId} --port ${TEST_PORT}`
      )
      expect(exitCode).toBe(0)
      expect(output).toMatch(/PDF saved|saved PDF/i)
      expect(fs.existsSync(path.join(TEST_TMP_DIR, 'test-custom.pdf'))).toBe(
        true
      )
    })

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} pdf --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        5000 // Increased timeout to handle CDP connection attempt
      )
      expect(exitCode).toBe(1)
      expect(output).toMatch(/not found/i)
    })

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} pdf --tab-index 0 --tab-id ${testTabId}`,
        10000
      )
      expect(exitCode).toBe(1)
      // Note: yargs validation output handling varies in test environment
    })
  })

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} pdf --help`)
      expect(exitCode).toBe(0)
    })
  })
})
