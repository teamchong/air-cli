/**
 * Action History Tracker
 *
 * Tracks user actions across commands for the context command to display.
 * Persists history to a temp file to maintain state between command runs.
 */

import * as path from 'path'
import * as os from 'os'

interface Action {
  type: 'navigate' | 'click' | 'type' | 'fill' | 'select' | 'hover' | 'drag'
  target?: string
  value?: string
  timestamp: Date
  tabId?: string
}

class ActionHistory {
  private static instance: ActionHistory
  private actions: Action[] = []
  private maxActions = 10
  private historyFile: string
  private loaded = false
  private loadPromise: Promise<void> | null = null
  private saveTimeout: Timer | null = null

  private constructor() {
    this.historyFile = path.join(os.tmpdir(), 'air-cli-actions.json')
  }

  static getInstance(): ActionHistory {
    if (!ActionHistory.instance) {
      ActionHistory.instance = new ActionHistory()
    }
    return ActionHistory.instance
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = this.loadActions()
    await this.loadPromise
    this.loaded = true
  }

  private async loadActions(): Promise<void> {
    try {
      const file = Bun.file(this.historyFile)
      if (await file.exists()) {
        const data = await file.text()
        const parsed = JSON.parse(data)

        // Convert timestamp strings back to Date objects and filter recent actions
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        this.actions = parsed
          .map((action: any) => ({
            ...action,
            timestamp: new Date(action.timestamp),
          }))
          .filter((action: Action) => action.timestamp > cutoff)
          .slice(-this.maxActions)
      }
    } catch (error) {
      // If loading fails, start fresh
      this.actions = []
    }
  }

  private saveActions(): void {
    // Debounce: delay save by 100ms, cancel previous pending saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        await Bun.write(this.historyFile, JSON.stringify(this.actions))
      } catch (error) {
        // Ignore save errors to prevent breaking commands
      } finally {
        this.saveTimeout = null
      }
    }, 100)
  }

  /**
   * Force any pending saves to complete immediately
   * Useful before process exit to ensure data is persisted
   */
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
      try {
        await Bun.write(this.historyFile, JSON.stringify(this.actions))
      } catch (error) {
        // Ignore save errors
      }
    }
  }

  async addAction(action: Omit<Action, 'timestamp'>): Promise<void> {
    await this.ensureLoaded()

    this.actions.push({
      ...action,
      timestamp: new Date(),
    })

    // Keep only the most recent actions
    if (this.actions.length > this.maxActions) {
      this.actions = this.actions.slice(-this.maxActions)
    }

    // Persist to file (debounced)
    this.saveActions()
  }

  async getRecentActions(count = 5, tabId?: string): Promise<Action[]> {
    await this.ensureLoaded()

    let filtered = this.actions

    if (tabId) {
      filtered = this.actions.filter(a => a.tabId === tabId)
    }

    return filtered.slice(-count)
  }

  async getLastAction(tabId?: string): Promise<Action | undefined> {
    await this.ensureLoaded()

    const actions = tabId
      ? this.actions.filter(a => a.tabId === tabId)
      : this.actions

    return actions[actions.length - 1]
  }

  async clear(): Promise<void> {
    await this.ensureLoaded()
    this.actions = []
    this.saveActions()
  }

  // Method for tests to clear history via CLI
  static async clearForTests(): Promise<void> {
    const instance = ActionHistory.getInstance()
    await instance.clear()
  }

  formatAction(action: Action): string {
    const timeAgo = this.getTimeAgo(action.timestamp)

    switch (action.type) {
      case 'navigate':
        return `Navigated to ${action.target} (${timeAgo})`
      case 'click':
        return `Clicked ${action.target} (${timeAgo})`
      case 'type':
        return `Typed into ${action.target} (${timeAgo})`
      case 'fill':
        return `Filled ${action.target}${action.value ? ` with "${action.value}"` : ''} (${timeAgo})`
      case 'select':
        return `Selected ${action.value} in ${action.target} (${timeAgo})`
      case 'hover':
        return `Hovered over ${action.target} (${timeAgo})`
      case 'drag':
        return `Dragged ${action.target} (${timeAgo})`
      default:
        return `${action.type} ${action.target || ''} (${timeAgo})`
    }
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
}

export const actionHistory = ActionHistory.getInstance()
