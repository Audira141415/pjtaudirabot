import http from 'node:http';
import net from 'node:net';
import { ILogger } from './logger';

export interface PortResolverOptions {
  preferredPort: number;
  maxRetries?: number;
  serviceName: string;
  logger: ILogger;
}

export interface PortResolverResult {
  port: number;
  isFallback: boolean;
  message: string;
}

/**
 * Smart port resolver that finds available ports without killing existing processes
 * Tries preferred port first, then increments until finding an available port
 */
export class PortResolver {
  private maxRetries: number;

  constructor(
    private options: PortResolverOptions,
  ) {
    this.maxRetries = options.maxRetries ?? 20;
  }

  /**
   * Check if a port is available using a test server
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      const onError = (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          this.options.logger.warn(`Port check error on :${port}`, err);
          resolve(false);
        }
      };

      server.once('error', onError);
      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      try {
        server.listen(port, '0.0.0.0');
      } catch (err) {
        resolve(false);
      }
    });
  }

  /**
   * Resolve port with automatic fallback
   */
  async resolve(): Promise<PortResolverResult> {
    const { preferredPort, serviceName } = this.options;

    // Try preferred port first
    if (await this.isPortAvailable(preferredPort)) {
      return {
        port: preferredPort,
        isFallback: false,
        message: `${serviceName} using preferred port :${preferredPort}`,
      };
    }

    // Search for available port
    for (let i = 1; i <= this.maxRetries; i++) {
      const candidatePort = preferredPort + i;
      const available = await this.isPortAvailable(candidatePort);

      if (available) {
        const message = `${serviceName} port :${preferredPort} in use, using fallback :${candidatePort} (attempt ${i}/${this.maxRetries})`;
        this.options.logger.info(message);

        return {
          port: candidatePort,
          isFallback: true,
          message,
        };
      }
    }

    throw new Error(
      `${serviceName} failed to find available port in range ${preferredPort}-${preferredPort + this.maxRetries}`,
    );
  }

  /**
   * Bind a custom service with automatic port fallback (atomic bind attempts).
   * Use this for servers/frameworks that expose their own listen API.
   */
  async bindWithFallback(
    bindAttempt: (port: number) => Promise<void>,
  ): Promise<{ port: number; isFallback: boolean }> {
    const { preferredPort, serviceName } = this.options;

    const tryBind = async (port: number): Promise<boolean> => {
      try {
        await bindAttempt(port);
        return true;
      } catch (err) {
        const maybeErr = err as NodeJS.ErrnoException;
        if (maybeErr?.code === 'EADDRINUSE') {
          return false;
        }

        this.options.logger.error(`${serviceName} bind error on :${port}`, err as Error);
        return false;
      }
    };

    if (await tryBind(preferredPort)) {
      return { port: preferredPort, isFallback: false };
    }

    for (let i = 1; i <= this.maxRetries; i++) {
      const candidatePort = preferredPort + i;
      if (await tryBind(candidatePort)) {
        this.options.logger.info(
          `${serviceName} bound to fallback port :${candidatePort} (preferred :${preferredPort} in use)`,
        );
        return { port: candidatePort, isFallback: true };
      }
    }

    throw new Error(
      `${serviceName} failed to bind to any port in range ${preferredPort}-${preferredPort + this.maxRetries}`,
    );
  }

  /**
   * Bind HTTP server with automatic port fallback
   */
  async bindServer(
    server: http.Server,
  ): Promise<{ port: number; isFallback: boolean }> {
    const { preferredPort, serviceName } = this.options;

    const tryBind = async (port: number): Promise<number | null> => {
      return new Promise((resolve) => {
        let settled = false;

        const cleanup = () => {
          server.removeListener('error', onError);
          server.removeListener('listening', onListening);
        };

        const finalize = (value: number | null) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeout);
          cleanup();
          resolve(value);
        };

        const timeout = setTimeout(() => {
          finalize(null);
        }, 5000); // Timeout for each port attempt

        const onError = (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            finalize(null);
          } else {
            this.options.logger.error(`${serviceName} bind error on :${port}`, err);
            finalize(null);
          }
        };

        const onListening = () => {
          finalize(port);
        };

        server.once('error', onError);
        server.once('listening', onListening);

        try {
          server.listen(port, '0.0.0.0');
        } catch (err) {
          finalize(null);
        }
      });
    };

    // Try preferred port
    let boundPort = await tryBind(preferredPort);
    if (boundPort !== null) {
      this.options.logger.info(`${serviceName} bound to preferred port :${boundPort}`);
      return { port: boundPort, isFallback: false };
    }

    // Try fallback ports
    for (let i = 1; i <= this.maxRetries; i++) {
      const candidatePort = preferredPort + i;
      boundPort = await tryBind(candidatePort);

      if (boundPort !== null) {
        this.options.logger.info(
          `${serviceName} bound to fallback port :${candidatePort} (preferred :${preferredPort} in use)`,
        );
        return { port: boundPort, isFallback: true };
      }
    }

    throw new Error(
      `${serviceName} failed to bind to any port in range ${preferredPort}-${preferredPort + this.maxRetries}`,
    );
  }
}

/**
 * Helper to resolve multiple services at once
 */
export async function resolveMultiplePorts(
  services: Array<{
    name: string;
    preferredPort: number;
    maxRetries?: number;
  }>,
  logger: ILogger,
): Promise<Map<string, PortResolverResult>> {
  const results = new Map<string, PortResolverResult>();
  const reservedPorts = new Set<number>();

  for (const service of services) {
    const resolver = new PortResolver({
      serviceName: service.name,
      preferredPort: service.preferredPort,
      maxRetries: service.maxRetries ?? 20,
      logger,
    });

    const result = await resolver.resolve();

    // Track reserved ports to avoid duplicate assignments
    if (reservedPorts.has(result.port)) {
      logger.warn(`Port :${result.port} already reserved, searching for alternative...`);
      // Find next available
      let nextPort = result.port + 1;
      for (let i = 0; i < 20; i++) {
        if (!reservedPorts.has(nextPort)) {
          result.port = nextPort;
          break;
        }
        nextPort++;
      }
    }

    reservedPorts.add(result.port);
    results.set(service.name, result);
    logger.info(result.message);
  }

  return results;
}
