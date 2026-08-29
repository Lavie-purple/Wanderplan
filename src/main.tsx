import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { useAppStore } from './store/useAppStore'

// 初始化主题：跟随 localStorage / 系统
const initial = useAppStore.getState().theme
if (initial === 'dark') document.documentElement.dataset.theme = 'dark'

// 注册 Service Worker：缓存 Pexels / Wikimedia 图片到本地
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
