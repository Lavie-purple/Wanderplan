import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

/** 主题切换按钮：放在 header 右侧 */
export default function ThemeSwitch() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => {
        const next = isDark ? 'light' : 'dark'
        setTheme(next)
        document.documentElement.dataset.theme = next === 'dark' ? 'dark' : ''
      }}
      title={isDark ? '切换到亮色' : '切换到暗色'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/80 text-ink-soft transition hover:border-moss/50 hover:bg-moss-pale hover:text-moss"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
