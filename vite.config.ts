import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        scanner: resolve(__dirname, 'src/content/scanner.ts'),
        popup: resolve(__dirname, 'src/assets/popup/popup.html'),
        // CSS files for content scripts
        'src/content/overlay': resolve(__dirname, 'src/content/overlay.css'),
        'src/content/context-menu': resolve(__dirname, 'src/content/context-menu.css'),
        'src/content/banner-workflow': resolve(__dirname, 'src/content/banner-workflow.css'),
        'src/content/ui-response-system': resolve(__dirname, 'src/content/ui-response-system.css')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    'import.meta.url': 'undefined'
  }
});
