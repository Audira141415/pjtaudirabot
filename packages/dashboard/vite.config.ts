import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Load port override from .env.ports if it exists
let apiPort = 4000;
try {
  const portsFile = path.resolve(__dirname, '../../.env.ports');
  if (fs.existsSync(portsFile)) {
    const content = fs.readFileSync(portsFile, 'utf-8');
    const match = content.match(/API_PORT=(\d+)/);
    if (match) {
      apiPort = parseInt(match[1], 10);
      console.log(`[Vite] Using API Port from .env.ports: ${apiPort}`);
    }
  }
} catch (err) {
  // Fallback to default 4000
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${apiPort}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
