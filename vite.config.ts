import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        // 可用环境变量 VITE_DEV_PROXY 覆盖（如本地 venv 后端 8001）
        target: process.env.VITE_DEV_PROXY || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
