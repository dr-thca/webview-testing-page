import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const singleFileConfig = {
  build: {
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    minify: false,
  },
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  server: {
    port: 3000,
    strictPort: true,
  },
  ...(mode === 'single' ? singleFileConfig : {}),
}))
