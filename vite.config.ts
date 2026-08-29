import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径：GitHub Pages 项目站（username.github.io/repo/）与子路径部署均可直接用
  base: './',
  plugins: [react(), tailwindcss()],
})
