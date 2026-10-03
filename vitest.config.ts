import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@aep/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
      '@aep/event-model': path.resolve(__dirname, './packages/event-model/src/index.ts'),
      '@aep/event-pipeline': path.resolve(__dirname, './packages/event-pipeline/src/index.ts'),
      '@aep/tiktok-connectors': path.resolve(__dirname, './packages/tiktok-connectors/src/index.ts'),
      '@aep/battle-intelligence': path.resolve(__dirname, './packages/battle-intelligence/src/index.ts'),
      '@aep/powerup-inventory': path.resolve(__dirname, './packages/powerup-inventory/src/index.ts'),
      '@aep/watchlist': path.resolve(__dirname, './packages/watchlist/src/index.ts'),
      '@aep/database': path.resolve(__dirname, './packages/database/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
});
