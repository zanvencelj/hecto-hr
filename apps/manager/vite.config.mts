/// <reference types='vitest' />
import * as path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/manager',

  plugins: [react(), tailwindcss(), nxViteTsPaths()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },

  server: {
    port: 4200,
    host: 'localhost',
    proxy: {
      '/api': {
        target: process.env['VITE_API_URL'] ?? 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: 4200,
    host: 'localhost',
  },

  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },

  test: {
    name: '@hecto/manager',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
