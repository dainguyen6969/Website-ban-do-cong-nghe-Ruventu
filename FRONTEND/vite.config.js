import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

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
