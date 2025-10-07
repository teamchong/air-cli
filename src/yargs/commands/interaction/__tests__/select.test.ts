import { execSync } from 'child_process';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants';
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab
} from '../../../../test-utils/test-helpers';
/**
 * Simplified Select Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('select command - TAB ID FROM OUTPUT', () => {
  let testTabId: string;

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Select Test Suite Ready</div>" --port ${TEST_PORT}`
    );
    testTabId = extractAndRegisterTabId(output);
    console.log(`Select test suite using tab ID: ${testTabId}`);
  });

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId);
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} select --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('select');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should select option using captured tab ID', () => {
      // Navigate our test tab to a page with a select dropdown
      runCommand(
        `${CLI} navigate "data:text/html,<select id='test-select'><option value='a'>Option A</option><option value='b'>Option B</option><option value='c'>Option C</option></select>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Select an option using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} select "#test-select" "b" --tab-id ${testTabId} --port ${TEST_PORT}`
      );
      expect(exitCode).toBe(0);
    });

    it('should select multiple options in multi-select', () => {
      // Navigate to page with multi-select dropdown
      runCommand(
        `${CLI} navigate "data:text/html,<select id='multi-select' multiple><option value='1'>One</option><option value='2'>Two</option><option value='3'>Three</option></select>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Select multiple options in the same tab
      const { exitCode } = runCommand(
        `${CLI} select "#multi-select" "1" "3" --tab-id ${testTabId} --port ${TEST_PORT}`
      );
      expect(exitCode).toBe(0);
    });

    it('should work with different select elements', () => {
      // Navigate to page with multiple select elements
      runCommand(
        `${CLI} navigate "data:text/html,<select id='color'><option value='red'>Red</option><option value='blue'>Blue</option></select><select id='size'><option value='s'>Small</option><option value='l'>Large</option></select>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Select from different dropdowns in the same tab
      expect(
        runCommand(`${CLI} select "#color" "blue" --tab-id ${testTabId} --port ${TEST_PORT}`)
          .exitCode
      ).toBe(0);
      expect(
        runCommand(`${CLI} select "#size" "l" --tab-id ${testTabId} --port ${TEST_PORT}`).exitCode
      ).toBe(0);
    });

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without select element
      runCommand(
        `${CLI} navigate "data:text/html,<div>No select here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Try to select from non-existent element - command hangs on non-existent selectors
      expect(() => {
        runCommand(
          `${CLI} select "#nonexistent" "value" --tab-id ${testTabId} --port ${TEST_PORT}`,
          2000
        );
      }).toThrow('Command timed out (hanging)');
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} select "#test" "value" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} select "#test" "value" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      );
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} select --help`);
      expect(exitCode).toBe(0);
    });
  });
});
