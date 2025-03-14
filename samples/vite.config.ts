import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import sassDts from 'vite-plugin-sass-dts';

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['@mui/material/Tooltip', '@emotion/styled'],
  },
  plugins: [
    react(),
    sassDts({
      allGenerate: true,
      global: {
        generate: true,
        outFile: path.resolve(__dirname, './src/style.d.ts'),
      },
    }),
  ],
});
