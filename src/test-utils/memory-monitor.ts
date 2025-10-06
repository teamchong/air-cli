/**
 * Memory Monitor for Test Suite
 *
 * Monitors memory usage during tests to detect leaks
 */

import { execSync } from 'child_process'

interface MemorySnapshot {
  timestamp: number
  nodeHeapUsedMB: number
  nodeHeapTotalMB: number
  nodeExternalMB: number
  chromeProcessCount: number
  chromeRssMB: number
  message?: string
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = []
  private startTime: number = Date.now()

  /**
   * Take a snapshot of current memory usage
   */
  snapshot(message?: string): MemorySnapshot {
    const mem = process.memoryUsage()

    // Get Chrome process memory
    let chromeProcessCount = 0
    let chromeRssMB = 0
    try {
      // Find Chrome processes
      const psOutput = execSync('ps aux | grep -i "chrome\\|chromium" | grep -v grep', {
        encoding: 'utf8',
        timeout: 2000
      })

      const lines = psOutput.trim().split('\n').filter(l => l.trim())
      chromeProcessCount = lines.length

      // Sum RSS (column 6 in ps aux, in KB)
      chromeRssMB = lines.reduce((sum, line) => {
        const parts = line.trim().split(/\s+/)
        const rssKB = parseInt(parts[5], 10)
        return sum + (isNaN(rssKB) ? 0 : rssKB)
      }, 0) / 1024
    } catch (error) {
      // Chrome might not be running or ps failed
    }

    const snapshot: MemorySnapshot = {
      timestamp: Date.now() - this.startTime,
      nodeHeapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      nodeHeapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      nodeExternalMB: Math.round(mem.external / 1024 / 1024 * 100) / 100,
      chromeProcessCount,
      chromeRssMB: Math.round(chromeRssMB * 100) / 100,
      message,
    }

    this.snapshots.push(snapshot)
    return snapshot
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): MemorySnapshot[] {
    return this.snapshots
  }

  /**
   * Analyze snapshots for leaks
   */
  analyze(): {
    hasLeak: boolean
    nodeHeapGrowthMB: number
    chromeMemGrowthMB: number
    report: string
  } {
    if (this.snapshots.length < 2) {
      return {
        hasLeak: false,
        nodeHeapGrowthMB: 0,
        chromeMemGrowthMB: 0,
        report: 'Not enough snapshots to analyze'
      }
    }

    const first = this.snapshots[0]
    const last = this.snapshots[this.snapshots.length - 1]

    const nodeHeapGrowthMB = last.nodeHeapUsedMB - first.nodeHeapUsedMB
    const chromeMemGrowthMB = last.chromeRssMB - first.chromeRssMB

    // Calculate growth rate
    const durationSeconds = (last.timestamp - first.timestamp) / 1000
    const nodeGrowthPerMinute = (nodeHeapGrowthMB / durationSeconds) * 60
    const chromeGrowthPerMinute = (chromeMemGrowthMB / durationSeconds) * 60

    // Leak heuristics: growing > 10MB/minute continuously
    const hasLeak = nodeGrowthPerMinute > 10 || chromeGrowthPerMinute > 50

    const report = `
Memory Analysis
===============
Duration: ${Math.round(durationSeconds)}s (${this.snapshots.length} snapshots)

Node.js Memory:
  Start: ${first.nodeHeapUsedMB}MB heap / ${first.nodeHeapTotalMB}MB total
  End:   ${last.nodeHeapUsedMB}MB heap / ${last.nodeHeapTotalMB}MB total
  Growth: ${nodeHeapGrowthMB >= 0 ? '+' : ''}${nodeHeapGrowthMB}MB
  Rate: ${nodeGrowthPerMinute >= 0 ? '+' : ''}${Math.round(nodeGrowthPerMinute * 100) / 100}MB/min

Chrome Memory:
  Start: ${first.chromeRssMB}MB (${first.chromeProcessCount} processes)
  End:   ${last.chromeRssMB}MB (${last.chromeProcessCount} processes)
  Growth: ${chromeMemGrowthMB >= 0 ? '+' : ''}${chromeMemGrowthMB}MB
  Rate: ${chromeGrowthPerMinute >= 0 ? '+' : ''}${Math.round(chromeGrowthPerMinute * 100) / 100}MB/min

Leak Detection: ${hasLeak ? '⚠️  POSSIBLE LEAK' : '✓ No leak detected'}
`

    return {
      hasLeak,
      nodeHeapGrowthMB,
      chromeMemGrowthMB,
      report: report.trim()
    }
  }

  /**
   * Print current snapshot
   */
  printSnapshot(snapshot: MemorySnapshot): void {
    const elapsed = Math.round(snapshot.timestamp / 1000)
    console.log(
      `[${elapsed}s] Node: ${snapshot.nodeHeapUsedMB}MB | ` +
      `Chrome: ${snapshot.chromeRssMB}MB (${snapshot.chromeProcessCount} procs)` +
      (snapshot.message ? ` | ${snapshot.message}` : '')
    )
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.snapshots = []
    this.startTime = Date.now()
  }
}

// Singleton instance
export const memoryMonitor = new MemoryMonitor()
