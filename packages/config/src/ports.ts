import * as net from 'net';

export interface PortAllocation {
  service: string;
  port: number;
}

/**
 * PortRegistry — Prevents port conflicts across all bot services.
 *
 * Usage:
 *   const registry = new PortRegistry();
 *   registry.reserve('api', 4000);
 *   registry.reserve('telegram', 4010);
 *   await registry.validateAll();           // throws if any port in use
 *   const port = await registry.allocate('discord', 4100, 4199); // next free
 */
export class PortRegistry {
  private readonly allocations = new Map<string, number>();
  private readonly portToService = new Map<number, string>();

  /**
   * Reserve a fixed port for a service.
   * Throws immediately if another service already claimed that port.
   */
  reserve(service: string, port: number): void {
    const existing = this.portToService.get(port);
    if (existing && existing !== service) {
      throw new Error(
        `Port conflict: port ${port} is already reserved by "${existing}", ` +
        `cannot assign to "${service}". Update your .env to use different ports.`
      );
    }

    const currentPort = this.allocations.get(service);
    if (currentPort !== undefined && currentPort !== port) {
      this.portToService.delete(currentPort);
    }

    this.allocations.set(service, port);
    this.portToService.set(port, service);
  }

  /** Get the port for a service, or undefined. */
  getPort(service: string): number | undefined {
    return this.allocations.get(service);
  }

  /** Get which service owns a port, or undefined. */
  getService(port: number): string | undefined {
    return this.portToService.get(port);
  }

  /** List all current allocations. */
  listAll(): ReadonlyArray<PortAllocation> {
    return Array.from(this.allocations.entries()).map(([service, port]) => ({
      service,
      port,
    }));
  }

  /**
   * Check whether a single port is actually available on the host.
   * Returns true if the port is free, false if occupied.
   */
  static checkPort(port: number, host = '0.0.0.0'): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, host);
    });
  }

  /**
   * Validate that ALL reserved ports are actually free on the host.
   * Throws with a detailed message listing every conflict.
   */
  async validateAll(host = '0.0.0.0'): Promise<void> {
    const checks = await Promise.all(
      Array.from(this.allocations.entries()).map(async ([service, port]) => ({
        service,
        port,
        free: await PortRegistry.checkPort(port, host),
      }))
    );

    const conflicts = checks.filter((c) => !c.free);
    if (conflicts.length > 0) {
      const lines = conflicts.map(
        (c) => `  - Port ${c.port} (${c.service}) is already in use`
      );
      throw new Error(
        `Port conflicts detected:\n${lines.join('\n')}\n\n` +
        `Fix: update the corresponding *_PORT env vars, or stop the processes using those ports.`
      );
    }
  }

  /**
   * Allocate the next available port from a range for a new service.
   * Skips ports already reserved by other services AND ports in use on the host.
   */
  async allocate(
    service: string,
    rangeStart: number,
    rangeEnd: number,
    host = '0.0.0.0'
  ): Promise<number> {
    for (let port = rangeStart; port <= rangeEnd; port++) {
      if (this.portToService.has(port)) continue;

      const free = await PortRegistry.checkPort(port, host);
      if (free) {
        this.reserve(service, port);
        return port;
      }
    }

    throw new Error(
      `No free port available for "${service}" in range ${rangeStart}-${rangeEnd}. ` +
      `Increase BOT_PORT_RANGE_END or free up ports.`
    );
  }
}

/** Singleton registry shared across the process. */
let globalRegistry: PortRegistry | null = null;

export function getPortRegistry(): PortRegistry {
  if (!globalRegistry) {
    globalRegistry = new PortRegistry();
  }
  return globalRegistry;
}
