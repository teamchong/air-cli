/**
 * Certificate Manager - mTLS Certificate Generation and Management
 *
 * Handles creation and management of X.509 certificates for secure
 * node-to-node communication in the mesh network.
 *
 * Security Model:
 * - CA (Certificate Authority) is the root of trust
 * - Each node gets its own certificate signed by the CA
 * - Nodes verify each other's certificates during TLS handshake
 * - Mutual TLS ensures both client and server are authenticated
 */

import { execSync } from 'child_process'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface CertificateInfo {
  commonName: string
  certPath: string
  keyPath: string
  createdAt: Date
  expiresAt: Date
}

export class CertificateManager {
  private certDir: string
  private caKeyPath: string
  private caCertPath: string

  constructor(certDir?: string) {
    this.certDir = certDir || join(homedir(), '.air-mesh', 'certs')
    this.caKeyPath = join(this.certDir, 'ca-key.pem')
    this.caCertPath = join(this.certDir, 'ca-cert.pem')
  }

  /**
   * Initialize the certificate directory and create CA if not exists
   */
  async initialize(): Promise<void> {
    if (!existsSync(this.certDir)) {
      mkdirSync(this.certDir, { recursive: true })
    }

    if (!this.hasCA()) {
      await this.createCA()
    }
  }

  /**
   * Check if CA certificate exists
   */
  hasCA(): boolean {
    return existsSync(this.caKeyPath) && existsSync(this.caCertPath)
  }

  /**
   * Create Certificate Authority (root of trust)
   */
  async createCA(): Promise<void> {
    console.log('🔐 Creating Certificate Authority...')

    try {
      // Generate CA private key and self-signed certificate
      execSync(
        `openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
        -keyout "${this.caKeyPath}" \
        -out "${this.caCertPath}" \
        -subj "/CN=air-mesh-ca/O=air-cli/C=US"`,
        { stdio: 'pipe' }
      )

      // Set restrictive permissions on CA private key
      if (process.platform !== 'win32') {
        execSync(`chmod 600 "${this.caKeyPath}"`)
      }

      console.log('✅ CA certificate created')
      console.log(`📁 Location: ${this.certDir}`)
      console.log('⚠️  IMPORTANT: Keep ca-key.pem SECRET!')
      console.log('📋 Share ca-cert.pem with all nodes')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(`Failed to create CA: ${error.message}`)
    }
  }

  /**
   * Generate a certificate for a node
   */
  async generateNodeCertificate(nodeName: string): Promise<CertificateInfo> {
    if (!this.hasCA()) {
      throw new Error('CA does not exist. Run initialize() first.')
    }

    console.log(`🔐 Generating certificate for node: ${nodeName}`)

    const keyPath = join(this.certDir, `${nodeName}-key.pem`)
    const certPath = join(this.certDir, `${nodeName}-cert.pem`)
    const reqPath = join(this.certDir, `${nodeName}-req.pem`)

    try {
      // Generate node private key and CSR
      execSync(
        `openssl req -newkey rsa:4096 -nodes \
        -keyout "${keyPath}" \
        -out "${reqPath}" \
        -subj "/CN=${nodeName}/O=air-cli-node"`,
        { stdio: 'pipe' }
      )

      // Sign CSR with CA
      execSync(
        `openssl x509 -req \
        -in "${reqPath}" \
        -CA "${this.caCertPath}" \
        -CAkey "${this.caKeyPath}" \
        -CAcreateserial \
        -out "${certPath}" \
        -days 365 \
        -sha256`,
        { stdio: 'pipe' }
      )

      // Set restrictive permissions on private key
      if (process.platform !== 'win32') {
        execSync(`chmod 600 "${keyPath}"`)
      }

      // Clean up CSR
      execSync(`rm "${reqPath}"`)

      console.log(`✅ Certificate created for ${nodeName}`)
      console.log(`📁 Certificate: ${certPath}`)
      console.log(`🔑 Private key: ${keyPath}`)

      // Get certificate info
      const certInfo = this.getCertificateInfo(certPath)

      return {
        commonName: nodeName,
        certPath,
        keyPath,
        createdAt: new Date(),
        expiresAt: certInfo.expiresAt,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(
        `Failed to generate certificate for ${nodeName}: ${error.message}`
      )
    }
  }

  /**
   * Get certificate information
   */
  private getCertificateInfo(certPath: string): { expiresAt: Date } {
    try {
      const output = execSync(
        `openssl x509 -in "${certPath}" -noout -enddate`,
        { encoding: 'utf8' }
      )

      // Parse: notAfter=Jan 1 00:00:00 2025 GMT
      const match = output.match(/notAfter=(.+)/)
      const expiresAt = match ? new Date(match[1]) : new Date()

      return { expiresAt }
    } catch {
      return { expiresAt: new Date() }
    }
  }

  /**
   * Verify a certificate against the CA
   */
  verifyCertificate(certPath: string): boolean {
    try {
      execSync(`openssl verify -CAfile "${this.caCertPath}" "${certPath}"`, {
        stdio: 'pipe',
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * List all certificates in the directory
   */
  listCertificates(): CertificateInfo[] {
    const certs: CertificateInfo[] = []

    try {
      const files = execSync(`ls "${this.certDir}"/*.pem 2>/dev/null || true`, {
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean)

      for (const file of files) {
        if (file.endsWith('-cert.pem')) {
          const nodeName = file.split('/').pop()?.replace('-cert.pem', '') || ''
          const keyPath = file.replace('-cert.pem', '-key.pem')

          if (existsSync(keyPath)) {
            const info = this.getCertificateInfo(file)
            certs.push({
              commonName: nodeName,
              certPath: file,
              keyPath,
              createdAt: new Date(), // Would need to parse from cert
              expiresAt: info.expiresAt,
            })
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return certs
  }

  /**
   * Revoke a certificate (delete it)
   */
  revokeCertificate(nodeName: string): void {
    const keyPath = join(this.certDir, `${nodeName}-key.pem`)
    const certPath = join(this.certDir, `${nodeName}-cert.pem`)

    try {
      if (existsSync(keyPath)) {
        execSync(`rm "${keyPath}"`)
      }
      if (existsSync(certPath)) {
        execSync(`rm "${certPath}"`)
      }
      console.log(`✅ Revoked certificate for ${nodeName}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error(`Failed to revoke certificate: ${error.message}`)
    }
  }

  /**
   * Export CA certificate for sharing with other nodes
   */
  exportCACertificate(): string {
    if (!existsSync(this.caCertPath)) {
      throw new Error('CA certificate does not exist')
    }
    return readFileSync(this.caCertPath, 'utf8')
  }

  /**
   * Import CA certificate from another node
   */
  importCACertificate(caCert: string): void {
    writeFileSync(this.caCertPath, caCert, 'utf8')
    console.log('✅ CA certificate imported')
  }

  /**
   * Get paths for a node's certificates
   */
  getNodePaths(nodeName: string): { key: string; cert: string; ca: string } {
    return {
      key: join(this.certDir, `${nodeName}-key.pem`),
      cert: join(this.certDir, `${nodeName}-cert.pem`),
      ca: this.caCertPath,
    }
  }

  /**
   * Check if a node has valid certificates
   */
  hasNodeCertificate(nodeName: string): boolean {
    const paths = this.getNodePaths(nodeName)
    return (
      existsSync(paths.key) && existsSync(paths.cert) && existsSync(paths.ca)
    )
  }
}

// Export singleton instance
export const certificateManager = new CertificateManager()
