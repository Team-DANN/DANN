import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      // Matches /dashboard/anything but NOT bare /dashboard — that stays
      // in this app so it hits the DashboardRedirect gate route. Only
      // deeper paths (auth/callback, production, etc.) get forwarded to
      // the dashboard dev server.
      '^/dashboard/.+': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true, // needed for HMR over the proxy
      },
    },
  },
})