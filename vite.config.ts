import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the project site from a subpath; set VITE_BASE for
  // that build. Default '/' keeps root deployments (e.g. Cloudflare Pages)
  // working unchanged.
  base: process.env.VITE_BASE || '/',
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
