import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bookmark,
  ChevronDown,
  Download,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Wand2,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cities } from '../../data/cities'
import { searchPois, makeCustomPoi, type SearchResult } from '../../utils/poiSearch'
import { formatPriceRange, POI_HOTEL_PRICE } from '../../data/hotelPrice'
import { getCityLeg } from '../../data/flights'
import type { PoiType } from '../../types'

const PACE_LABEL: Record<number, string> = {
  1: '塞满',
  2: '紧凑',
  3: '均衡',
  4: '慢游',
  5: '深度',
}

const PACE_DESC: Record<number, string> = {
  1: '每天 5-6 个点位，赶场打卡',
  2: '每天 4-5 个点位，高效但不紧张',
  3: '每天 3-4 个点位，节奏舒适',
  4: '每天 2-3 个点位，深度体验',
  5: '每天 1-2 个点位，沉浸式旅行',
}


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
  const { itinerary, tripParams, selectedCityIds } = useAppStore.getState()
  const lines: string[] = ['# 我的旅行行程', '', coverImageBlock()]
  const cityNames = selectedCityIds
    .map((id) => cities.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(' · ')
  lines.push(`**城市**：${cityNames}`)
  lines.push(`**天数**：${tripParams.days} 天`)
  lines.push(`**预算**：${tripParams.budget === 'economy' ? '经济' : tripParams.budget === 'comfort' ? '舒适' : '豪华'}`)
  lines.push('')
  itinerary.forEach((day, i) => {
    const city = cities.find((c) => c.id === day.cityId)
    lines.push(`## 第 ${i + 1} 天 · ${city?.name ?? day.cityName ?? day.cityId}`)
    if (day.transit) {
      lines.push('🚄 交通转场日')
      return
    }
    day.items.forEach((it, j) => {
      const leg = day.legs?.[j - 1]
      const legLine = leg ? `  *(→ ${leg.mode === 'walk' ? '步行' : leg.mode === 'metro' ? '地铁' + (leg.line ?? '') : leg.mode === 'bus' ? '公交' + (leg.line ?? '') : '打车'} ${leg.minutes} 分钟)*` : ''
      lines.push(`- **${it.name}** · ${it.type === 'hotel' ? '🏨 住宿' : '📍 景点'} · ★${it.rating.toFixed(1)}${legLine}`)
      if (it.type === 'hotel') lines.push(`  - 价位：${formatPriceRange(it.id)}`)
      if (it.ticket) lines.push(`  - 门票：${it.ticket}`)
      if (it.description) lines.push(`  - ${it.description}`)
    })
    lines.push('')
  })
  // 跨城接驳
  if (itinerary.length > 1) {
    lines.push('## 跨城交通')
    for (let i = 0; i < itinerary.length - 1; i++) {
      const from = cities.find((c) => c.id === itinerary[i].cityId)
      const to = cities.find((c) => c.id === itinerary[i + 1].cityId)
      if (from && to) {
        const leg = getCityLeg(from.id, to.id)
        if (leg) {
          lines.push(
            `- **${from.name} → ${to.name}**：${leg.mode === 'plane' ? '✈️' : leg.mode === 'train' ? '🚄' : '🚌'} ${leg.number} · ${leg.fromStation} → ${leg.toStation} · ${leg.hours}h · ${leg.price}元 · ${leg.schedule ?? ''}`,
          )
        }
      }
    }
  }
  return lines.join('\n')
}


/** 汇率折算（估算用，固定值即可） */
const FX_TO_CNY: Record<string, number> = {
  CNY: 1, USD: 7.2, EUR: 7.8, JPY: 0.048, THB: 0.2, MYR: 1.55,
}

/** 预算估算：住宿（每晚区间）+ 城际交通（相邻不同城市取班次价），折算人民币 */
function estimateBudget() {
  const { itinerary } = useAppStore.getState()
  let minCny = 0
  let maxCny = 0
  for (const day of itinerary) {
    const hotel = day.items.find((p) => p.type === 'hotel')
    if (hotel) {
      const pr = POI_HOTEL_PRICE[hotel.id]
      if (pr) {
        const fx = FX_TO_CNY[pr.currency] ?? 1
        minCny += pr.min * fx
        maxCny += pr.max * fx
      }
    }
  }
  for (let i = 0; i < itinerary.length - 1; i++) {
    const a = itinerary[i]
    const b = itinerary[i + 1]
    if (a.cityId === b.cityId) continue
    const leg = getCityLeg(a.cityId, b.cityId)
    if (leg) {
      minCny += leg.price
      maxCny += leg.price
    }
  }
  return { min: Math.round(minCny), max: Math.round(maxCny), hasData: maxCny > 0 }
}

