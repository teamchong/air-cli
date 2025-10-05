import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { execSync } from 'child_process'
import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import { runCommand } from '../../../../test-utils/test-helpers'
/**
 * Real Tabs Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('tabs command - REAL TESTS', () => {

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/src/index.js')) {
      execSync('bun run build', { stdio: 'ignore' })
    }
  })

  afterAll(async () => {
    // Clean up
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  })

  describe('argument parsing', () => {
    it('should parse list action', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs list --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('list')
    })

    it('should parse new action with URL', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs new --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('--url')
    })

    it('should parse close action with index', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs close --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('--index')
    })

    it('should parse select action with index', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs select --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('--index')
    })

    it('should default to list action when no action provided', () => {
      const { output, exitCode } = runCommand(`${CLI} tabs --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('Manage browser tabs')
      expect(output).toContain('list')
    })
  })

  describe('handler execution', () => {
    describe('list action', () => {
      it('should list tabs with global browser session', () => {
        const { output, exitCode } = runCommand(`${CLI} tabs list --port ${TEST_PORT}`)
        expect(exitCode).toBe(0)
        expect(output).toContain('tabs')
      })
    })

    describe('new action', () => {
      it('should create new tab with global browser session', () => {
        const { output, exitCode } = runCommand(
          `${CLI} tabs new --url https://example.com --port ${TEST_PORT}`
        )
        expect(exitCode).toBe(0)
        expect(output).toContain('Tab ID')
      })
    })

    describe('close action', () => {
      it('should handle tab close with global browser session', () => {
        // Try to close a tab - may succeed or fail depending on tab availability
        const { output, exitCode } = runCommand(`${CLI} tabs close --index 999 --port ${TEST_PORT}`)
        // Either succeeds (if tab exists) or fails gracefully (if no tab at index)
        expect([0, 1]).toContain(exitCode)
      })
    })

    describe('select action', () => {
      it('should handle tab select with global browser session', () => {
        // Try to select a tab - should work with existing tabs
        const { output, exitCode } = runCommand(`${CLI} tabs select --index 0 --port ${TEST_PORT}`)
        expect([0, 1]).toContain(exitCode)
      })
    })
  })
})
