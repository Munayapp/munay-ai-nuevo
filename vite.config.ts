import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // /api lo atiende el proxy LLM local (`npm run dev:api`); la clave nunca pasa por Vite.
    proxy: { '/api': { target: 'http://localhost:8788', changeOrigin: true } },
  },
});