export default function PlanManager() {
  const itinerary = useAppStore((s) => s.itinerary)
  const savedPlans = useAppStore((s) => s.savedPlans)
  const activePlanKey = useAppStore((s) => s.activePlanKey)
  const saveAsPlan = useAppStore((s) => s.saveAsPlan)
  const loadPlan = useAppStore((s) => s.loadPlan)
  const deletePlan = useAppStore((s) => s.deletePlan)
  const generateItinerary = useAppStore((s) => s.generateItinerary)
  const paceIntensity = useAppStore((s) => s.paceIntensity)
  const setPaceIntensity = useAppStore((s) => s.setPaceIntensity)
  const tripParams = useAppStore((s) => s.tripParams)
  const updateTripParams = useAppStore((s) => s.updateTripParams)
  const lockedPoiIds = useAppStore((s) => s.lockedPoiIds)
  const touchedPoiIds = useAppStore((s) => s.touchedPoiIds)
  const touchPois = useAppStore((s) => s.touchPois)
  const clearTouchedPois = useAppStore((s) => s.clearTouchedPois)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const customPoisByCity = useAppStore((s) => s.customPoisByCity)
  const addCustomPoi = useAppStore((s) => s.addCustomPoi)

  const [planOpen, setPlanOpen] = useState(false)
  const [poiOpen, setPoiOpen] = useState(false)
  const [poiQuery, setPoiQuery] = useState('')
  const [poiTargetCity, setPoiTargetCity] = useState<string>('')
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState<PoiType>('attraction')
  const [customDesc, setCustomDesc] = useState('')

  const searchResults = useMemo(() => searchPois(poiQuery, 15), [poiQuery])
  const planKeys = Object.keys(savedPlans)
  const budget = useMemo(() => estimateBudget(), [itinerary, savedPlans])

  const totalLocked = useMemo(
    () => itinerary.flatMap((d) => d.items).filter((p) => lockedPoiIds.includes(p.id)).length,
    [itinerary, lockedPoiIds],
  )

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* 节奏滑块 */}
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-moss" />
          <span className="text-xs font-medium">节奏</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={paceIntensity}
            onChange={(e) => {
              const v = Number(e.target.value) as 1 | 2 | 3 | 4 | 5
              setPaceIntensity(v)
              // 节奏变化：实时重新生成
              setTimeout(() => generateItinerary({ preserveLocks: true }), 0)
            }}
            className="w-20 accent-moss"
            title={PACE_DESC[paceIntensity]}
          />
          <span className="text-xs text-ink-soft">{PACE_LABEL[paceIntensity]}</span>
        </div>

        {/* 预算档位 */}
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-cream p-0.5 text-xs">
          {(['economy', 'comfort', 'luxury'] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                updateTripParams({ budget: b })
                // 预算档位变化：立即重新生成以让酒店档位切换生效
                setTimeout(() => generateItinerary({ preserveLocks: true }), 0)
              }}
              className={`rounded-full px-2.5 py-0.5 transition ${
                tripParams.budget === b ? 'bg-moss text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {b === 'economy' ? '经济' : b === 'comfort' ? '舒适' : '豪华'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {/* 添加 POI */}
          <button
            type="button"
            onClick={() => setPoiOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs transition hover:border-moss/50 hover:text-moss"
          >
            <Plus size={12} />
            搜索 / 添加 POI
          </button>
          {/* 方案管理 */}
          <button
            type="button"
            onClick={() => setPlanOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs transition hover:border-moss/50 hover:text-moss"
          >
            <Bookmark size={12} />
            方案 {planKeys.length > 0 ? `(${planKeys.length})` : ''}
            <ChevronDown size={12} className={planOpen ? 'rotate-180' : ''} />
          </button>
          {/* 重新生成（保留已锁定） */}
          <button
            type="button"
            onClick={() => {
              if (touchedPoiIds.length > 0) setConfirmOpen(true)
              else generateItinerary({ preserveLocks: true })
            }}
            className="flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs transition hover:border-moss/50 hover:text-moss"
          >
            <RotateCcw size={12} />
            重新生成（保留 {totalLocked} 个已锁{touchedPoiIds.length > 0 ? ` · ${touchedPoiIds.length} 处调整` : ''}）
          </button>
          {/* 导出 */}
          <button
            type="button"
            onClick={() => {
              const md = exportMarkdown()
              const blob = new Blob([md], { type: 'text/markdown' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `wanderplan-${new Date().toISOString().slice(0, 10)}.md`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center gap-1 rounded-full bg-moss px-3 py-1.5 text-xs text-white transition hover:bg-moss-light"
          >
            <Download size={12} />
            导出 Markdown
          </button>
        </div>
      </div>

      {/* 预算汇总条：住宿 + 城际交通（估算，不含餐饮/门票） */}
      {budget.hasData && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-apricot-pale/50 px-3 py-2 text-[11px]">
          <span className="font-medium text-ink">💰 预算估算</span>
          <span className="text-[#b07a4a]">
            ¥{budget.min.toLocaleString()} – ¥{budget.max.toLocaleString()}
          </span>
          <span className="text-ink-soft">（住宿 + 城际交通 · 不含餐饮门票 · 切换预算档位后重新生成即更新）</span>
        </div>
      )}

      {/* 已锁定的提示 */}
      {totalLocked > 0 && (
        <p className="mt-2 text-[11px] text-ink-soft">
          已锁定 {totalLocked} 个 POI：重新生成时不会被替换。点击行程卡片的 🔒 可锁定。
        </p>
      )}

      {/* 方案管理下拉 */}
      <AnimatePresence>
        {planOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-t border-dashed border-line pt-3"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => saveAsPlan()}
                className="flex items-center gap-1 rounded-full bg-moss/10 px-3 py-1.5 text-xs text-moss transition hover:bg-moss/20"
              >
                <Save size={12} />
                保存为新方案
              </button>
              <button
                type="button"
                onClick={() => loadPlan('current')}
                disabled={activePlanKey === 'current'}
                className="flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs transition hover:border-moss/50 hover:text-moss disabled:opacity-40"
              >
                当前
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {planKeys.map((key) => {
                const p = savedPlans[key]
                const active = key === activePlanKey
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      active ? 'border-moss bg-moss-pale text-ink' : 'border-line bg-cream text-ink-soft'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadPlan(key)}
                      className="font-medium hover:text-moss"
                    >
                      {p.label ?? key} · {new Date(p.savedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                    </button>
                    <button
                      type="button"
                      title="删除"
                      onClick={() => deletePlan(key)}
                      className="ml-1 text-ink-soft hover:text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POI 搜索/添加 */}
      <AnimatePresence>
        {poiOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden border-t border-dashed border-line pt-3"
          >
            <div className="flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5">
              <Search size={14} className="text-ink-soft" />
              <input
                value={poiQuery}
                onChange={(e) => setPoiQuery(e.target.value)}
                placeholder="搜索景点（文和友、鼓浪屿、莫高窟…）"
                className="flex-1 bg-transparent text-xs outline-none"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {searchResults.map((r: SearchResult) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-ink-soft">★{r.rating.toFixed(1)}</span>
                      <div className="truncate text-[10px] text-ink-soft">{r.description}</div>
                    </div>
                    {r.matchedCityId && (
                      <button
                        type="button"
                        onClick={() => {
                          addCustomPoi(r.matchedCityId!, r)
                        }}
                        className="ml-2 shrink-0 rounded-full bg-moss-pale px-2 py-0.5 text-[10px] text-moss hover:bg-moss hover:text-white"
                      >
                        加入 {cities.find((c) => c.id === r.matchedCityId)?.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 手动添加 */}
            <div className="mt-3 rounded-lg border border-dashed border-line p-2">
              <p className="mb-1.5 text-[11px] font-medium text-ink-soft">手动添加一个 POI</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="名称"
                  className="rounded border border-line bg-white px-2 py-1 outline-none"
                />
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as PoiType)}
                  className="rounded border border-line bg-white px-2 py-1 outline-none"
                >
                  <option value="attraction">景点</option>
                  <option value="culture">人文</option>
                  <option value="food">美食</option>
                  <option value="shopping">购物</option>
                </select>
                <input
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="一句话介绍"
                  className="col-span-2 rounded border border-line bg-white px-2 py-1 outline-none"
                />
                <select
                  value={poiTargetCity}
                  onChange={(e) => setPoiTargetCity(e.target.value)}
                  className="rounded border border-line bg-white px-2 py-1 outline-none"
                >
                  <option value="">归属城市…</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!customName || !poiTargetCity) return
                    const city = cities.find((c) => c.id === poiTargetCity)
                    if (!city) return
                    addCustomPoi(
                      poiTargetCity,
                      makeCustomPoi(customName, customType, city.location, customDesc),
                    )
                    setCustomName('')
                    setCustomDesc('')
                  }}
                  className="rounded bg-moss px-2 py-1 text-white hover:bg-moss-light"
                >
                  添加
                </button>
              </div>
              {Object.values(customPoisByCity).flat().length > 0 && (
                <p className="mt-1.5 text-[10px] text-ink-soft">
                  已添加自定义 {Object.values(customPoisByCity).flat().length} 个
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 手动调整确认弹窗 */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[420px] max-w-[90vw] rounded-2xl border border-line bg-cream p-5 shadow-2xl"
            >
              <h3 className="font-serif-sc text-lg">检测到您手动调整了 {touchedPoiIds.length} 处行程</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                是否锁定这 {touchedPoiIds.length} 处（卡片上带 🔒 的项目），仅重新生成其余部分？
              </p>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    touchPois(touchedPoiIds)
                    generateItinerary({ preserveLocks: true })
                    setConfirmOpen(false)
                  }}
                  className="w-full rounded-full bg-moss py-2.5 text-sm font-medium text-white transition hover:bg-moss-light"
                >
                  锁定这 {touchedPoiIds.length} 处，重新生成其余
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearTouchedPois()
                    generateItinerary({ preserveLocks: true })
                    setConfirmOpen(false)
                  }}
                  className="w-full rounded-full border border-line bg-white py-2.5 text-sm text-ink-soft transition hover:border-red-300 hover:text-red-500"
                >
                  不锁定，全部重新生成
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="w-full text-xs text-ink-soft hover:text-ink"
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
