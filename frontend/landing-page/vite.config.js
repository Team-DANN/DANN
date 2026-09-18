// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '^/dashboard(/.*)?$': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true, // needed for HMR over the proxy
        // client's dev server enforces its `base: '/dashboard/'` config
        // strictly — a request for the bare path with no trailing slash
        // gets Vite's own "did you mean /dashboard/?" page instead of the
        // app. Only the exact bare case needs correcting; every deeper
        // path (/dashboard/finance, etc.) already has its own segment and
        // passes through unchanged.
        rewrite: (path) => (path === '/dashboard' ? '/dashboard/' : path),
      },
    },
  },
})