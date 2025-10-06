#!/bin/bash
# Monitor memory usage during test execution
#
# Usage: ./scripts/monitor-test-memory.sh
# Monitors Chrome and Node.js memory while tests run

LOG_FILE=".claude/memory-monitor.log"
INTERVAL=5 # seconds

echo "Memory Monitor - Starting at $(date)" > "$LOG_FILE"
echo "Timestamp,NodeHeapMB,NodeExternalMB,ChromeRssMB,ChromeProcesses" >> "$LOG_FILE"

echo "🔍 Memory monitoring started (logging to $LOG_FILE)"
echo "   Sampling every ${INTERVAL}s. Press Ctrl+C to stop."

while true; do
  TIMESTAMP=$(date +%s)

  # Get Node.js memory (for bun test process)
  NODE_MEM=$(ps aux | grep "bun test" | grep -v grep | awk '{sum+=$6} END {printf "%.2f", sum/1024}')

  # Get Chrome memory
  CHROME_MEM=$(ps aux | grep -iE "chrome|chromium" | grep -v grep | awk '{sum+=$6} END {printf "%.2f", sum/1024}')
  CHROME_PROCS=$(ps aux | grep -iE "chrome|chromium" | grep -v grep | wc -l | tr -d ' ')

  # Default to 0 if no processes found
  NODE_MEM=${NODE_MEM:-0}
  CHROME_MEM=${CHROME_MEM:-0}
  CHROME_PROCS=${CHROME_PROCS:-0}

  # Log to file
  echo "${TIMESTAMP},${NODE_MEM},0,${CHROME_MEM},${CHROME_PROCS}" >> "$LOG_FILE"

  # Print to console every 30 seconds
  if [ $((TIMESTAMP % 30)) -lt $INTERVAL ]; then
    echo "[$(date +%H:%M:%S)] Node: ${NODE_MEM}MB | Chrome: ${CHROME_MEM}MB (${CHROME_PROCS} procs)"
  fi

  sleep $INTERVAL
done
