import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'lib/**/*.spec.ts', 'app/**/*.test.ts', 'app/**/*.spec.ts'],
    exclude: [
      '**/PlacePageLayoutResolver*.test.ts',
      'node_modules/**',
      '.next/**',
      '.claude/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
