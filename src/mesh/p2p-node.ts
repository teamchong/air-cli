/**
 * P2P Node - True bidirectional peer-to-peer with WebSocket + mTLS
 *
 * Unlike REST (request-response), this enables:
 * - Bidirectional communication (either peer can send)
 * - Push notifications (no polling needed)
 * - Persistent connections
 *
 * Architecture:
 * Peer A ←──────── WebSocket ────────→ Peer B
 *        (both can send/receive anytime)
 */

import { readFileSync } from 'fs'
import { createServer, Server as HTTPSServer } from 'https'

import WebSocket, { WebSocketServer } from 'ws'

import { certificateManager } from './security/certificate-manager'

export interface P2PMessage {
  type: string
  data: any
  requestId?: string
}

export interface P2PPeer {
  name: string
  host: string
  port: number
  services: string[]
  socket?: WebSocket
}

export type MessageHandler = (
  message: P2PMessage,
  peer: P2PPeer
) => Promise<any>

export class P2PNode {
  private nodeName: string
  private server?: HTTPSServer
  private wss?: WebSocketServer
  private peers = new Map<string, P2PPeer>()
  private handlers = new Map<string, MessageHandler>()

  constructor(nodeName: string) {
    this.nodeName = nodeName
  }

  /**
   * Start P2P node with WebSocket + mTLS
   */
  async start(port: number): Promise<void> {
    if (!certificateManager.hasNodeCertificate(this.nodeName)) {
      throw new Error(`Missing certificates for ${this.nodeName}`)
    }

    const paths = certificateManager.getNodePaths(this.nodeName)

    // Create HTTPS server for WebSocket upgrade
    this.server = createServer({
      key: readFileSync(paths.key),
      cert: readFileSync(paths.cert),
      requestCert: true,
      rejectUnauthorized: true,
      ca: readFileSync(paths.ca),
      minVersion: 'TLSv1.2',
    })

    // Create WebSocket server on top of HTTPS
    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws: WebSocket, req: any) => {
      // Extract peer identity from mTLS certificate
      const socket = req.socket
      const peerCert = socket.getPeerCertificate()
      const peerName = peerCert.subject?.CN || 'unknown'

      console.log(`🔗 P2P connection established with: ${peerName}`)

      const peer: P2PPeer = {
        name: peerName,
        host: req.socket.remoteAddress || '',
        port: req.socket.remotePort || 0,
        services: [],
        socket: ws,
      }

      this.peers.set(peerName, peer)

      // Handle incoming messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message: P2PMessage = JSON.parse(data.toString())
          await this.handleMessage(message, peer)
        } catch (error: any) {
          console.error(
            `❌ Error handling message from ${peerName}:`,
            error.message
          )
        }
      })

      ws.on('close', () => {
        console.log(`🔌 ${peerName} disconnected`)
        this.peers.delete(peerName)
      })

      ws.on('error', (error: Error) => {
        console.error(`❌ WebSocket error from ${peerName}:`, error.message)
      })
    })

    return new Promise(resolve => {
      this.server!.listen(port, () => {
        console.log(`🔒 P2P node '${this.nodeName}' started on port ${port}`)
        console.log('🔐 WebSocket + mTLS enabled')
        resolve()
      })
    })
  }

  /**
   * Connect to another peer
   */
  async connectToPeer(
    peerName: string,
    host: string,
    port: number
  ): Promise<void> {
    const paths = certificateManager.getNodePaths(this.nodeName)

    const ws = new WebSocket(`wss://${host}:${port}`, {
      key: readFileSync(paths.key),
      cert: readFileSync(paths.cert),
      ca: readFileSync(paths.ca),
      rejectUnauthorized: true,
    })

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log(`✅ Connected to peer: ${peerName}`)

        const peer: P2PPeer = {
          name: peerName,
          host,
          port,
          services: [],
          socket: ws,
        }

        this.peers.set(peerName, peer)

        // Handle messages from this peer
        ws.on('message', async (data: Buffer) => {
          try {
            const message: P2PMessage = JSON.parse(data.toString())
            await this.handleMessage(message, peer)
          } catch (error: any) {
            console.error(`❌ Error from ${peerName}:`, error.message)
          }
        })

        ws.on('close', () => {
          console.log(`🔌 Disconnected from ${peerName}`)
          this.peers.delete(peerName)
        })

        resolve()
      })

      ws.on('error', (error: Error) => {
        reject(new Error(`Failed to connect to ${peerName}: ${error.message}`))
      })
    })
  }

  /**
   * Register a message handler
   */
  on(messageType: string, handler: MessageHandler): void {
    this.handlers.set(messageType, handler)
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    message: P2PMessage,
    peer: P2PPeer
  ): Promise<void> {
    console.log(`📨 Message from ${peer.name}: ${message.type}`)

    // Try exact match first
    let handler = this.handlers.get(message.type)

    // Try wildcard match if no exact match
    if (!handler) {
      for (const [pattern, h] of this.handlers.entries()) {
        if (pattern.endsWith(':*')) {
          const prefix = pattern.slice(0, -2)
          if (message.type.startsWith(prefix + ':')) {
            handler = h
            break
          }
        }
      }
    }

    if (!handler) {
      console.warn(`⚠️  No handler for message type: ${message.type}`)
      return
    }

    try {
      const response = await handler(message, peer)

      // Send response if this was a request
      if (message.requestId && response !== undefined) {
        this.send(peer.name, {
          type: `${message.type}:response`,
          data: response,
          requestId: message.requestId,
        })
      }
    } catch (error: any) {
      console.error('❌ Handler error:', error.message)

      if (message.requestId) {
        this.send(peer.name, {
          type: 'error',
          data: { error: error.message },
          requestId: message.requestId,
        })
      }
    }
  }

  /**
   * Send message to a peer (push, no response expected)
   */
  send(peerName: string, message: P2PMessage): void {
    const peer = this.peers.get(peerName)

    if (!peer || !peer.socket) {
      throw new Error(`Peer ${peerName} not connected`)
    }

    peer.socket.send(JSON.stringify(message))
  }

  /**
   * Send request to peer and wait for response (like RPC)
   */
  async request(
    peerName: string,
    messageType: string,
    data: any
  ): Promise<any> {
    const requestId = crypto.randomUUID()

    const peer = this.peers.get(peerName)
    if (!peer || !peer.socket) {
      throw new Error(`Peer ${peerName} not connected`)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${messageType}`))
      }, 30000)

      // Listen for response
      const responseType = `${messageType}:response`
      const errorType = 'error'

      const handleResponse = (data: Buffer) => {
        try {
          const message: P2PMessage = JSON.parse(data.toString())

          if (message.requestId === requestId) {
            if (message.type === responseType) {
              clearTimeout(timeout)
              peer.socket!.off('message', handleResponse)
              resolve(message.data)
            } else if (message.type === errorType) {
              clearTimeout(timeout)
              peer.socket!.off('message', handleResponse)
              reject(new Error(message.data.error))
            }
          }
        } catch (error: any) {
          reject(error)
        }
      }

      peer.socket?.on('message', handleResponse)

      // Send request
      this.send(peerName, {
        type: messageType,
        data,
        requestId,
      })
    })
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcast(message: P2PMessage): void {
    for (const [peerName, peer] of this.peers.entries()) {
      if (peer.socket) {
        try {
          peer.socket.send(JSON.stringify(message))
        } catch (error: any) {
          console.error(`❌ Failed to send to ${peerName}:`, error.message)
        }
      }
    }
  }

  /**
   * Get list of connected peers
   */
  getPeers(): P2PPeer[] {
    return Array.from(this.peers.values())
  }

  /**
   * Disconnect from a peer
   */
  disconnect(peerName: string): void {
    const peer = this.peers.get(peerName)
    if (peer && peer.socket) {
      peer.socket.close()
      this.peers.delete(peerName)
      console.log(`✅ Disconnected from ${peerName}`)
    }
  }

  /**
   * Stop the P2P node
   */
  async stop(): Promise<void> {
    // Close all peer connections
    for (const [peerName, peer] of this.peers.entries()) {
      if (peer.socket) {
        peer.socket.close()
      }
    }

    this.peers.clear()

    // Close WebSocket server
    if (this.wss) {
      this.wss.close()
    }

    // Close HTTPS server
    if (this.server) {
      return new Promise(resolve => {
        this.server!.close(() => {
          console.log(`✅ P2P node '${this.nodeName}' stopped`)
          resolve()
        })
      })
    }
  }
}
