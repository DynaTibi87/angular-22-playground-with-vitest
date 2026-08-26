/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    // Angular's compiled output relies on these packages being processed by
    // Vite rather than pre-bundled by esbuild.
    server: {
      deps: {
        inline: [/@angular/, /fesm2022/],
      },
    },
  },
});
