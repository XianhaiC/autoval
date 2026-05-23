import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    env: loadEnv('', process.cwd(), ''),
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
