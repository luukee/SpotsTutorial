import { defineConfig } from 'vite';

/** Practice guide: Vite dev server + production build to dist/ for Amplify. */
export default defineConfig({
  publicDir: 'public',
  server: {
    port: 5500,
    open: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  preview: {
    port: 5500,
  },
});
