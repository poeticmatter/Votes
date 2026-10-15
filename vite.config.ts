import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the site under /<repo-name>/.
  base: '/Votes/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // game-kit ships TypeScript source, so it goes through the same transforms as the
  // game's own code instead of being pre-bundled; its own dependencies still are.
  optimizeDeps: {
    exclude: ['game-kit'],
    include: ['peerjs', '@supabase/supabase-js'],
  },
  test: {
    server: { deps: { inline: ['game-kit'] } },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
