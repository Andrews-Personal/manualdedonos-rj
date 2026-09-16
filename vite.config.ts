import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // O SDK do Firebase responde por ~2/3 do bundle e quase nunca muda.
        // Em um chunk próprio, ele fica no cache do navegador entre deploys,
        // em vez de ser rebaixado toda vez que uma tela é ajustada.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
