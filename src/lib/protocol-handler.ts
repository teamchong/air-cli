/**
 * Protocol Handler - Parse air:// and air+command:// URLs
 *
 * Supports two protocol patterns:
 * 1. air://<url> - Simple URL opening
 *    - air://https://google.com → air open https://google.com
 *    - air://example.com → air open https://example.com
 *
 * 2. air+<command>://<params> - Command-specific protocols
 *    - air+screenshot://https://example.com → air open + screenshot
 *    - air+console://https://google.com?monitor=true → air open + console --monitor
 *    - air+tabs://new?url=https://github.com → air tabs new --url=...
 */

export interface ProtocolCommand {
  command: string;
  args: string[];
}

export class ProtocolHandler {
  /**
   * Parse a protocol URL and return command(s) to execute
   */
  static parse(protocolUrl: string): ProtocolCommand[] {
    // Validate input
    if (!protocolUrl || typeof protocolUrl !== 'string') {
      throw new Error('Invalid protocol URL');
    }

    // Check if it's an air protocol
    if (!protocolUrl.startsWith('air://') && !protocolUrl.startsWith('air+')) {
      throw new Error(
        `Invalid protocol: ${protocolUrl}. Must start with air:// or air+`
      );
    }

    // Parse simple air:// URLs
    if (protocolUrl.startsWith('air://')) {
      return this.parseSimpleProtocol(protocolUrl);
    }

    // Parse air+command:// URLs
    return this.parseCommandProtocol(protocolUrl);
  }

  /**
   * Parse simple air://<url> protocol
   * Examples:
   *   air://https://google.com → air open https://google.com
   *   air://example.com → air open https://example.com
   */
  private static parseSimpleProtocol(url: string): ProtocolCommand[] {
    // Remove air:// prefix
    const urlPart = url.slice('air://'.length);

    if (!urlPart) {
      throw new Error('air:// protocol requires a URL');
    }

    // Add https:// if no protocol specified
    let targetUrl = urlPart;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    return [
      {
        command: 'open',
        args: [targetUrl]
      }
    ];
  }

  /**
   * Parse air+<command>://<params> protocol
   * Examples:
   *   air+screenshot://https://example.com → air open + screenshot
   *   air+console://https://google.com?monitor=true → air open + console --monitor
   *   air+tabs://new?url=https://github.com → air tabs new --url=...
   *   air+navigate://back → air back
   *   air+snapshot:// → air snapshot
   */
  private static parseCommandProtocol(url: string): ProtocolCommand[] {
    // Extract command from air+<command>://
    const match = url.match(/^air\+([^:]+):\/\/(.*)$/);
    if (!match) {
      throw new Error(`Invalid air+command protocol format: ${url}`);
    }

    const [, command, params] = match;

    // Map of supported commands
    const commandMap: Record<string, (_params: string) => ProtocolCommand[]> = {
      screenshot: this.parseScreenshotProtocol.bind(this),
      console: this.parseConsoleProtocol.bind(this),
      snapshot: this.parseSnapshotProtocol.bind(this),
      tabs: this.parseTabsProtocol.bind(this),
      navigate: this.parseNavigateProtocol.bind(this),
      network: this.parseNetworkProtocol.bind(this),
      pdf: this.parsePdfProtocol.bind(this),
      click: this.parseClickProtocol.bind(this),
      type: this.parseTypeProtocol.bind(this),
      fill: this.parseFillProtocol.bind(this),
      eval: this.parseEvalProtocol.bind(this),
      exec: this.parseExecProtocol.bind(this)
    };

    const handler = commandMap[command];
    if (!handler) {
      throw new Error(
        `Unsupported command: ${command}. Supported: ${Object.keys(commandMap).join(', ')}`
      );
    }

    return handler(params);
  }

  /**
   * Parse air+screenshot://<url>?path=...
   */
  private static parseScreenshotProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute screenshot
    const screenshotArgs: string[] = [];
    if (queryParams.path) {
      screenshotArgs.push(queryParams.path);
    }
    if (queryParams.fullpage === 'true') {
      screenshotArgs.push('--full-page');
    }

    commands.push({
      command: 'screenshot',
      args: screenshotArgs
    });

