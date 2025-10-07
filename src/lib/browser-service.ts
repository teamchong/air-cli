import { Browser, Page } from 'playwright';
import type { BrowserContext } from 'playwright';

/**
 * Interface for browser operations
 * This abstraction allows for easy testing and dependency injection
 */
/* eslint-disable no-unused-vars */
export interface IBrowserService {
  /**
   * Get browser connection
   */
  getBrowser(port?: number): Promise<Browser>;

  /**
   * Execute an action with auto-disconnect
   */
  withBrowser<T>(
    port: number,
    action: (browser: Browser) => Promise<T>
  ): Promise<T>;

  /**
   * Get all pages from all contexts
   */
  getPages(port?: number): Promise<Page[]>;

  /**
   * Get a specific page by index
   */
  getPage(index?: number, port?: number): Promise<Page | null>;

  /**
   * Get the active page (first non-chrome:// page)
   */
  getActivePage(port?: number): Promise<Page>;

  /**
   * Execute an action with active page and auto-disconnect
   */
  withActivePage<T>(
    port: number,
    action: (page: Page) => Promise<T>
  ): Promise<T>;

  /**
   * Get all contexts
   */
  getContexts(port?: number): Promise<BrowserContext[]>;

  /**
   * Check if browser is running on port
   */
  isPortOpen(port: number): Promise<boolean>;

  /**
   * Launch Chrome with debugging port
   */
  launchChrome(
    port?: number,
    browserPathOrType?: string,
    url?: string
  ): Promise<void>;

  /**
   * Create new tab via HTTP API
   */
  createTabHTTP(port: number, url: string): Promise<boolean>;
}
/* eslint-enable no-unused-vars */

/**
 * Mock browser service for testing
 */
export class MockBrowserService implements IBrowserService {
  private mockBrowser: Browser;
  private mockPage: Page;

  constructor(mockBrowser?: Browser, mockPage?: Page) {
    this.mockBrowser = (mockBrowser || {
      contexts: (): BrowserContext[] => [],
      close: (): Promise<void> => Promise.resolve(),
      newContext: (): Promise<BrowserContext> =>
        Promise.resolve({
          newPage: (): Promise<Page> => Promise.resolve(this.mockPage),
          setDefaultTimeout: (): void => {},
          pages: (): Page[] => []
        } as unknown as BrowserContext)
    }) as Browser;

    this.mockPage = (mockPage || {
      url: (): string => 'https://example.com',
      accessibility: {
        snapshot: (): Promise<null> => Promise.resolve(null)
      },
      click: (): Promise<void> => Promise.resolve(),
      type: (): Promise<void> => Promise.resolve(),
      goto: (): Promise<void> => Promise.resolve()
    }) as Page;
  }

  async getBrowser(_port = 9222): Promise<Browser> {
    return this.mockBrowser;
  }

  async withBrowser<T>(
    _port: number,
    action: (_browser: Browser) => Promise<T>
  ): Promise<T> {
    return action(this.mockBrowser);
  }

  async getPages(_port = 9222): Promise<Page[]> {
    return [this.mockPage];
  }

  async getPage(index = 0, _port = 9222): Promise<Page | null> {
    return index === 0 ? this.mockPage : null;
  }

  async getActivePage(_port = 9222): Promise<Page> {
    return this.mockPage;
  }

  async withActivePage<T>(
    _port: number,
    action: (_page: Page) => Promise<T>
  ): Promise<T> {
    return action(this.mockPage);
  }

  async getContexts(_port = 9222): Promise<BrowserContext[]> {
    return [];
  }

  async isPortOpen(_port: number): Promise<boolean> {
    return true;
  }

  async launchChrome(
    _port = 9222,
    _browserPathOrType?: string,
    _url?: string
  ): Promise<void> {
    // Mock implementation - does nothing
  }

  async createTabHTTP(_port: number, _url: string): Promise<boolean> {
    return true;
  }
}
