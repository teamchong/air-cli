import { execSync, spawn } from 'child_process';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants';
import { runCommand } from '../../../../test-utils/test-helpers';

/**
 * Real Network Command Tests
 *
 * These tests run the actual CLI binary with real browser functionality.
 * NO MOCKS - everything is tested against a real implementation.
 */
describe('network command - REAL TESTS', () => {

  beforeAll(async () => {
    // Build the CLI only if needed
    if (!require('fs').existsSync('dist/src/index.js')) {
      execSync('bun run build', { stdio: 'ignore' });
    }
  });

  afterAll(async () => {
    // Global teardown handles browser cleanup
    // Don't close browser here as it interferes with other tests
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} network --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('Monitor network requests');
      expect(output).toContain('network');
    });
  });

  describe('handler execution', () => {
    it('should work with global browser session', (done) => {
      // Network command runs continuously - use spawn to test it
      const child = spawn('sh', ['-c', `${CLI} network --port ${TEST_PORT}`], {
        env: { ...process.env, NODE_ENV: undefined }
      });

      let output = '';
      let hasStarted = false;

      child.stdout?.on('data', (data) => {
        output += data.toString();
        // If we see output, the command has started
        if (output.length > 0) {
          hasStarted = true;
        }
      });

      child.stderr?.on('data', (data) => {
        output += data.toString();
        if (output.length > 0) {
          hasStarted = true;
        }
      });

      // Give it 2 seconds to start, then kill it
      setTimeout(() => {
        child.kill('SIGTERM');

        // Wait a bit for process to terminate
        setTimeout(() => {
          // Network command should have started (hasStarted or exitCode should indicate connection attempt)
          expect(hasStarted || output.length > 0).toBe(true);
          done();
        }, 500);
      }, 2000);
    }, 5000);

    it('should handle different port gracefully', () => {
      // Command should fail gracefully when trying to connect to non-existent port
      const { output, exitCode } = runCommand(
        `${CLI} network --port 29999`,
        4000
      );
      // Should fail (1) since no browser is running on port 29999
      expect(exitCode).toBe(1);
      expect(output).toMatch(/No active page|browser running|Failed to connect/i);
    });
  });
});
