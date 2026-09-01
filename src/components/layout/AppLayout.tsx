import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Compass, Maximize2, Minimize2 } from 'lucide-react'
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
  // 手机端地图展开/收起：42vh ↔ 85vh
  const [mapExpanded, setMapExpanded] = useState(false)

  // 切换步骤时左侧面板回到顶部
  useEffect(() => {
    leftRef.current?.scrollTo({ top: 0 })
  }, [currentStep])

  return (
    <div className="flex h-screen flex-col bg-cream text-ink">
      <header className="relative z-[1100] flex shrink-0 items-center justify-between gap-1.5 whitespace-nowrap border-b border-line bg-white/80 px-2 py-1.5 backdrop-blur sm:gap-3 sm:px-5 sm:py-2.5">
        {/* 品牌区：窄屏隐藏副标题并禁止换行，避免"一字一行" */}
        <div className="flex shrink items-center gap-1.5 sm:gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-moss text-white shadow-sm sm:h-9 sm:w-9">
            <Compass size={18} />
          </span>
          <div className="leading-tight">
            <h1 className="whitespace-nowrap font-serif-sc text-base sm:text-lg">漫游记</h1>
            <p className="hidden text-xs text-ink-soft sm:block">AI 陪你一步步规划旅行</p>
          </div>
        </div>
        {/* 工具区：主题 / 历史行程 / 配置 / 步骤导航——手机上也保持一行 */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeSwitch />
          <HistorySwitch />
          <ConfigMenu />
          <StepIndicator />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
        {/* 左侧：攻略 / 选择内容（可滚动） */}
        <section ref={leftRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:w-[45%] lg:min-w-[420px] lg:max-w-[560px] lg:flex-none">
          {left}
        </section>
        {/* 右侧：地图（固定，跟随左侧联动；窄屏给足高度便于触控操作） */}
        <section
          className={`relative shrink-0 transition-[height] duration-300 ${
            mapExpanded ? 'h-[85vh]' : 'h-[42vh] min-h-[260px]'
          } lg:h-auto lg:min-w-0 lg:flex-1`}
        >
          {right}
          {/* 手机端：一键展开/收起地图 */}
          <button
            type="button"
            onClick={() => setMapExpanded((v) => !v)}
            title={mapExpanded ? '收起地图' : '展开地图'}
            className="absolute left-3 top-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/95 text-ink shadow-sm backdrop-blur transition hover:border-moss/50 hover:text-moss sm:hidden"
          >
            {mapExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </section>
      </main>
    </div>
  )
}
