import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: "::",
    port: 8080,
    hmr: false,
  },
  plugins: [],
  build: {
    assetsDir: 'assets',
    outDir: 'dist',
  },
})
