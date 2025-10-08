/**
 * Global Test Teardown
 *
 * Cleans up browser session and all tabs after tests complete
 */

import { TabManager } from './tab-manager';
import { TEST_PORT } from './test-constants';

export default function teardown(): void {
  console.log('🧹 Cleaning up after all tests...');

  try {
    // Clean up all test-related tabs (created during tests + accumulated test tabs)
    console.log('🗂️  Closing created test tabs...');
    TabManager.cleanupAllCreatedTabs();

    console.log('🧹 Cleaning up accumulated test tabs...');
    TabManager.cleanupTestTabs();

    // Close the anchor tab (this will exit Chrome since it's the last tab)
    const anchorTabId = process.env.ANCHOR_TAB_ID;
    if (anchorTabId) {
      console.log(`📌 Closing anchor tab: ${anchorTabId}`);
      try {
        TabManager.runCommand(
          `bun run src/index.ts tabs close --tab-id ${anchorTabId} --port ${TEST_PORT}`,
          3000
        );
      } catch {
        console.log('ℹ️  Anchor tab already closed or browser exited');
      }
    }

    // Try to close browser explicitly (may already be closed from anchor tab)
    console.log('🌐 Closing browser session...');
    try {
      TabManager.runCommand(
        `bun run src/index.ts close --port ${TEST_PORT}`,
        3000
      );
    } catch {
      // Browser might already be closed, which is fine
      console.log('ℹ️  Browser was already closed');
    }

    console.log('✅ Cleanup complete');
  } catch (_error) {
    console.error('❌ Global teardown error:', _error);
    // Don't throw - we want tests to complete even if cleanup fails
  }
}
