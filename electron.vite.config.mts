import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const root = import.meta.dirname
const shared = { '@shared': resolve(root, 'src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: shared },
  },
  preload: {
    resolve: { alias: shared },
  },
  renderer: {
    resolve: { alias: { ...shared, '@': resolve(root, 'src/renderer/src') } },
    plugins: [react()],
    // Fonts stay files, so the page's font-src can stay 'self'. The script is
    // minified: electron-vite leaves that off unless asked.
    build: { assetsInlineLimit: 0, minify: true },
  },
})
