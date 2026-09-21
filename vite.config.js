import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Permite que los assets se carguen correctamente en GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
