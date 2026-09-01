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
      <header className="relative z-[1100] flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-line bg-white/80 px-3 py-2 backdrop-blur sm:px-5">
        {/* 品牌区：窄屏隐藏副标题并禁止换行，避免"一字一行" */}
        <div className="flex min-w-0 shrink items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss text-white shadow-sm">
            <Compass size={20} />
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="whitespace-nowrap font-serif-sc text-base sm:text-lg">漫游记</h1>
            <p className="hidden text-xs text-ink-soft sm:block">AI 陪你一步步规划旅行</p>
          </div>
        </div>
        {/* 工具区：主题 / 历史行程 / 配置 */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeSwitch />
          <HistorySwitch />
          <ConfigMenu />
          {/* 步骤导航：窄屏独占一行居中（仅图标），桌面回到行内 */}
          <div className="order-last flex w-full basis-full justify-center sm:order-none sm:w-auto sm:basis-auto sm:block">
            <StepIndicator />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        {/* 左侧：攻略 / 选择内容（可滚动） */}
        <section ref={leftRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:w-[45%] lg:min-w-[420px] lg:max-w-[560px] lg:flex-none">
          {left}
        </section>
        {/* 右侧：地图（固定，跟随左侧联动；窄屏给足高度便于触控操作） */}
        <section className="relative h-[42vh] min-h-[260px] shrink-0 lg:h-auto lg:min-w-0 lg:flex-1">
          {right}
        </section>
      </main>
    </div>
  )
}
