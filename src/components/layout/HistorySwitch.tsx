import { useState, useRef } from 'react'
import { History, Upload, X, AlertTriangle, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { cities } from '../../data/cities'
import { formatPriceRange } from '../../data/hotelPrice'


/** 封面：取行程第 1 天第 1 个点位的本地实景图（dev 服务器路径，Typora 可渲染） */
function coverImageBlock(): string {
  const { itinerary } = useAppStore.getState()
  const firstPoi = itinerary[0]?.items?.[0]
  if (!firstPoi) return '> 📷 配图说明：尚未生成行程，无封面图。'
  const cityId = firstPoi.id.split('-')[0]
  const url = new URL(`images/poi/${cityId}/${firstPoi.id}.jpg`, document.baseURI).href
  return [
    `![行程封面 · ${firstPoi.name}](${url})`,
    '',
    `> 📷 配图说明：封面为行程首站「${firstPoi.name}」的本地图片（来自 public/images/poi/${cityId}/ 目录）。`,
    `> 若上方未显示图片，说明该目录下尚未放置对应照片（当前为占位白图或缺失），补图后重新导出即可。`,
    '',
  ].join('\n')
}

function exportMarkdown(): string {
  const { itinerary, tripParams, selectedCityIds, wantedPoiIds } = useAppStore.getState()
  const lines: string[] = ['# 我的旅行行程', '', coverImageBlock()]
  const cityNames = selectedCityIds.map((id) => cities.find((c) => c.id === id)?.name).filter(Boolean).join(' · ')
  lines.push(`**城市**：${cityNames}`)
  lines.push(`**天数**：${tripParams.days} 天`)
  lines.push(`**预算**：${tripParams.budget === 'economy' ? '经济' : tripParams.budget === 'comfort' ? '舒适' : '豪华'}`)
  lines.push(`**节奏**：${tripParams.days >= 5 ? '深度游' : '均衡'}`)
  if (wantedPoiIds.length) lines.push(`**想去**：${wantedPoiIds.length} 个`)
  lines.push('')
  itinerary.forEach((day, i) => {
    const city = cities.find((c) => c.id === day.cityId)
    lines.push(`## 第 ${i + 1} 天 · ${city?.name ?? day.cityName ?? day.cityId}`)
    if (day.transit) {
      lines.push('🚄 交通转场日')
      return
    }
    day.items.forEach((it) => {
      const tag = it.type === 'hotel' ? '🏨 住宿' : '📍 景点'
      lines.push(`- **${it.name}** · ${tag} · ★${it.rating.toFixed(1)}`)
      if (it.type === 'hotel') lines.push(`  - 价位：${formatPriceRange(it.id)}`)
      if (it.ticket) lines.push(`  - 门票：${it.ticket}`)
      if (it.description) lines.push(`  - ${it.description}`)
    })
    lines.push('')
  })
  return lines.join('\n')
}

export default function HistorySwitch() {
  const historyEnabled = useAppStore((s) => s.historyEnabled)
  const setHistoryEnabled = useAppStore((s) => s.setHistoryEnabled)
  const clearAllTripData = useAppStore((s) => s.clearAllTripData)
  const importFromMarkdown = useAppStore((s) => s.importFromMarkdown)
  const itinerary = useAppStore((s) => s.itinerary)
  const hasItinerary = itinerary.length > 0

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingClose, setPendingClose] = useState(false) // 确认关闭时是否清空
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleToggle = (next: boolean) => {
    if (next) {
      // 开启：直接启用
      setHistoryEnabled(true)
    } else {
      // 关闭：弹窗确认
      if (hasItinerary) {
        setPendingClose(true)
        setConfirmOpen(true)
      } else {
        setHistoryEnabled(false)
      }
    }
  }

  const handleConfirm = (action: 'save-then-clear' | 'clear' | 'cancel') => {
    if (action === 'save-then-clear') {
      // 先下载 markdown，再清空
      const md = exportMarkdown()
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wanderplan-${new Date().toISOString().slice(0, 10)}.md`
      a.click()
      URL.revokeObjectURL(url)
      clearAllTripData()
      setHistoryEnabled(false)
    } else if (action === 'clear') {
      clearAllTripData()
      setHistoryEnabled(false)
    }
    setConfirmOpen(false)
    setPendingClose(false)
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const md = String(reader.result)
      const ok = importFromMarkdown(md)
      if (!ok) alert('解析失败：markdown 格式不正确')
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* 历史行程开关按钮 */}
      <button
        type="button"
        onClick={() => handleToggle(!historyEnabled)}
        title={historyEnabled ? '已开启：可自由切换步骤' : '关闭：必须从偏好测评开始'}
        className={[
          'flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition',
          historyEnabled
            ? 'border-moss bg-moss text-white shadow-sm'
            : 'border-line bg-white/80 text-ink-soft hover:border-moss/50 hover:text-moss',
        ].join(' ')}
      >
        <History size={14} />
        <span className="hidden sm:inline">历史行程</span>
        <span
          className={[
            'inline-block h-4 w-7 rounded-full transition',
            historyEnabled ? 'bg-white/30' : 'bg-line',
          ].join(' ')}
        >
          <span
            className={[
              'absolute- top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all',
              historyEnabled ? 'left-3.5' : 'left-0.5',
            ].join(' ')}
          />
        </span>
      </button>

      {/* Markdown 导入按钮（开启历史行程时显示） */}
      {historyEnabled && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="从 markdown 导入历史行程"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white/80 text-ink-soft transition hover:border-moss/50 hover:text-moss"
          >
            <Upload size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,text/markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
        </>
      )}

      {/* 关闭确认弹窗 */}
      <AnimatePresence>
        {confirmOpen && pendingClose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => handleConfirm('cancel')}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[420px] max-w-[90vw] rounded-2xl border border-line bg-cream p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-apricot-pale text-apricot">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif-sc text-lg">关闭历史行程？</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    关闭后将清空当前所有行程（{itinerary.length} 天 / 已选城市 / 参数），并回到「偏好测评」从零开始。
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    建议先保存为 markdown 备份，后续可通过「📤 导入」按钮恢复。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleConfirm('cancel')}
                  className="text-ink-soft hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirm('save-then-clear')}
                  className="flex items-center justify-center gap-2 rounded-full bg-moss py-2.5 text-sm font-medium text-white transition hover:bg-moss-light"
                >
                  <Download size={15} />
                  保存为 markdown 后清空
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm('clear')}
                  className="rounded-full border border-line bg-white py-2.5 text-sm text-ink-soft transition hover:border-red-300 hover:text-red-500"
                >
                  直接清空（不保存）
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm('cancel')}
                  className="text-xs text-ink-soft hover:text-ink"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
