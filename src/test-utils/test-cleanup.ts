/**
 * Test Cleanup Utilities
 *
 * Provides cleanup functions to prevent connection pool exhaustion
 * and ensure test isolation
 */

import { CDPConnectionPool } from '../lib/cdp-connection-pool'

import { TEST_PORT } from './test-constants'

/**
 * Clean up CDP connections after a test file completes
 * Call this in afterAll() of integration tests that use the browser
 *
 * This prevents connection pool exhaustion when running full test suite
 */
export async function unused_cleanupCDPConnections(): Promise<void> {
  try {
    const pool = CDPConnectionPool.getInstance()

    // Release all connections back to pool (mark as not in use)
    // This allows the cleanup interval to remove stale connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connections = (pool as any).connections
    if (connections) {
      for (const [, conn] of connections) {
        conn.inUse = false
        conn.lastUsed = Date.now() - 70000 // Force immediate cleanup (older than 60s timeout)
      }
    }

    // Trigger immediate cleanup of stale connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanupMethod = (pool as any).cleanupStaleConnections
    if (typeof cleanupMethod === 'function') {
      cleanupMethod.call(pool)
    }
  } catch (_error) {
    // Don't fail tests if cleanup fails
    console.warn('CDP connection cleanup warning:', _error)
  }
}

/**
 * Full connection pool reset for test isolation
 * More aggressive than unused_cleanupCDPConnections
 */
export async function resetConnectionPool(): Promise<void> {
  try {
    const pool = CDPConnectionPool.getInstance()

    // Clear all connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clearMethod = (pool as any).clearAll
    if (typeof clearMethod === 'function') {
      clearMethod.call(pool)
    }
  } catch (_error) {
    console.warn('Connection pool reset warning:', _error)
  }
}

/**
 * Clear Chrome's cache and history to release memory
 * Call this periodically in tests that do many navigations
 *
 * This helps prevent memory accumulation from navigate command
 * creating intermediate page states in Chrome
 */
export async function releaseChromeMemory(): Promise<void> {
  try {
    const { BrowserHelper } = await import('../lib/browser-helper')
    await BrowserHelper.clearBrowsingData(TEST_PORT, {
      cache: true,
      history: true,
      cookies: false, // Keep cookies for session continuity
    })
  } catch (_error) {
    // Don't fail tests if cleanup fails
    console.warn('Chrome memory release warning:', _error)
  }
}
