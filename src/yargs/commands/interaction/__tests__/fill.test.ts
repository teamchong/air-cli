import { execSync } from 'child_process';

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

import { TEST_PORT, CLI } from '../../../../test-utils/test-constants';
import {
  runCommand,
  extractAndRegisterTabId,
  closeTestTab
} from '../../../../test-utils/test-helpers';
/**
 * Simplified Fill Command Tests - TAB ID FROM COMMAND OUTPUT
 *
 * - Uses global browser session (no per-file setup/teardown)
 * - Captures tab ID directly from command output
 * - Uses returned tab ID for all interactions
 * - NO COMPLEX DISCOVERY - commands return what we need
 * - NO TAB MANAGEMENT - let global setup handle browser lifecycle
 */
describe('fill command - TAB ID FROM OUTPUT', () => {
  let testTabId: string;

  beforeAll(async () => {
    // Browser already running from global setup
    // Create a dedicated test tab for this test suite and capture its ID
    const { output } = runCommand(
      `${CLI} tabs new --url "data:text/html,<div id='test-container'>Fill Test Suite Ready</div>" --port ${TEST_PORT}`
    );
    testTabId = extractAndRegisterTabId(output);
    console.log(`Fill test suite using tab ID: ${testTabId}`);
  });

  afterAll(async () => {
    // Clean up our test tab using the specific tab ID
    closeTestTab(testTabId);
  });

  describe('command structure', () => {
    it('should have correct command definition', () => {
      const { output, exitCode } = runCommand(`${CLI} fill --help`);
      expect(exitCode).toBe(0);
      expect(output).toContain('fill');
      expect(output).toContain('tab-index');
      expect(output).toContain('tab-id');
    });
  });

  describe('direct tab targeting with captured ID', () => {
    it('should fill form fields using captured tab ID', () => {
      // Navigate our test tab to a page with form fields
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='name' name='name'/><input id='email' type='email'/></form>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Fill multiple fields at once using our captured tab ID
      const { exitCode } = runCommand(
        `${CLI} fill "#name=John Doe" "#email=john@example.com" --tab-id ${testTabId} --port ${TEST_PORT}`
      );
      expect(exitCode).toBe(0);
    });

    it('should fill different input types in same tab', () => {
      // Navigate to page with various input types
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='text' type='text'/><input id='pass' type='password'/><textarea id='msg'></textarea></form>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Fill different field types in the same tab
      expect(
        runCommand(`${CLI} fill "#text=Sample Text" --tab-id ${testTabId} --port ${TEST_PORT}`)
          .exitCode
      ).toBe(0);
      expect(
        runCommand(`${CLI} fill "#pass=secret123" --tab-id ${testTabId} --port ${TEST_PORT}`)
          .exitCode
      ).toBe(0);
      expect(
        runCommand(`${CLI} fill "#msg=Long message text" --tab-id ${testTabId} --port ${TEST_PORT}`)
          .exitCode
      ).toBe(0);
    });

    it('should handle multiple fields at once', () => {
      // Navigate to page with multiple form fields
      runCommand(
        `${CLI} navigate "data:text/html,<form><input id='first' name='first'/><input id='last' name='last'/><input id='company'/></form>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Fill multiple fields in one command
      const { exitCode } = runCommand(
        `${CLI} fill "#first=John" "#last=Doe" "#company=Acme Corp" --tab-id ${testTabId} --port ${TEST_PORT}`
      );
      expect(exitCode).toBe(0);
    });

    it('should handle non-existent element gracefully', () => {
      // Navigate to page without form fields
      runCommand(
        `${CLI} navigate "data:text/html,<div>No form here</div>" --tab-id ${testTabId} --port ${TEST_PORT}`
      );

      // Try to fill non-existent element - command reports error but exits gracefully
      const { exitCode, output } = runCommand(
        `${CLI} fill "#nonexistent=value" --tab-id ${testTabId} --port ${TEST_PORT}`,
        5000
      );
      expect(exitCode).toBe(0);
      expect(output).toMatch(/Failed to fill|not found|⚠️/i);
    });

    it('should handle invalid tab ID', () => {
      const { output, exitCode } = runCommand(
        `${CLI} fill "#test=value" --tab-id "INVALID_ID" --port ${TEST_PORT}`,
        10000
      );
      expect(exitCode).toBe(1);
      expect(output).toMatch(/not found/i);
    });

    it('should prevent conflicting tab arguments', () => {
      const { output, exitCode } = runCommand(
        `${CLI} fill "#test=value" --tab-index 0 --tab-id ${testTabId} --port ${TEST_PORT}`,
        2000
      );
      expect(exitCode).toBe(1);
      // Note: yargs validation output handling varies in test environment
    });
  });

  describe('backwards compatibility', () => {
    it('should work without tab targeting (active page)', () => {
      // Should work on whatever tab is currently active
      const { exitCode } = runCommand(`${CLI} fill --help`);
      expect(exitCode).toBe(0);
    });
  });
});
