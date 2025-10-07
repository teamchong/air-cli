/**
 * Air Node - Simplified P2P Mesh for Agentic Information Retrieval
 *
 * Features:
 * - Local network: Auto-discovery via mDNS (like AirDrop)
 * - Internet: Optional relay server for NAT traversal
 * - Security: mTLS for all communication
 * - Simple API: node.handle() and node.call()
 */

import Bonjour, { type Service } from 'bonjour-service'

import { P2PNode, P2PMessage, P2PPeer } from './p2p-node'
import { certificateManager } from './security/certificate-manager'

export interface AirNodeOptions {
  relay?: string // Optional relay server URL (wss://...)
  port?: number // Port to listen on (default: random)
  discoveryName?: string // mDNS service name (default: nodeName)
}

export interface ServiceHandler {
  (...args: any[]): Promise<any> | any
}

/**
 * Simplified P2P mesh node for distributed AIR
 */
export class AirNode {
  private nodeName: string
  private p2pNode: P2PNode
  private bonjour?: Bonjour
  private mdnsService?: Service
  private port?: number
  private services = new Map<string, ServiceHandler>()
  private options: AirNodeOptions

  constructor(nodeName: string, options: AirNodeOptions = {}) {
    this.nodeName = nodeName
    this.options = options
    this.p2pNode = new P2PNode(nodeName)
  }

  /**
   * Start the node (server + discovery)
   */
  async start(): Promise<void> {
    // Ensure certificates exist
    await certificateManager.initialize()
    if (!certificateManager.hasNodeCertificate(this.nodeName)) {
      console.log(`📜 Generating certificate for ${this.nodeName}...`)
      await certificateManager.generateNodeCertificate(this.nodeName)
    }

    // Start P2P server
    this.port = this.options.port || this.generateRandomPort()
    await this.p2pNode.start(this.port)

    // Register internal message handlers
    this.registerInternalHandlers()

    // Start mDNS discovery (local network)
    this.startMDNSDiscovery()

    // Connect to relay if specified (for internet connectivity)
    if (this.options.relay) {
      await this.connectToRelay()
    }

    console.log(`✅ Air node '${this.nodeName}' started`)
    console.log(`🔗 Local: port ${this.port}`)
    if (this.options.relay) {
      console.log(`🌐 Internet: via relay ${this.options.relay}`)
    }
  }

  /**
   * Register a service handler
   */
  handle(serviceName: string, handler: ServiceHandler): void {
    this.services.set(serviceName, handler)
    console.log(`📋 Registered service: ${serviceName}`)
  }

  /**
   * Call a service on another node
   */
  async call(
    nodeName: string,
    serviceName: string,
    ...args: any[]
  ): Promise<any> {
    // Check if peer is connected
    const peers = this.p2pNode.getPeers()
    const peer = peers.find(p => p.name === nodeName)

    if (!peer) {
      // Try to discover and connect
      await this.discoverAndConnect(nodeName)
    }

    // Call the service via P2P
    const response = await this.p2pNode.request(
      nodeName,
      `service:${serviceName}`,
      {
        args,
      }
    )

    return response
  }

  /**
   * Get list of available nodes
   */
  getNodes(): string[] {
    return this.p2pNode.getPeers().map(p => p.name)
  }

  /**
   * Get services exposed by this node
   */
  getServices(): string[] {
    return Array.from(this.services.keys())
  }

  /**
   * Stop the node
   */
  async stop(): Promise<void> {
    // Stop mDNS
    if (this.mdnsService) {
      this.mdnsService.stop?.()
    }
    if (this.bonjour) {
      this.bonjour.destroy?.()
    }

    // Stop P2P node
    await this.p2pNode.stop()

    console.log(`✅ Air node '${this.nodeName}' stopped`)
  }

  /**
   * Register internal P2P message handlers
   */
  private registerInternalHandlers(): void {
    // Handle service calls
    this.p2pNode.on('service:*', async (message: P2PMessage, peer: P2PPeer) => {
      const serviceType = message.type.replace('service:', '')
      const handler = this.services.get(serviceType)

      if (!handler) {
        throw new Error(`Service not found: ${serviceType}`)
      }

      const { args } = message.data
      const result = await handler(...(args || []))
      return result
    })

    // Handle discovery requests
    this.p2pNode.on('discovery:ping', async () => {
      return {
        name: this.nodeName,
        services: Array.from(this.services.keys()),
        port: this.port,
      }
    })
  }

  /**
   * Start mDNS discovery for local network
   */
  private startMDNSDiscovery(): void {
    try {
      this.bonjour = new Bonjour()

      // Advertise this node
      this.mdnsService = this.bonjour.publish({
        name: this.options.discoveryName || this.nodeName,
        type: 'air-node',
        port: this.port!,
        txt: {
          services: Array.from(this.services.keys()).join(','),
        },
      })

      console.log(`🔍 mDNS discovery started: ${this.nodeName}`)

      // Browse for other nodes
      this.bonjour.find({ type: 'air-node' }, (service: any) => {
        if (service.name === this.nodeName) return // Skip self

        console.log(
          `🔍 Discovered node: ${service.name} at ${service.host}:${service.port}`
        )

        // Auto-connect to discovered nodes
        this.p2pNode
          .connectToPeer(service.name, service.host, service.port)
          .catch((err: Error) => {
            console.error(
              `❌ Failed to connect to ${service.name}:`,
              err.message
            )
          })
      })
    } catch (error: any) {
      console.warn(`⚠️  mDNS discovery failed: ${error.message}`)
      console.warn(
        '💡 Local discovery disabled. Use relay for internet connectivity.'
      )
    }
  }

  /**
   * Connect to relay server for internet connectivity
   */
  private async connectToRelay(): Promise<void> {
    // TODO: Implement relay connection
    // For now, log a placeholder
    console.log(
      `🌐 Relay connection not yet implemented: ${this.options.relay}`
    )
  }

  /**
   * Discover and connect to a node by name
   */
  private async discoverAndConnect(nodeName: string): Promise<void> {
    // Try mDNS discovery first
    return new Promise((resolve, reject) => {
      if (!this.bonjour) {
        return reject(new Error('Discovery not available'))
      }

      const browser = this.bonjour.find({ type: 'air-node' })

      browser.on('up', (service: any) => {
        if (service.name === nodeName) {
          browser.stop()

          this.p2pNode
            .connectToPeer(nodeName, service.host, service.port)
            .then(resolve)
            .catch(reject)
        }
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        browser.stop()
        reject(new Error(`Node not found: ${nodeName}`))
      }, 5000)
    })
  }

  /**
   * Generate a random port for the node
   */
  private generateRandomPort(): number {
    return 10000 + Math.floor(Math.random() * 10000)
  }
}
