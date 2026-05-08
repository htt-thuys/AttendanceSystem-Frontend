import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const aiApiProxyTarget = env.AI_API_PROXY_TARGET
  const apiProxyTarget = env.API_PROXY_TARGET

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      allowedHosts: [
        'glitzy-produce-shifter.ngrok-free.dev'
      ],
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (url) => url.replace(/^\/api/, ''),
        },
        '/ai-api': {
          target: aiApiProxyTarget,
          changeOrigin: true,
          rewrite: (url) => url.replace(/^\/ai-api/, ''),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
