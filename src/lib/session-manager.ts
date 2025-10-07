import { mkdirSync } from 'fs'
import { join } from 'path'

import { BrowserHelper } from './browser-helper'
import { PlatformHelper } from './platform-helper'

const CLAUDE_DIR = PlatformHelper.getClaudeDir()
const SESSIONS_DIR = join(CLAUDE_DIR, 'playwright-sessions')

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SessionData {
  name: string
  createdAt: string
  updatedAt: string
  url: string
  port: number
  cookies: any[]
  localStorage: Record<string, any>
  sessionStorage: Record<string, any>
  viewportSize?: { width: number; height: number }
  userAgent?: string
  metadata?: {
    description?: string
    tags?: string[]
  }
}

export class SessionManager {
  private static async ensureSessionsDir(): Promise<void> {
    PlatformHelper.getOrCreateClaudeDir()
    const dirExists = await Bun.file(SESSIONS_DIR).exists()
    if (!dirExists) {
      mkdirSync(SESSIONS_DIR, { recursive: true })
    }
  }

  static getSessionPath(name: string): string {
    return join(SESSIONS_DIR, `${name}.json`)
  }

  static async saveSession(
    name: string,
    port: number = 9222,
    description?: string
  ): Promise<void> {
    await this.ensureSessionsDir()

    try {
      await BrowserHelper.withBrowser(port, async browser => {
        const contexts = browser.contexts()
        if (contexts.length === 0) {
          throw new Error('No browser context found')
        }

        const context = contexts[0]
        const pages = context.pages()
        if (pages.length === 0) {
          throw new Error('No pages found in browser')
        }

        const page = pages[0]

        // Get current state
        const url = page.url()
        const cookies = await context.cookies()
        const viewportSize = page.viewportSize()
        const userAgent = await page.evaluate(() => {
          const win = (globalThis as any).window
          return win.navigator.userAgent
        })

        // Get localStorage and sessionStorage
        const localStorage = await page.evaluate(() => {
          const storage: Record<string, any> = {}
          const win = (globalThis as any).window
          for (let i = 0; i < win.localStorage.length; i++) {
            const key = win.localStorage.key(i)
            if (key) {
              storage[key] = win.localStorage.getItem(key)
            }
          }
          return storage
        })

        const sessionStorage = await page.evaluate(() => {
          const storage: Record<string, any> = {}
          const win = (globalThis as any).window
          for (let i = 0; i < win.sessionStorage.length; i++) {
            const key = win.sessionStorage.key(i)
            if (key) {
              storage[key] = win.sessionStorage.getItem(key)
            }
          }
          return storage
        })

        const sessionPath = this.getSessionPath(name)
        const sessionFile = Bun.file(sessionPath)
        const fileExists = await sessionFile.exists()

        const sessionData: SessionData = {
          name,
          createdAt: fileExists
            ? (await sessionFile.json()).createdAt
            : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          url,
          port,
          cookies,
          localStorage,
          sessionStorage,
          viewportSize: viewportSize || undefined,
          userAgent,
          metadata: {
            description,
          },
        }

        await Bun.write(sessionPath, JSON.stringify(sessionData, null, 2))
      })
    } catch (error: any) {
      throw new Error(`Failed to save session: ${error.message}`)
    }
  }

  static async loadSession(name: string, port: number = 9222): Promise<void> {
    const sessionPath = this.getSessionPath(name)
    const sessionFile = Bun.file(sessionPath)

    if (!(await sessionFile.exists())) {
      throw new Error(`Session '${name}' not found`)
    }

    try {
      const sessionData: SessionData = await sessionFile.json()

      await BrowserHelper.withBrowser(port, async browser => {
        const contexts = browser.contexts()
        const context =
          contexts.length > 0 ? contexts[0] : await browser.newContext()

        // Set cookies
        if (sessionData.cookies.length > 0) {
          await context.addCookies(sessionData.cookies)
        }

        // Set viewport if available
        const pages = context.pages()
        const page = pages.length > 0 ? pages[0] : await context.newPage()

        if (sessionData.viewportSize) {
          await page.setViewportSize(sessionData.viewportSize)
        }

        // Navigate to saved URL
        await page.goto(sessionData.url)

        // Restore localStorage
        if (
          sessionData.localStorage &&
          Object.keys(sessionData.localStorage).length > 0
        ) {
          await page.evaluate(localStorage => {
            const win = (globalThis as any).window
            for (const [key, value] of Object.entries(localStorage)) {
              if (value !== null) {
                win.localStorage.setItem(key, String(value))
              }
            }
          }, sessionData.localStorage)
        }

        // Restore sessionStorage
        if (
          sessionData.sessionStorage &&
          Object.keys(sessionData.sessionStorage).length > 0
        ) {
          await page.evaluate(sessionStorage => {
            const win = (globalThis as any).window
            for (const [key, value] of Object.entries(sessionStorage)) {
              if (value !== null) {
                win.sessionStorage.setItem(key, String(value))
              }
            }
          }, sessionData.sessionStorage)
        }

        // Refresh to apply storage changes
        await page.reload()
      })
    } catch (error: any) {
      throw new Error(`Failed to load session: ${error.message}`)
    }
  }

  static async listSessions(): Promise<SessionData[]> {
    await this.ensureSessionsDir()

    try {
      const glob = new Bun.Glob('*.json')
      const sessions: SessionData[] = []

      for await (const file of glob.scan(SESSIONS_DIR)) {
        try {
          const sessionData: SessionData = await Bun.file(
            join(SESSIONS_DIR, file)
          ).json()
          sessions.push(sessionData)
        } catch {
          // Skip corrupted session files
        }
      }

      // Sort by most recently updated
      return sessions.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    } catch {
      return []
    }
  }

  static async deleteSession(name: string): Promise<void> {
    const sessionPath = this.getSessionPath(name)
    const sessionFile = Bun.file(sessionPath)

    if (!(await sessionFile.exists())) {
      throw new Error(`Session '${name}' not found`)
    }

    try {
      await Bun.$`rm ${sessionPath}`
    } catch (error: any) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }
  }

  static async sessionExists(name: string): Promise<boolean> {
    return await Bun.file(this.getSessionPath(name)).exists()
  }
}
