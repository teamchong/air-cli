import { describe, it, expect } from 'bun:test';

import { CLI } from '../../../../test-utils/test-constants';
import { runCommand } from '../../../../test-utils/test-helpers';

/**
 * Doctor Command Tests
 *
 * Tests the doctor command that checks system requirements and installation health
 */
describe('doctor command for health checks', () => {
  describe('basic functionality', () => {
    it('should run without errors', () => {
      const { exitCode } = runCommand(`${CLI} doctor`);

      // Doctor may have warnings but should not fail completely
      expect([0, 1]).toContain(exitCode);
    });

    it('should output health check results', () => {
      const { output } = runCommand(`${CLI} doctor`);

      // Should contain some health check information
      expect(output).toContain('health check');
    });

    it('should check runtime environment', () => {
      const { output } = runCommand(`${CLI} doctor`);

      // Should check for Node or Bun
      expect(output).toMatch(/Runtime Environment|Node|Bun/i);
    });

    it('should check Playwright installation', () => {
      const { output } = runCommand(`${CLI} doctor`);

      // Should check for Playwright
      expect(output).toMatch(/Playwright/i);
    });

    it('should show summary', () => {
      const { output } = runCommand(`${CLI} doctor`);

      // Should contain summary information
      expect(output).toMatch(/Summary|passed|failed|warning/i);
    });
  });

  describe('JSON output', () => {
    it('should support --json flag', () => {
      const { output, exitCode } = runCommand(`${CLI} doctor --json`);

      // Should be valid JSON
      expect(() => JSON.parse(output)).not.toThrow();

      // JSON should contain expected structure
      const result = JSON.parse(output);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('summary');
    });

    it('should include check results in JSON', () => {
      const { output } = runCommand(`${CLI} doctor --json`);

      const result = JSON.parse(output);
      expect(Array.isArray(result.checks)).toBe(true);
      expect(result.checks.length).toBeGreaterThan(0);

      // Each check should have required properties
      for (const check of result.checks) {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('message');
        expect(['pass', 'warn', 'fail']).toContain(check.status);
      }
    });

    it('should include summary in JSON', () => {
      const { output } = runCommand(`${CLI} doctor --json`);

      const result = JSON.parse(output);
      expect(result.summary).toHaveProperty('passed');
      expect(result.summary).toHaveProperty('warnings');
      expect(result.summary).toHaveProperty('failed');
      expect(typeof result.summary.passed).toBe('number');
      expect(typeof result.summary.warnings).toBe('number');
      expect(typeof result.summary.failed).toBe('number');
    });
  });

  describe('command aliases', () => {
    it('should work with "check" alias', () => {
      const { output } = runCommand(`${CLI} check`);

      // Should work the same as doctor
      expect(output).toMatch(/health check|Runtime Environment/i);
    });

    it('should work with "health" alias', () => {
      const { output } = runCommand(`${CLI} health`);

      // Should work the same as doctor
      expect(output).toMatch(/health check|Runtime Environment/i);
    });
  });

  describe('verbose output', () => {
    it('should show detailed information with --verbose', () => {
      const { output } = runCommand(`${CLI} doctor --verbose`);

      // Verbose should contain more details
      expect(output).toMatch(/health check/i);
      expect(output).toMatch(/Details|Version|Path/i);
    });
  });

  describe('exit codes', () => {
    it('should exit with 0 if all checks pass', () => {
      const { output, exitCode } = runCommand(`${CLI} doctor`);

      // If output says all passed, exit code should be 0
      if (output.includes('All checks passed')) {
        expect(exitCode).toBe(0);
      }
    });

    it('should exit with 1 if critical checks fail', () => {
      const { output, exitCode } = runCommand(`${CLI} doctor`);

      // If output says checks failed, exit code should be 1
      if (output.match(/failed/i) && !output.includes('0 failed')) {
        expect(exitCode).toBe(1);
      }
    });
  });
});
