/**
 * Global Test Constants
 *
 * Centralized constants for all test files to ensure consistency
 */

/**
 * The port used by the test browser instance
 * This is configured in package.json test scripts and global-setup.ts
 */
export const TEST_PORT = 19222

/**
 * The CLI command path for tests
 */
export const CLI = 'bun run src/index.ts'

/**
 * Default timeout for test commands
 */
export const DEFAULT_TIMEOUT = 5000

/**
 * Extended timeout for slower operations
 */
export const EXTENDED_TIMEOUT = 10000

/**
 * Test temporary directory for test files
 * Uses .tmp/ in repo root (gitignored) instead of /tmp
 */
export const TEST_TMP_DIR = '.tmp'