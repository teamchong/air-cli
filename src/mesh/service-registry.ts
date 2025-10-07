/**
 * Service Registry - Tracks available services across mesh nodes
 *
 * Provides service discovery and routing capabilities:
 * - Register local services
 * - Discover remote services
 * - Route requests to appropriate nodes
 * - Health checking and failover
 */

export interface ServiceInfo {
  name: string
  nodeName: string
  description?: string
  lastSeen: Date
}

export interface NodeHealth {
  nodeName: string
  isHealthy: boolean
  lastCheck: Date
  latencyMs?: number
}

export class ServiceRegistry {
  private services = new Map<string, ServiceInfo[]>();
  private nodeHealth = new Map<string, NodeHealth>();

  /**
   * Register a service for a node
   */
  register(serviceName: string, nodeName: string, description?: string): void {
    const existing = this.services.get(serviceName) || [];

    // Update if exists, otherwise add
    const index = existing.findIndex((s) => s.nodeName === nodeName);

    const info: ServiceInfo = {
      name: serviceName,
      nodeName,
      description,
      lastSeen: new Date()
    };

    if (index >= 0) {
      existing[index] = info;
    } else {
      existing.push(info);
    }

    this.services.set(serviceName, existing);
  }

  /**
   * Unregister a service from a node
   */
  unregister(serviceName: string, nodeName: string): void {
    const existing = this.services.get(serviceName) || [];
    const filtered = existing.filter((s) => s.nodeName !== nodeName);

    if (filtered.length > 0) {
      this.services.set(serviceName, filtered);
    } else {
      this.services.delete(serviceName);
    }
  }

  /**
   * Unregister all services from a node
   */
  unregisterNode(nodeName: string): void {
    for (const [serviceName, providers] of this.services.entries()) {
      const filtered = providers.filter((s) => s.nodeName !== nodeName);

      if (filtered.length > 0) {
        this.services.set(serviceName, filtered);
      } else {
        this.services.delete(serviceName);
      }
    }

    this.nodeHealth.delete(nodeName);
  }

  /**
   * Find nodes that provide a service
   */
  findProviders(serviceName: string): ServiceInfo[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * Find the best node for a service (based on health)
   */
  findBestProvider(serviceName: string): ServiceInfo | null {
    const providers = this.findProviders(serviceName);

    if (providers.length === 0) {
      return null;
    }

    // Sort by health and latency
    const sorted = providers.sort((a, b) => {
      const healthA = this.nodeHealth.get(a.nodeName);
      const healthB = this.nodeHealth.get(b.nodeName);

      // Prioritize healthy nodes
      if (healthA?.isHealthy && !healthB?.isHealthy) return -1;
      if (!healthA?.isHealthy && healthB?.isHealthy) return 1;

      // Then by latency
      const latencyA = healthA?.latencyMs || Infinity;
      const latencyB = healthB?.latencyMs || Infinity;

      return latencyA - latencyB;
    });

    return sorted[0];
  }

  /**
   * List all registered services
   */
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * List all services from a specific node
   */
  listNodeServices(nodeName: string): ServiceInfo[] {
    const result: ServiceInfo[] = [];

    for (const providers of this.services.values()) {
      for (const provider of providers) {
        if (provider.nodeName === nodeName) {
          result.push(provider);
        }
      }
    }

    return result;
  }

  /**
   * List all nodes in the registry
   */
  listNodes(): string[] {
    const nodes = new Set<string>();

    for (const providers of this.services.values()) {
      for (const provider of providers) {
        nodes.add(provider.nodeName);
      }
    }

    return Array.from(nodes);
  }

  /**
   * Update node health status
   */
  updateHealth(nodeName: string, isHealthy: boolean, latencyMs?: number): void {
    this.nodeHealth.set(nodeName, {
      nodeName,
      isHealthy,
      lastCheck: new Date(),
      latencyMs
    });
  }

  /**
   * Get node health
   */
  getHealth(nodeName: string): NodeHealth | undefined {
    return this.nodeHealth.get(nodeName);
  }

  /**
   * Check for stale service registrations
   */
  pruneStale(maxAgeMs: number = 60000): number {
    const now = new Date();
    let pruned = 0;

    for (const [serviceName, providers] of this.services.entries()) {
      const filtered = providers.filter((provider) => {
        const age = now.getTime() - provider.lastSeen.getTime();
        const isStale = age > maxAgeMs;

        if (isStale) {
          pruned++;
          console.log(
            `🗑️  Pruned stale service: ${serviceName} from ${provider.nodeName}`
          );
        }

        return !isStale;
      });

      if (filtered.length > 0) {
        this.services.set(serviceName, filtered);
      } else {
        this.services.delete(serviceName);
      }
    }

    return pruned;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalServices: number
    totalNodes: number
    healthyNodes: number
    unhealthyNodes: number
    } {
    const nodes = this.listNodes();
    const healthyNodes = nodes.filter(
      (n) => this.nodeHealth.get(n)?.isHealthy
    ).length;

    return {
      totalServices: this.services.size,
      totalNodes: nodes.length,
      healthyNodes,
      unhealthyNodes: nodes.length - healthyNodes
    };
  }

  /**
   * Export registry as JSON
   */
  toJSON(): any {
    const services: any = {};

    for (const [name, providers] of this.services.entries()) {
      services[name] = providers.map((p) => ({
        nodeName: p.nodeName,
        description: p.description,
        lastSeen: p.lastSeen.toISOString()
      }));
    }

    const health: any = {};
    for (const [nodeName, h] of this.nodeHealth.entries()) {
      health[nodeName] = {
        isHealthy: h.isHealthy,
        lastCheck: h.lastCheck.toISOString(),
        latencyMs: h.latencyMs
      };
    }

    return { services, health };
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.nodeHealth.clear();
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();
