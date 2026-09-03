import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Must match the basename passed to createBrowserRouter in router.jsx,
  // and the /dashboard/:path+ prefix used in the landing page's proxy
  // (dev) and vercel.json rewrite (prod). All three have to agree or
  // assets/routes will 404 under the proxy.
  base: '/dashboard/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})