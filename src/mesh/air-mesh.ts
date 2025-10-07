/**
 * Simplified Mesh API - Easy-to-use distributed node communication
 *
 * Provides high-level API for secure mesh networking with:
 * - Automatic service discovery (local via mDNS)
 * - Secure mTLS authentication
 * - Simple RPC-style communication
 * - Connection pooling and retry logic
 *
 * Example usage:
 * ```typescript
 * const node = new AirMesh('my-node')
 * await node.start(8080)
 *
 * // Register service
 * node.handle('get-mail', async () => {
 *   return await macOSAutomation.getMailInbox()
 * })
 *
 * // Call remote service
 * const emails = await node.call('mail-node', 'get-mail')
 * ```
 */

import { P2PNode, P2PPeer, P2PMessage } from './p2p-node'
import { SecureNode, SecureClient } from './secure-node'
import { certificateManager } from './security/certificate-manager'

export interface ServiceHandler<T = any> {
  (params?: any, caller?: string): Promise<T>
}

export interface MeshNodeInfo {
  name: string
  host: string
  port: number
  services: string[]
  protocol: 'p2p' | 'https'
}

export interface CallOptions {
  timeout?: number
  retries?: number
}

/**
 * Simplified mesh node - hides complexity of P2P, mTLS, discovery
 */
export class AirMesh {
  private nodeName: string
  private p2pNode: P2PNode
  private httpsNode: SecureNode
  private httpsClient: SecureClient
  private services = new Map<string, ServiceHandler>()
  private knownNodes = new Map<string, MeshNodeInfo>()
  private port?: number

  constructor(nodeName: string) {
    this.nodeName = nodeName
    this.p2pNode = new P2PNode(nodeName)
    this.httpsNode = new SecureNode(nodeName)
    this.httpsClient = new SecureClient(nodeName)
  }

  /**
   * Start the mesh node
   */
  async start(port: number): Promise<void> {
    this.port = port

    // Ensure certificates exist
    await certificateManager.initialize()
    if (!certificateManager.hasNodeCertificate(this.nodeName)) {
      await certificateManager.generateNodeCertificate(this.nodeName)
    }

    // Start both P2P (for local) and HTTPS (for internet)
    await Promise.all([
      this.p2pNode.start(port),
      this.httpsNode.start(port + 1), // HTTPS on port+1
    ])

    // Register internal routes for HTTPS
    this.setupHTTPSRoutes()

    // Register P2P message handlers
    this.setupP2PHandlers()

    console.log(`🌐 Mesh node '${this.nodeName}' started`)
    console.log(`   P2P port: ${port}`)
    console.log(`   HTTPS port: ${port + 1}`)
  }

  /**
   * Register a service handler
   */
  handle<T = any>(serviceName: string, handler: ServiceHandler<T>): void {
    this.services.set(serviceName, handler)
    console.log(`📋 Registered service: ${serviceName}`)
  }

