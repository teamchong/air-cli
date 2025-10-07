import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants';
import { runCommand } from '../../../../test-utils/test-helpers';
/**
 * Real Dialog Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('dialog command - REAL TESTS', () => {
  beforeAll(async () => {
    // Build the CLI only if needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (!require('fs').existsSync('dist/src/index.js')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const execSync = require('child_process').execSync;
      execSync('bun run build', { stdio: 'ignore' });
    }
  });

  afterAll(async () => {
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} dialog --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('Handle browser dialogs');
      expect(output).toContain('accept');
      expect(output).toContain('dismiss');
    });
  });

  describe('handler execution', () => {
    it('should handle accept action with no dialog gracefully', () => {
      const { output, exitCode } = runCommand(
        `${CLI} dialog accept --port ${TEST_PORT}`,
        5000
      );
      expect(exitCode).toBe(1);
      expect(output).toMatch(
        /No dialog appeared|No browser running|browser running/i
      );
    });

    it('should handle dismiss action with no dialog gracefully', () => {
      const { output, exitCode } = runCommand(
        `${CLI} dialog dismiss --port ${TEST_PORT}`,
        5000
      );
      expect(exitCode).toBe(1);
      expect(output).toMatch(
        /No dialog appeared|No browser running|browser running/i
      );
    });

    it('should handle different port gracefully', () => {
      // Command should fail gracefully when trying to connect to non-existent port
      const { output, exitCode } = runCommand(
        `${CLI} dialog accept --port 18999`, // Use a definitely unused port
        3000
      );
      expect(exitCode).toBe(1);
      // Updated error message format from CDP connection pool
      expect(output).toMatch(
        /Failed to connect to browser|No browser running|browser running/i
      );
    });
  });
});
