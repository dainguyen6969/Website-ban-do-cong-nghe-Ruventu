import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import projectFontSize from './src/typography/projectFontSize.js'

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [projectFontSize()] } },

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'coactive-subfestive-estelle.ngrok-free.dev',
    ],

    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
