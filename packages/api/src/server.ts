import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger, PortResolver } from '@pjtaudirabot/core';
import { createApp } from './app';
import { getServerConfig, getPortConfig } from '@pjtaudirabot/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local development env vars are loaded for API startup.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  try {
    const serverConfig = getServerConfig();
    const portConfig = getPortConfig();
    const portLogger = new Logger('api-port-resolver');
    const portResolver = new PortResolver({
      serviceName: 'api-server',
      preferredPort: portConfig.api,
      maxRetries: 20,
      logger: portLogger,
    });

    const { app } = await createApp();

    // Use dedicated API port with atomic fallback binding to avoid race conditions.
    const { port: effectiveApiPort } = await portResolver.bindWithFallback(
      async (port) => {
        await app.listen({ host: serverConfig.host, port });
      },
    );

    console.log(`
      🚀 ${serverConfig.appName} v${serverConfig.appVersion} started
      📍 http://${serverConfig.host}:${effectiveApiPort}
      🌍 Environment: ${serverConfig.env}
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
