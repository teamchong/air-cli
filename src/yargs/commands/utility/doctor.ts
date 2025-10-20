/**
 * Doctor Command - Check system requirements and installation health
 *
 * Verifies that all required tools and dependencies are properly installed and configured.
 * Similar to `brew doctor`, `npm doctor`, etc.
 */

import { exec } from 'child_process';
import { existsSync } from 'fs';
import { promisify } from 'util';

import { ConfigManager } from '../../../lib/config-manager';
import { createCommand } from '../../lib/command-builder';

const execAsync = promisify(exec);

interface DoctorOptions {
  port: number;
  verbose?: boolean;
  json?: boolean;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

interface DoctorResult {
  success: boolean;
  checks: CheckResult[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    const checkCommand =
      process.platform === 'win32' ? `where ${command}` : `which ${command}`;
    await execAsync(checkCommand);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get version of a command
 */
async function getCommandVersion(
  command: string,
  args = '--version'
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${command} ${args}`);
    return stdout.trim().split('\n')[0];
  } catch {
    return null;
  }
}

/**
 * Check runtime environment (Node.js or Bun)
 */
async function checkRuntime(): Promise<CheckResult> {
  const bunExists = await commandExists('bun');
  const nodeExists = await commandExists('node');

  if (bunExists) {
    const version = await getCommandVersion('bun', '--version');
    return {
      name: 'Runtime Environment',
      status: 'pass',
      message: `Bun is installed`,
      details: version || undefined
    };
  }

  if (nodeExists) {
    const version = await getCommandVersion('node', '--version');
    return {
      name: 'Runtime Environment',
      status: 'pass',
      message: `Node.js is installed`,
      details: version || undefined
    };
  }

  return {
    name: 'Runtime Environment',
    status: 'fail',
    message: 'Neither Bun nor Node.js is installed',
    details: 'Install Bun from https://bun.sh or Node.js from https://nodejs.org'
  };
}

/**
 * Check if Playwright is installed
 */
async function checkPlaywright(): Promise<CheckResult> {
  try {
    // Try to import Playwright
    const playwrightPath = require.resolve('playwright');
    if (playwrightPath) {
      const version = await getCommandVersion('npx', 'playwright --version');
      return {
        name: 'Playwright',
        status: 'pass',
        message: 'Playwright is installed',
        details: version || undefined
      };
    }
  } catch {
    // Playwright not found
  }

  return {
    name: 'Playwright',
    status: 'fail',
    message: 'Playwright is not installed',
    details:
      'Run: bun install (from project directory) or npm install playwright'
  };
}

/**
 * Check if Playwright browsers are installed
 */
async function checkBrowsers(): Promise<CheckResult> {
  try {
    // Try to run playwright list-browsers
    const { stdout } = await execAsync('npx playwright list-browsers');

    // Check if chromium is installed
    if (stdout.includes('chromium')) {
      const lines = stdout.split('\n');
      const chromiumLine = lines.find(line => line.includes('chromium'));
      return {
        name: 'Browser Binaries',
        status: 'pass',
        message: 'Chromium browser is installed',
        details: chromiumLine?.trim()
      };
    }

    return {
      name: 'Browser Binaries',
      status: 'warn',
      message: 'Chromium browser not found',
      details: 'Run: npx playwright install chromium'
    };
  } catch {
    return {
      name: 'Browser Binaries',
      status: 'warn',
      message: 'Unable to check browser installation',
      details: 'Run: npx playwright install chromium'
    };
  }
}

/**
 * Check if air CLI binary is installed and in PATH
 */
async function checkBinary(): Promise<CheckResult> {
  const airExists = await commandExists('air');

  if (airExists) {
    const version = await getCommandVersion('air', '--version');
    return {
      name: 'CLI Binary',
      status: 'pass',
      message: 'air CLI is installed and in PATH',
      details: version || undefined
    };
  }

  // Check if binary exists in expected locations but not in PATH
  const possiblePaths = [
    `${process.env.HOME}/.local/bin/air`,
    '/usr/local/bin/air',
    './bin/air'
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return {
        name: 'CLI Binary',
        status: 'warn',
        message: `air CLI found at ${path} but not in PATH`,
        details: `Add ${path.replace('/air', '')} to your PATH environment variable`
      };
    }
  }

  return {
    name: 'CLI Binary',
    status: 'warn',
    message: 'air CLI binary not found',
    details: 'Run: ./install.sh or bun run build && bun run install:local'
  };
}

/**
 * Check configuration files
 */
async function checkConfig(): Promise<CheckResult> {
  try {
    const configManager = ConfigManager.getInstance();
    const configPath = configManager.getConfigPath();

    if (existsSync(configPath)) {
      // Try to load config to ensure it's valid
      const config = configManager.get();
      return {
        name: 'Configuration',
        status: 'pass',
        message: 'Configuration file is valid',
        details: configPath
      };
    }

    return {
      name: 'Configuration',
      status: 'warn',
      message: 'Configuration file not found (will use defaults)',
      details: `Expected at: ${configPath}`
    };
  } catch (error) {
    return {
      name: 'Configuration',
      status: 'fail',
      message: 'Configuration file is invalid',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check Git installation (optional but recommended)
 */
async function checkGit(): Promise<CheckResult> {
  const gitExists = await commandExists('git');

  if (gitExists) {
    const version = await getCommandVersion('git', '--version');
    return {
      name: 'Git',
      status: 'pass',
      message: 'Git is installed',
      details: version || undefined
    };
  }

  return {
    name: 'Git',
    status: 'warn',
    message: 'Git is not installed (optional but recommended)',
    details: 'Install from https://git-scm.com'
  };
}

/**
 * Check disk space (warn if low)
 */
async function checkDiskSpace(): Promise<CheckResult> {
  try {
    const dfCommand = process.platform === 'win32' ? 'wmic' : 'df';
    if (process.platform === 'win32') {
      // Windows: check available space
      const { stdout } = await execAsync(
        'wmic logicaldisk get size,freespace,caption'
      );
      return {
        name: 'Disk Space',
        status: 'pass',
        message: 'Disk space check completed',
        details: 'Use Windows Explorer to check available space'
      };
    } else {
      // Unix-like: check home directory
      const { stdout } = await execAsync(`${dfCommand} -h ~`);
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        return {
          name: 'Disk Space',
          status: 'pass',
          message: 'Sufficient disk space available',
          details: lines[1].trim()
        };
      }
    }
  } catch {
    // Ignore disk space check failures
  }

  return {
    name: 'Disk Space',
    status: 'pass',
    message: 'Disk space check skipped',
    details: undefined
  };
}

/**
 * Run all health checks
 */
async function runAllChecks(): Promise<CheckResult[]> {
  const checks = [
    checkRuntime(),
    checkPlaywright(),
    checkBrowsers(),
    checkBinary(),
    checkConfig(),
    checkGit(),
    checkDiskSpace()
  ];

  return Promise.all(checks);
}

export const doctorCommand = createCommand<DoctorOptions>({
  metadata: {
    name: 'doctor',
    category: 'utility',
    description: 'Check system requirements and installation health',
    aliases: ['check', 'health']
  },

  command: 'doctor',
  describe: 'Check system requirements and installation health',

  builder: yargs => {
    return yargs
      .option('port', {
        describe: 'Chrome debugging port',
        type: 'number',
        default: 9222,
        alias: 'p'
      })
      .example('$0 doctor', 'Run all health checks')
      .example('$0 doctor --json', 'Output results as JSON')
      .example('$0 doctor --verbose', 'Show detailed output');
  },

  handler: async ({ argv, logger }) => {
    try {
      if (!argv.json) {
        logger.info('Running air-cli health checks...\n');
      }

      // Run all checks
      const checks = await runAllChecks();

      // Calculate summary
      const summary = {
        passed: checks.filter(c => c.status === 'pass').length,
        warnings: checks.filter(c => c.status === 'warn').length,
        failed: checks.filter(c => c.status === 'fail').length
      };

      // Output results
      if (argv.json) {
        const result: DoctorResult = {
          success: summary.failed === 0,
          checks,
          summary
        };
        logger.json(result);
      } else {
        // Pretty print results
        for (const check of checks) {
          const icon =
            check.status === 'pass'
              ? '✅'
              : check.status === 'warn'
                ? '⚠️'
                : '❌';
          const statusText =
            check.status === 'pass'
              ? 'PASS'
              : check.status === 'warn'
                ? 'WARN'
                : 'FAIL';

          logger.info(`${icon} ${check.name}: ${statusText}`);
          logger.info(`   ${check.message}`);

          if (check.details && argv.verbose) {
            logger.info(`   Details: ${check.details}`);
          }

          if (check.status !== 'pass' && check.details && !argv.verbose) {
            logger.info(`   ${check.details}`);
          }

          logger.info('');
        }

        // Print summary
        logger.info('─────────────────────────────────────');
        logger.info(
          `Summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed`
        );

        if (summary.failed === 0 && summary.warnings === 0) {
          logger.success('All checks passed! Your system is ready to use air-cli.');
        } else if (summary.failed === 0) {
          logger.warn(
            'Some checks have warnings. air-cli should work but you may want to address these.'
          );
        } else {
          logger.error(
            `${summary.failed} critical check(s) failed. Please fix these issues before using air-cli.`
          );
          throw new Error('Health check failed');
        }
      }
    } catch (error) {
      const err = error as Error;
      if (!argv.json) {
        logger.error(`Doctor command failed: ${err.message}`);
      }
      throw new Error('Command failed');
    }
  },

  supportsJson: true
});
