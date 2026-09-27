import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'next/link': path.resolve(__dirname, './src/shims/next-link.tsx'),
      'next/image': path.resolve(__dirname, './src/shims/next-image.tsx'),
      'next/navigation': path.resolve(__dirname, './src/shims/next-navigation.ts'),
      'next/dynamic': path.resolve(__dirname, './src/shims/next-dynamic.tsx'),
      '@': path.resolve(__dirname, './src'),
      '@dashboard-ia': path.resolve(__dirname, './dashboard-ia/frontend/src'),
      '~components': path.resolve(__dirname, './src/components'),
      '~features': path.resolve(__dirname, './src/features'),
      '~types': path.resolve(__dirname, './src/types'),
      '~hooks': path.resolve(__dirname, './src/hooks'),
      '~lib': path.resolve(__dirname, './src/lib'),
      '~styles': path.resolve(__dirname, './src/styles'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:10000',
        changeOrigin: true,
      },
    },
  },
});
