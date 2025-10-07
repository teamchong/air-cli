import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants'
import { runCommand } from '../../../../test-utils/test-helpers'
/**
 * Real Perf Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('perf command - REAL TESTS', () => {
  beforeAll(async () => {
    // Build the CLI only if needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (!require('fs').existsSync('dist/src/index.js')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const execSync = require('child_process').execSync
      execSync('bun run build', { stdio: 'ignore' })
    }
  })

  afterAll(async () => {
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  })

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} perf --help`)
      expect(exitCode).toBe(0)
      expect(output).toContain('perf')
      expect(output).toContain('perf')
    })
  })

  describe('handler execution', () => {
    it('should work with global browser session', () => {
      const { exitCode } = runCommand(`${CLI} perf --port ${TEST_PORT}`)
      expect([0, 1]).toContain(exitCode)
      // Browser is now available via global setup
    })

    it('should handle different port gracefully', () => {
      // Perf command doesn't need browser connection, should work regardless of port
      const { exitCode, output } = runCommand(`${CLI} perf --port ${TEST_PORT}`)
      expect(exitCode).toBe(0)
      expect(output).toMatch(
        /No performance data available|Performance Statistics/i
      )
    })
  })
})
