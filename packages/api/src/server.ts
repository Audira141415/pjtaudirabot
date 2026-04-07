import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { getServerConfig, getPortConfig, getPortRegistry } from '@pjtaudirabot/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure local development env vars are loaded for API startup.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  try {
    const serverConfig = getServerConfig();
    const portConfig = getPortConfig();
    const ports = getPortRegistry();

    // Reserve the API port in the global registry
    ports.reserve('api', portConfig.api);

    // Validate port is actually free before binding
    await ports.validateAll(serverConfig.host);

    const { app } = await createApp();

    // Use the dedicated API port (not the generic SERVER_PORT)
    await app.listen({ host: serverConfig.host, port: portConfig.api });

    console.log(`
      🚀 ${serverConfig.appName} v${serverConfig.appVersion} started
      📍 http://${serverConfig.host}:${portConfig.api}
      🌍 Environment: ${serverConfig.env}
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();