    return commands;
  }

  /**
   * Parse air+console://<url>?monitor=true
   */
  private static parseConsoleProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute console
    const consoleArgs: string[] = [];
    if (queryParams.monitor === 'true') {
      consoleArgs.push('--monitor');
    }
    if (queryParams.filter) {
      consoleArgs.push('--filter', queryParams.filter);
    }

    commands.push({
      command: 'console',
      args: consoleArgs
    });

    return commands;
  }

  /**
   * Parse air+snapshot://<url>
   */
  private static parseSnapshotProtocol(params: string): ProtocolCommand[] {
    const { url } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    commands.push({
      command: 'snapshot',
      args: []
    });

    return commands;
  }

  /**
   * Parse air+tabs://new?url=https://github.com
   * Parse air+tabs://close?all=true
   * Parse air+tabs://list
   */
  private static parseTabsProtocol(params: string): ProtocolCommand[] {
    const { path, queryParams } = this.parseUrlAndQuery(params);

    // Extract action from path
    const action = path || 'list';
    const args = ['tabs', action];

    // Add query params as flags
    if (queryParams.url) {
      args.push('--url', queryParams.url);
    }
    if (queryParams.index) {
      args.push('--index', queryParams.index);
    }
    if (queryParams.all === 'true') {
      args.push('--all');
    }

    return [
      {
        command: args[0],
        args: args.slice(1)
      }
    ];
  }

  /**
   * Parse air+navigate://back or air+navigate://<url>
   */
  private static parseNavigateProtocol(params: string): ProtocolCommand[] {
    const { path, url } = this.parseUrlAndQuery(params);

    // Special commands: back, forward
    if (path === 'back' || params === 'back') {
      return [
        {
          command: 'back',
          args: []
        }
      ];
    }

    if (path === 'forward' || params === 'forward') {
      return [
        {
          command: 'forward',
          args: []
        }
      ];
    }

    // Regular URL navigation
    if (url) {
      return [
        {
          command: 'navigate',
          args: [url]
        }
      ];
    }

    throw new Error('air+navigate:// requires a URL or back/forward command');
  }

  /**
   * Parse air+network://<url>?filter=api
   */
  private static parseNetworkProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute network
    const networkArgs: string[] = [];
    if (queryParams.filter) {
      networkArgs.push('--filter', queryParams.filter);
    }
    if (queryParams.method) {
      networkArgs.push('--method', queryParams.method);
    }

    commands.push({
      command: 'network',
      args: networkArgs
    });

    return commands;
  }

  /**
   * Parse air+pdf://<url>?path=...
   */
  private static parsePdfProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute pdf
    const pdfArgs: string[] = [];
    if (queryParams.path) {
      pdfArgs.push(queryParams.path);
    }

    commands.push({
      command: 'pdf',
      args: pdfArgs
    });

    return commands;
  }

  /**
   * Parse air+click://<url>?selector=.button
   */
  private static parseClickProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute click
    if (!queryParams.selector) {
      throw new Error('air+click:// requires selector parameter');
    }

    commands.push({
      command: 'click',
      args: [queryParams.selector]
    });

    return commands;
  }

  /**
   * Parse air+type://<url>?selector=#input&text=hello
   */
  private static parseTypeProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute type
    if (!queryParams.selector || !queryParams.text) {
      throw new Error('air+type:// requires selector and text parameters');
    }

    commands.push({
      command: 'type',
      args: [queryParams.selector, queryParams.text]
    });

    return commands;
  }

  /**
   * Parse air+fill://<url>?email=user@example.com&password=secret
   */
  private static parseFillProtocol(params: string): ProtocolCommand[] {
    const { url, queryParams } = this.parseUrlAndQuery(params);
    const commands: ProtocolCommand[] = [];

    // Open URL if provided
    if (url) {
      commands.push({
        command: 'open',
        args: [url]
      });
    }

    // Execute fill
    const fillArgs: string[] = [];
    for (const [key, value] of Object.entries(queryParams)) {
      if (key !== 'url') {
        fillArgs.push(`${key}=${value}`);
      }
    }

    if (fillArgs.length === 0) {
      throw new Error('air+fill:// requires field=value parameters');
    }

    commands.push({
      command: 'fill',
      args: fillArgs
    });

    return commands;
  }

  /**
   * Parse air+eval://?code=document.title
   */
  private static parseEvalProtocol(params: string): ProtocolCommand[] {
    const { queryParams } = this.parseUrlAndQuery(params);

    if (!queryParams.code) {
      throw new Error('air+eval:// requires code parameter');
    }

    return [
      {
        command: 'eval',
        args: [queryParams.code]
      }
    ];
  }

  /**
   * Parse air+exec://?file=/tmp/script.js
   */
  private static parseExecProtocol(params: string): ProtocolCommand[] {
    const { queryParams } = this.parseUrlAndQuery(params);

    if (!queryParams.file) {
      throw new Error('air+exec:// requires file parameter');
    }

    return [
      {
        command: 'exec',
        args: [queryParams.file]
      }
    ];
  }

  /**
   * Parse URL and query parameters
   * Examples:
   *   "https://example.com?foo=bar" → { url: "https://example.com", queryParams: { foo: "bar" } }
   *   "back" → { path: "back", queryParams: {} }
   *   "new?url=https://github.com" → { path: "new", queryParams: { url: "..." } }
   */
  private static parseUrlAndQuery(params: string): {
    url?: string;
    path?: string;
    queryParams: Record<string, string>;
  } {
    if (!params) {
      return { queryParams: {} };
    }

    // Split by ? to separate path/URL from query
    const [pathOrUrl, queryString] = params.split('?');

    // Parse query parameters
    const queryParams: Record<string, string> = {};
    if (queryString) {
      const urlParams = new URLSearchParams(queryString);
      for (const [key, value] of urlParams.entries()) {
        queryParams[key] = value;
      }
    }

    // Check if pathOrUrl is a full URL
    if (
      pathOrUrl.startsWith('http://') ||
      pathOrUrl.startsWith('https://') ||
      pathOrUrl.includes('.')
    ) {
      let url = pathOrUrl;
      // Add https:// if no protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      return { url, queryParams };
    }

    // Otherwise it's a path/command
    return { path: pathOrUrl, queryParams };
  }

  /**
   * Convert protocol commands to CLI argument array
   */
  static toCliArgs(commands: ProtocolCommand[]): string[] {
    const args: string[] = [];

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      args.push(cmd.command);
      args.push(...cmd.args);

      // Add && between commands (shell will execute sequentially)
      if (i < commands.length - 1) {
        args.push('&&');
      }
    }

    return args;
  }
}