  /**
   * Call a service on another node
   */
  async call<T = any>(
    nodeName: string,
    serviceName: string,
    params?: any,
    options: CallOptions = {}
  ): Promise<T> {
    const { timeout = 30000, retries = 3 } = options

    // Find node info
    const nodeInfo = this.knownNodes.get(nodeName)

    if (!nodeInfo) {
      throw new Error(
        `Node '${nodeName}' not found. Use connect() first or enable discovery.`
      )
    }

    // Try P2P first (faster for local), fall back to HTTPS
    let lastError: Error | undefined

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (nodeInfo.protocol === 'p2p') {
          return await this.callP2P<T>(nodeName, serviceName, params, timeout)
        } else {
          return await this.callHTTPS<T>(nodeInfo, serviceName, params)
        }
      } catch (error: any) {
        lastError = error
        if (attempt < retries - 1) {
          console.log(`⚠️  Retry ${attempt + 1}/${retries} for ${serviceName}`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    throw lastError || new Error(`Failed to call ${serviceName} on ${nodeName}`)
  }

  /**
   * Connect to another node (manual)
   */
  async connect(nodeName: string, host: string, port: number): Promise<void> {
    try {
      // Try P2P connection first
      await this.p2pNode.connectToPeer(nodeName, host, port)

      this.knownNodes.set(nodeName, {
        name: nodeName,
        host,
        port,
        services: [],
        protocol: 'p2p',
      })

      console.log(`✅ Connected to ${nodeName} via P2P`)
    } catch (p2pError) {
      // Fall back to HTTPS
      console.log('⚠️  P2P failed, trying HTTPS...')

      this.knownNodes.set(nodeName, {
        name: nodeName,
        host,
        port: port + 1, // HTTPS is on port+1
        services: [],
        protocol: 'https',
      })

      // Test HTTPS connection
      try {
        await this.httpsClient.call(host, port + 1, '/health')
        console.log(`✅ Connected to ${nodeName} via HTTPS`)
      } catch (httpsError) {
        this.knownNodes.delete(nodeName)
        throw new Error(
          `Failed to connect to ${nodeName}: P2P and HTTPS both failed`
        )
      }
    }
  }

  /**
   * Disconnect from a node
   */
  disconnect(nodeName: string): void {
    this.p2pNode.disconnect(nodeName)
    this.knownNodes.delete(nodeName)
    console.log(`✅ Disconnected from ${nodeName}`)
  }

  /**
   * List all connected nodes
   */
  listNodes(): MeshNodeInfo[] {
    return Array.from(this.knownNodes.values())
  }

  /**
   * List services registered on this node
   */
  listServices(): string[] {
    return Array.from(this.services.keys())
  }

  /**
   * Broadcast a message to all connected nodes
   */
  broadcast(serviceName: string, params?: any): void {
    const message: P2PMessage = {
      type: `service:${serviceName}`,
      data: params,
    }

    this.p2pNode.broadcast(message)
  }

  /**
   * Stop the mesh node
   */
  async stop(): Promise<void> {
    await Promise.all([this.p2pNode.stop(), this.httpsNode.stop()])
    this.knownNodes.clear()
    console.log(`✅ Mesh node '${this.nodeName}' stopped`)
  }

  /**
   * Call service via P2P
   */
  private async callP2P<T>(
    nodeName: string,
    serviceName: string,
    params: any,
    timeout: number
  ): Promise<T> {
    return await this.p2pNode.request(
      nodeName,
      `service:${serviceName}`,
      params
    )
  }

  /**
   * Call service via HTTPS
   */
  private async callHTTPS<T>(
    nodeInfo: MeshNodeInfo,
    serviceName: string,
    params: any
  ): Promise<T> {
    const result = await this.httpsClient.call(
      nodeInfo.host,
      nodeInfo.port,
      `/service/${serviceName}`,
      'POST',
      params
    )

    return result.data
  }

  /**
   * Setup HTTPS routes for REST-like API
   */
  private setupHTTPSRoutes(): void {
    // Health check
    this.httpsNode.registerService('/health', async (req, res) => {
      this.httpsNode.sendJSON(res, {
        success: true,
        node: this.nodeName,
        services: this.listServices(),
      })
    })

    // Service call endpoint
    this.httpsNode.registerService(
      '/service/:name',
      async (req, res, params) => {
        const serviceName = req.url?.split('/')[2]

        if (!serviceName) {
          this.httpsNode.sendJSON(
            res,
            { success: false, error: 'Missing service name' },
            400
          )
          return
        }

        const handler = this.services.get(serviceName)

        if (!handler) {
          this.httpsNode.sendJSON(
            res,
            { success: false, error: `Service '${serviceName}' not found` },
            404
          )
          return
        }

        try {
          // Extract client name from certificate
          const socket = req.socket as any
          const clientCert = socket.getPeerCertificate()
          const caller = clientCert.subject?.CN

          const result = await handler(params.body, caller)
          this.httpsNode.sendJSON(res, { success: true, data: result })
        } catch (error: any) {
          this.httpsNode.sendJSON(
            res,
            { success: false, error: error.message },
            500
          )
        }
      }
    )
  }

  /**
   * Setup P2P message handlers
   */
  private setupP2PHandlers(): void {
    // Handle service calls
    this.p2pNode.on('service:*', async (message: P2PMessage, peer: P2PPeer) => {
      // Extract service name from message type
      const serviceName = message.type.replace('service:', '')

      const handler = this.services.get(serviceName)

      if (!handler) {
        throw new Error(`Service '${serviceName}' not found`)
      }

      return await handler(message.data, peer.name)
    })

    // Pattern matching for service:* messages
    const originalOn = this.p2pNode.on.bind(this.p2pNode)
    this.p2pNode.on = (messageType: string, handler: any) => {
      if (messageType === 'service:*') {
        // Register handler for all service:* patterns
        for (const serviceName of this.services.keys()) {
          originalOn(`service:${serviceName}`, handler)
        }
      } else {
        originalOn(messageType, handler)
      }
    }
  }

  /**
   * Get node information
   */
  getNodeInfo(): MeshNodeInfo {
    return {
      name: this.nodeName,
      host: 'localhost',
      port: this.port || 0,
      services: this.listServices(),
      protocol: 'p2p',
    }
  }
}
