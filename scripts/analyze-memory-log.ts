#!/usr/bin/env bun
/**
 * Analyze memory log from test run
 *
 * Usage: bun run scripts/analyze-memory-log.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const LOG_FILE = path.join(process.cwd(), '.claude/memory-monitor.log')

interface MemoryRecord {
  timestamp: number
  nodeHeapMB: number
  nodeExternalMB: number
  chromeRssMB: number
  chromeProcesses: number
}

function parseLog(filePath: string): MemoryRecord[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.trim().split('\n').slice(2) // Skip header lines

  return lines.map(line => {
    const [timestamp, nodeHeap, nodeExternal, chromeRss, chromeProcs] = line.split(',').map(parseFloat)
    return {
      timestamp,
      nodeHeapMB: nodeHeap,
      nodeExternalMB: nodeExternal,
      chromeRssMB: chromeRss,
      chromeProcesses: chromeProcs
    }
  })
}

function analyze(records: MemoryRecord[]): void {
  if (records.length < 2) {
    console.log('❌ Not enough data points to analyze')
    return
  }

  const first = records[0]
  const last = records[records.length - 1]
  const durationSec = last.timestamp - first.timestamp

  const nodeGrowth = last.nodeHeapMB - first.nodeHeapMB
  const chromeGrowth = last.chromeRssMB - first.chromeRssMB

  // Calculate rates
  const nodeGrowthPerMin = (nodeGrowth / durationSec) * 60
  const chromeGrowthPerMin = (chromeGrowth / durationSec) * 60

  // Find peaks
  const maxNode = Math.max(...records.map(r => r.nodeHeapMB))
  const maxChrome = Math.max(...records.map(r => r.chromeRssMB))

  // Detect leak (growth > 10MB/min for Node, > 50MB/min for Chrome)
  const hasNodeLeak = nodeGrowthPerMin > 10
  const hasChromeLeak = chromeGrowthPerMin > 50

  console.log('\n📊 Memory Analysis Report')
  console.log('═══════════════════════════════════════\n')
  console.log(`Duration: ${durationSec}s (${records.length} samples)\n`)

  console.log('Node.js Memory:')
  console.log(`  Start:  ${first.nodeHeapMB.toFixed(2)}MB`)
  console.log(`  End:    ${last.nodeHeapMB.toFixed(2)}MB`)
  console.log(`  Peak:   ${maxNode.toFixed(2)}MB`)
  console.log(`  Growth: ${nodeGrowth >= 0 ? '+' : ''}${nodeGrowth.toFixed(2)}MB`)
  console.log(`  Rate:   ${nodeGrowthPerMin >= 0 ? '+' : ''}${nodeGrowthPerMin.toFixed(2)}MB/min`)
  console.log(`  Status: ${hasNodeLeak ? '⚠️  POSSIBLE LEAK' : '✓ Normal'}\n`)

  console.log('Chrome Memory:')
  console.log(`  Start:  ${first.chromeRssMB.toFixed(2)}MB (${first.chromeProcesses} processes)`)
  console.log(`  End:    ${last.chromeRssMB.toFixed(2)}MB (${last.chromeProcesses} processes)`)
  console.log(`  Peak:   ${maxChrome.toFixed(2)}MB`)
  console.log(`  Growth: ${chromeGrowth >= 0 ? '+' : ''}${chromeGrowth.toFixed(2)}MB`)
  console.log(`  Rate:   ${chromeGrowthPerMin >= 0 ? '+' : ''}${chromeGrowthPerMin.toFixed(2)}MB/min`)
  console.log(`  Status: ${hasChromeLeak ? '⚠️  POSSIBLE LEAK' : '✓ Normal'}\n`)

  if (hasNodeLeak || hasChromeLeak) {
    console.log('⚠️  Memory leak detected!')
    console.log('\nRecommendations:')
    if (hasNodeLeak) {
      console.log('  - Check for unclosed CDP connections')
      console.log('  - Verify event listeners are properly removed')
      console.log('  - Look for cached references to pages/contexts')
    }
    if (hasChromeLeak) {
      console.log('  - Check for unclosed tabs/pages')
      console.log('  - Verify tab cleanup in test teardown')
      console.log('  - Monitor Chrome process count growth')
    }
  } else {
    console.log('✓ No memory leaks detected')
  }

  console.log('\n═══════════════════════════════════════\n')
}

// Run analysis
try {
  const records = parseLog(LOG_FILE)
  analyze(records)
} catch (error) {
  console.error('Error analyzing log:', error)
  process.exit(1)
}
