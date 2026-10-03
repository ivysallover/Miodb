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
  build: {
    // Vendor chunks are cached independently across deploys and fetched in parallel.
    // Only the libraries the landing really shares are named here; echarts is reached
    // exclusively from lazy pages, so it never loads with the landing.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/three\//.test(id)) return 'vendor-three';
          // Firestore is only reached from lazy pages (Dashboard, Proyectos); keep it out of the landing's chunk.
          if (/node_modules\/(@firebase\/firestore|@firebase\/webchannel-wrapper|firebase\/firestore)\//.test(id)) {
            return 'vendor-firestore';
          }
          if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'vendor-firebase';
          if (/node_modules\/(echarts|zrender|echarts-for-react)\//.test(id)) return 'vendor-echarts';
          if (/node_modules\/(gsap|lenis)\//.test(id)) return 'vendor-scroll';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 900,
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
