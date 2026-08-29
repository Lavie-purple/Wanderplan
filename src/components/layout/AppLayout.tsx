import { useEffect, useRef, type ReactNode } from 'react'
import { Compass } from 'lucide-react'
import ConfigMenu from './ConfigMenu'
import StepIndicator from './StepIndicator'
import ThemeSwitch from './ThemeSwitch'
import HistorySwitch from './HistorySwitch'
import { useAppStore } from '../../store/useAppStore'

interface AppLayoutProps {
  left: ReactNode
  right: ReactNode
}

export default function AppLayout({ left, right }: AppLayoutProps) {
  const currentStep = useAppStore((s) => s.currentStep)
  const leftRef = useRef<HTMLElement>(null)

  // 切换步骤时左侧面板回到顶部
  useEffect(() => {
    leftRef.current?.scrollTo({ top: 0 })
  }, [currentStep])

  return (
    <div className="flex h-screen flex-col bg-cream text-ink">
      <header className="relative z-[1100] flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-2.5 backdrop-blur sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss text-white shadow-sm">
            <Compass size={20} />
          </span>
          <div className="leading-tight">
            <h1 className="font-serif-sc text-lg">漫游记</h1>
            <p className="text-xs text-ink-soft">AI 陪你一步步规划旅行</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <HistorySwitch />
          <ConfigMenu />
          <StepIndicator />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        {/* 左侧：攻略 / 选择内容（可滚动） */}
        <section ref={leftRef} className="min-h-0 flex-1 overflow-y-auto lg:w-[45%] lg:min-w-[420px] lg:max-w-[560px] lg:flex-none">
          {left}
        </section>
        {/* 右侧：地图（固定，跟随左侧联动） */}
        <section className="relative h-[38vh] shrink-0 lg:h-auto lg:min-w-0 lg:flex-1">
          {right}
        </section>
      </main>
    </div>
  )
}
