import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const { resolve } = require('path')

const env = loadEnv(process.env.NODE_ENV, process.cwd(), 'VITE_')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@componets', replacement: '/src/components' },
      { find: '@assets', replacement: '/src/assets' }
    ]
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://${env.VITE_API_URL}`,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  },
  css: {
    preprocessorOptions: {
      less: {
        modifyVars: {
          '@primary-color': '#3388ff',
          '@link-color': '#3388ff',
          '@link-hover-color': '#5ca5ff',
          '@link-active-color': '#2167d9',
          '@error-color': '#ff4d4f',
          '@layout-header-background': '#000D22',
          '@layout-body-background': '#f9f9f9',
          '@border-color-base': 'rgba(0, 0, 0, 0.16)',
          '@menu-inline-toplevel-item-height': '48px',
          '@menu-item-height': '48px',
          '@menu-collapsed-width': '72px'
        },
        javascriptEnabled: true
      }
    }
  }
})
