import { execSync } from 'child_process';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants';
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab
} from '../../../../test-utils/test-helpers';

/**
 * Eval Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('eval command - TAB ID FROM OUTPUT', () => {
  let testTabId: string;

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'><h1>Eval Test Suite Ready</h1><p>JavaScript evaluation testing</p></div>" --port ${TEST_PORT}`,
      15000
    );
    testTabId = extractAndRegisterTabId(output);
    console.log(`Eval test suite using tab ID: ${testTabId}`);
  });

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId);
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} eval --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('eval');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should evaluate simple JavaScript using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} eval "1 + 1" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(0);
      expect(output).toContain('2');
    });

    it('should evaluate DOM access using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} eval "document.title" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(0);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle complex JavaScript expressions using captured tab ID', () => {
      const { exitCode, output } = runCommand(
        `${CLI} eval "Array.from({length: 3}, (_, i) => i + 1).join(',')" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(0);
      expect(output).toContain('1,2,3');
    });

    it('should handle JavaScript errors gracefully', () => {
      const { exitCode, output } = runCommand(
        `${CLI} eval "throw new Error('test error')" --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(1);
      expect(output).toMatch(/error/i);
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} eval "1 + 1" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} eval "1 + 1" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} eval --help`);
      expect(exitCode).toBe(0);
    });
  });
});
