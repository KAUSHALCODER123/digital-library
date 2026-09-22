import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside the React server build; tests exercise those modules directly.
      'server-only': new URL('./src/test/empty.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    env: { NODE_ENV: 'test' },
  },
});
