/**
 * Global Test Setup for Bun
 *
 * Executes on import to set up browser session for all tests
 * Use with: bun test --preload ./src/test-utils/global-setup.ts
 */

import { execSync } from 'child_process'
import { mkdirSync, rmSync } from 'fs'
import { TabManager } from './tab-manager'
import { TEST_PORT, TEST_TMP_DIR } from './test-constants'

// Execute setup immediately when this module is imported
;(async function globalSetup() {
  console.log('🚀 Setting up browser for all tests...')

  // Clean and recreate test temp directory
  try {
    rmSync(TEST_TMP_DIR, { recursive: true, force: true })
    mkdirSync(TEST_TMP_DIR, { recursive: true })
    console.log(`📁 Created test temp directory: ${TEST_TMP_DIR}`)
  } catch (error) {
    console.warn('Warning: Could not setup test temp directory:', error)
  }

  try {
    // Build TypeScript first (skip in CI where build is a separate step)
    if (!process.env.CI) {
      console.log('📦 Building TypeScript...')
      execSync('bun run build:ts', { stdio: 'inherit' })
    }

    // In CI, use Playwright's browser which is already available
    if (process.env.CI) {
      console.log('ℹ️  Running in CI - using Playwright browser')
      // Clear any existing tab tracking
      TabManager.clearTracking()
      return
    }

    // Launch browser session for local development
    console.log('🌐 Starting browser session in headless mode...')

    // Set environment variable for headless mode
    process.env.AIR_CLI_HEADLESS = 'true'

    // USE A DIFFERENT PORT FOR TESTS TO AVOID CONFLICTS WITH USER'S BROWSER
    const { output, exitCode } = TabManager.runCommand(
      `AIR_CLI_HEADLESS=true bun run src/index.ts open --port ${TEST_PORT}`,
      10000
    )

    if (exitCode !== 0) {
      throw new Error(`Failed to start browser: ${output}`)
    }

    console.log('✅ Browser session ready')

    // Clean up any accumulated test tabs from previous runs
    console.log('🧹 Cleaning up any leftover test tabs...')
    TabManager.cleanupTestTabs()

    // Clear any existing tab tracking
    TabManager.clearTracking()

    // IMPORTANT: Create a persistent anchor tab to keep browser alive
    // Without this, closing the last test tab will exit Chrome
    console.log('📌 Creating persistent anchor tab to keep browser alive...')
    const { output: anchorOutput } = TabManager.runCommand(
      `bun run src/index.ts tabs new --port ${TEST_PORT} --url "about:blank"`,
      10000
    )
    const anchorMatch = anchorOutput.match(/Tab ID: ([A-F0-9]+)/)
    if (anchorMatch) {
      const anchorTabId = anchorMatch[1]
      console.log(`📌 Anchor tab created: ${anchorTabId}`)
      // Mark as persistent so tests don't accidentally close it
      process.env.ANCHOR_TAB_ID = anchorTabId
    }

    // Register cleanup on process exit
    process.on('exit', () => {
      console.log('🧹 Cleaning up browser session...')
      try {
        execSync(`bun run src/index.ts close --port ${TEST_PORT}`, { stdio: 'ignore' })
      } catch (e) {
        // Ignore errors during cleanup
      }
    })
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  }
})()

export {}
