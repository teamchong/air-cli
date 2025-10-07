/**
 * Secure Node - mTLS-enabled HTTPS server and client
 *
 * Each node in the mesh runs an HTTPS server that:
 * - Requires client certificates (mutual TLS)
 * - Exposes services via REST-like API
 * - Enforces authorization rules
 *
 * Communication pattern:
 * Node A (client) → HTTPS + mTLS → Node B (server)
 */

import { readFileSync } from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import { createServer, Server as HTTPSServer } from 'https';

import { certificateManager } from './security/certificate-manager';

export interface ServiceHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_req: IncomingMessage, _res: ServerResponse, _params: any): Promise<void>;
}

export interface AuthorizationRule {
  allowedNodes: string[]; // Which nodes can call this service
  allowedMethods?: string[]; // GET, POST, etc.
}

export interface NodeInfo {
  name: string;
  host: string;
  port: number;
  services: string[];
  publicKey?: string;
}

export class SecureNode {
  private server?: HTTPSServer;
  private nodeName: string;
  private routes = new Map<string, ServiceHandler>();
  private authRules = new Map<string, AuthorizationRule>();

  constructor(nodeName: string) {
    this.nodeName = nodeName;
  }

  /**
   * Register a service handler
   */
  registerService(
    path: string,
    handler: ServiceHandler,
    authRule?: AuthorizationRule
  ): void {
    this.routes.set(path, handler);

    if (authRule) {
      this.authRules.set(path, authRule);
    }
  }

  /**
   * Start the secure HTTPS server
   */
  async start(port: number): Promise<void> {
    // Ensure node has valid certificates
    if (!certificateManager.hasNodeCertificate(this.nodeName)) {
      throw new Error(
        `Node ${this.nodeName} does not have certificates. Run: air mesh generate-cert ${this.nodeName}`
      );
    }

    const paths = certificateManager.getNodePaths(this.nodeName);

    // Create HTTPS server with mTLS
    this.server = createServer(
      {
        // Server's certificate (proves server identity)
        key: readFileSync(paths.key),
        cert: readFileSync(paths.cert),

        // Require client certificates (mutual TLS)
        requestCert: true,
        rejectUnauthorized: true,

        // CA to verify client certificates
        ca: readFileSync(paths.ca),

        // Use modern TLS only
        minVersion: 'TLSv1.2'
      },
      (req, res) => this.handleRequest(req, res)
    );

    return new Promise((resolve, reject) => {
      this.server!.listen(port, () => {
        console.log(
          `🔒 Secure node '${this.nodeName}' started on port ${port}`
        );
        console.log('🔐 mTLS enabled - client certificates required');
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise(resolve => {
        this.server!.close(() => {
          console.log(`✅ Node '${this.nodeName}' stopped`);
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming HTTPS requests
   */
  private async handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    try {
      // Extract client identity from certificate
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const socket = req.socket as any;
      const clientCert = socket.getPeerCertificate();
      const clientName = clientCert.subject?.CN || 'unknown';

      console.log(`📨 Request from: ${clientName} → ${req.method} ${req.url}`);

      // Parse URL
      const url = new URL(req.url || '/', 'https://localhost');
      const path = url.pathname;

      // Check if route exists
      const handler = this.routes.get(path);
      if (!handler) {
        this.sendError(res, 404, 'Service not found');
        return;
      }

      // Check authorization
      const authRule = this.authRules.get(path);
      if (
        authRule &&
        !this.isAuthorized(clientName, path, req.method || 'GET', authRule)
      ) {
        console.log(`❌ Unauthorized: ${clientName} → ${path}`);
        this.sendError(res, 403, 'Forbidden: insufficient permissions');
        return;
      }

      // Parse query parameters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Parse body if POST/PUT
      if (req.method === 'POST' || req.method === 'PUT') {
        params.body = await this.parseBody(req);
      }

      // Call handler
      await handler(req, res, params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('❌ Request error:', error.message);
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * Check if client is authorized for this request
   */
  private isAuthorized(
    clientName: string,
    path: string,
    method: string,
    rule: AuthorizationRule
  ): boolean {
    // Check if client is in allowed list
    if (
      !rule.allowedNodes.includes(clientName) &&
      !rule.allowedNodes.includes('*')
    ) {
      return false;
    }

    // Check if method is allowed
    if (rule.allowedMethods && !rule.allowedMethods.includes(method)) {
      return false;
    }

    return true;
  }

  /**
   * Parse request body
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendJSON(res: ServerResponse, data: any, statusCode = 200): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  private sendError(res: ServerResponse, code: number, message: string): void {
    this.sendJSON(res, { success: false, error: message }, code);
  }
}

/**
 * Secure Client - Make requests to other nodes with mTLS
 */
export class SecureClient {
  private nodeName: string;

  constructor(nodeName: string) {
    this.nodeName = nodeName;
  }

  /**
   * Call another node's service
   */
  async call(
    targetHost: string,
    targetPort: number,
    path: string,
    method: 'GET' | 'POST' = 'GET',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const https = require('https');

    // Get this node's certificates
    if (!certificateManager.hasNodeCertificate(this.nodeName)) {
      throw new Error(
        `Node ${this.nodeName} does not have certificates. Run: air mesh generate-cert ${this.nodeName}`
      );
    }

    const paths = certificateManager.getNodePaths(this.nodeName);

    const options = {
      hostname: targetHost,
      port: targetPort,
      path,
      method,

      // Client's certificate (proves client identity)
      key: readFileSync(paths.key),
      cert: readFileSync(paths.cert),

      // Verify server's certificate
      ca: readFileSync(paths.ca),
      rejectUnauthorized: true
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res: IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
            } else {
              resolve(parsed);
            }
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}
