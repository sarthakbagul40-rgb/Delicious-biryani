import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { apiMiddleware } from './src/server/api.js';

function apiServerPlugin() {
  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(apiMiddleware);
    }
  };
}

export default defineConfig({
  plugins: [react(), apiServerPlugin()],
  server: {
    allowedHosts: true
  }
});
