import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL ?? ''
  const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(apiUrl)

  // Local dev against a remote API (e.g. https://api.edudeen.com): the app
  // calls this dev server (see src/api/apiBase.ts) and these requests are
  // forwarded server-side. The browser's localhost Origin is dropped on the
  // way, because the live API rejects localhost origins (CORS) — calling it
  // straight from the browser failed every request with a 500.
  const forward = (ws = false): ProxyOptions => ({
    target: apiUrl,
    changeOrigin: true,
    secure: true,
    ws,
    configure: proxy => {
      proxy.on('proxyReq', req => { req.removeHeader('origin'); req.removeHeader('referer') })
      proxy.on('proxyReqWs', req => { req.removeHeader('origin') })
    },
  })
  const proxy = apiUrl && !isLocalApi
    ? { '/api': forward(), '/socket.io': forward(true) }
    : undefined

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      // Store subdomains (`hello.localhost:3000`) are a real, separate host
      // Vite would otherwise reject outright ("This host is not allowed") —
      // see the storefront subdomain router in `src/router/index.tsx`.
      allowedHosts: ['.localhost'],
      proxy,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
