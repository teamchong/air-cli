/**
 * Global Test Setup for Yargs Commands
 *
 * Provides consistent test environment for all command tests.
 * Prevents hanging on stdin, process.exit, and other blocking operations.
 */

import { Readable } from 'stream';

import { beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Store original values
let originalStdin: NodeJS.ReadStream;
let originalExit: typeof process.exit;
let originalStdinResume: typeof process.stdin.resume;
const originalSetTimeout = global.setTimeout;

// Create mock functions to be reused
const mockStdinResume = mock().mockReturnValue(process.stdin);
const mockProcessExit = mock((code?: number) => {
  throw new Error(`process.exit called with code ${code}`);
});

/**
 * Setup test environment before each test
 */
export function setupTestEnvironment(): void {
  beforeEach(() => {
    // Clear mock call history
    mockStdinResume.mockClear();
    mockProcessExit.mockClear();

    // Save originals
    originalStdin = process.stdin;
    originalExit = process.exit;
    originalStdinResume = process.stdin.resume;

    // Mock stdin to prevent hanging
    const mockStdin = new Readable();
    mockStdin.push(null); // EOF immediately
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true,
      configurable: true
    });

    // Mock process.stdin.resume to prevent hanging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.stdin.resume = mockStdinResume as any;

    // Mock process.exit to prevent test process from exiting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.exit = mockProcessExit as any;

    // Mock setTimeout for continuous monitoring commands
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spyOn(global, 'setTimeout').mockImplementation(((fn: any, ms?: number) => {
      if (ms && ms > 5000) {
        // Don't actually wait for long timeouts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return {} as any;
      }
      return originalSetTimeout(fn, ms);
    }) as typeof setTimeout);
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true,
      configurable: true
    });

    process.exit = originalExit;
    process.stdin.resume = originalStdinResume;

    // Note: Bun doesn't have restoreAllMocks, spies are automatically cleaned up
  });
}

/**
 * Mock fs module for file operations
 */
export function mockFileSystem(): void {
  const mockReadFile = mock().mockResolvedValue('// mock file content');
  const mockWriteFile = mock().mockResolvedValue(undefined);
  const mockAccess = mock().mockResolvedValue(undefined);
  const mockMkdir = mock().mockResolvedValue(undefined);
  const mockReaddir = mock().mockResolvedValue([]);
  const mockExistsSync = mock().mockReturnValue(true);
  const mockReadFileSync = mock().mockReturnValue('// mock file content');

  mock.module('fs', () => ({
    promises: {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      access: mockAccess,
      mkdir: mockMkdir,
      readdir: mockReaddir
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync
  }));
}

/**
 * Mock child_process for spawn operations
 */
export function mockChildProcess(): void {
  const mockUnref = mock();
  const mockOn = mock((event, callback) => {
    if (event === 'close') {
      setTimeout(() => callback(0), 100);
    }
  });
  const mockKill = mock();
  const mockStdoutOn = mock();
  const mockStdoutPipe = mock();
  const mockStderrOn = mock();
  const mockStderrPipe = mock();

  const mockSpawn = mock(() => ({
    unref: mockUnref,
    on: mockOn,
    kill: mockKill,
    pid: 12345,
    stdout: {
      on: mockStdoutOn,
      pipe: mockStdoutPipe
    },
    stderr: {
      on: mockStderrOn,
      pipe: mockStderrPipe
    }
  }));

  mock.module('child_process', () => ({
    spawn: mockSpawn
  }));
}

/**
 * Mock BrowserHelper with sensible defaults
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function mockBrowserHelper() {
  const mockPage = {
    goto: mock().mockResolvedValue(undefined),
    url: mock().mockReturnValue('about:blank'),
    click: mock().mockResolvedValue(undefined),
    type: mock().mockResolvedValue(undefined),
    fill: mock().mockResolvedValue(undefined),
    press: mock().mockResolvedValue(undefined),
    hover: mock().mockResolvedValue(undefined),
    selectOption: mock().mockResolvedValue(undefined),
    dragAndDrop: mock().mockResolvedValue(undefined),
    setInputFiles: mock().mockResolvedValue(undefined),
    waitForSelector: mock().mockResolvedValue(undefined),
    screenshot: mock().mockResolvedValue(Buffer.from('fake')),
    pdf: mock().mockResolvedValue(Buffer.from('fake')),
    evaluate: mock().mockResolvedValue(undefined),
    on: mock(),
    close: mock().mockResolvedValue(undefined),
    title: mock().mockResolvedValue('Test Page'),
    content: mock().mockResolvedValue('<html></html>'),
    locator: mock().mockReturnValue({
      click: mock().mockResolvedValue(undefined),
      fill: mock().mockResolvedValue(undefined),
      hover: mock().mockResolvedValue(undefined),
      press: mock().mockResolvedValue(undefined)
    }),
    goBack: mock().mockResolvedValue(undefined),
    reload: mock().mockResolvedValue(undefined),
    setViewportSize: mock().mockResolvedValue(undefined),
    accessibility: {
      snapshot: mock().mockResolvedValue({ role: 'WebArea', children: [] })
    },
    context: mock().mockReturnValue({
      browser: mock().mockReturnValue({})
    })
  };

  const mockContexts = mock().mockReturnValue([
    {
      pages: mock().mockReturnValue([mockPage]),
      newPage: mock().mockResolvedValue(mockPage),
      setDefaultTimeout: mock()
    }
  ]);

  const mockGetBrowser = mock().mockResolvedValue({
    contexts: mockContexts,
    close: mock().mockResolvedValue(undefined)
  });

  const mockGetActivePage = mock().mockResolvedValue(mockPage);

  const mockWithActivePage = mock().mockImplementation(
    async (_port, callback) => {
      return callback(mockPage);
    }
  );

  const mockWithBrowser = mock().mockImplementation(async (_port, callback) => {
    const mockBrowser = {
      contexts: mock().mockReturnValue([
        {
          pages: mock().mockReturnValue([mockPage]),
          newPage: mock().mockResolvedValue(mockPage),
          setDefaultTimeout: mock()
        }
      ]),
      close: mock().mockResolvedValue(undefined)
    };
    return callback(mockBrowser);
  });

  const mockLaunchChrome = mock().mockResolvedValue(undefined);
  const mockIsPortOpen = mock().mockResolvedValue(false);

  mock.module('../../../../lib/browser-helper', () => ({
    BrowserHelper: {
      getBrowser: mockGetBrowser,
      getActivePage: mockGetActivePage,
      withActivePage: mockWithActivePage,
      withBrowser: mockWithBrowser,
      launchChrome: mockLaunchChrome,
      isPortOpen: mockIsPortOpen
    }
  }));

  return mockPage;
}
