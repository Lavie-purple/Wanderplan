import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus,
  Lock,
  Car,
  ChevronDown,
  ChevronLeft,
  Footprints,
  GripVertical,
  Hotel,
  MapPin,
  RefreshCw,
  Sparkles,
  Star,
  Train,
  X,
} from 'lucide-react'
import { cities } from '../../data/cities'
import { POI_META } from '../../types'
import { formatPriceRange } from '../../data/hotelPrice'
import type { DayPlan, Poi } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { PoiImage } from '../poi/PoiImage'
import PlanManager from './PlanManager'
import ItineraryTimeline from './ItineraryTimeline'

/** 耗时小圆点：红=深度耗时（≥3h）/ 绿=轻松路过（≤1.5h） */
function DurationDot({ poi }: { poi: Poi }) {
  const d = poi.duration ?? 2.0
  if (d >= 3) {
    return <span title="深度耗时：建议预留 3 小时以上" className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#e5484d]" />
  }
  if (d <= 1.5) {
    return <span title="轻松路过：1.5 小时以内" className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#46a758]" />
  }
  return null
}

/** 每日预估数据：步数 / 移动耗时（含出站步行）/ 强度等级 */
function dayStats(plan: DayPlan) {
  const legs = plan.legs ?? []
  const moveMin = legs.reduce((sum, l) => sum + l.minutes + (l.walkMin ?? 0), 0)
  const km = Math.round(legs.reduce((sum, l) => sum + l.km, 0) * 10) / 10
  const steps = Math.round(km * 1400)
  const visitMin = plan.items
    .filter((p) => p.type !== 'hotel')
    .reduce((sum, p) => sum + (p.duration ?? 2) * 60, 0)
  const totalMin = moveMin + visitMin
  let level: '轻松' | '适中' | '较高' = '轻松'
  if (km > 12 || totalMin > 600) level = '较高'
  else if (km > 7 || totalMin > 420) level = '适中'
  return { moveMin, km, steps, level }
}

/** 强度徽标配色 */
const LEVEL_STYLE: Record<string, string> = {
  轻松: 'bg-moss-pale text-moss',
  适中: 'bg-apricot-pale text-[#b07a4a]',
  较高: 'bg-red-50 text-red-500',
}

/** 餐饮候补时段（不指定餐厅，只锁定区域） */
function MealSlot({ kind, time, area }: { kind: '午餐' | '晚餐'; time: string; area: string }) {
  return (
    <div className="ml-12 my-1 rounded-xl border border-dashed border-apricot/50 bg-apricot-pale/40 px-3 py-2 text-[11px] leading-relaxed">
      <span className="mr-1.5">🥢</span>
      <span className="font-medium text-ink">{time}</span>
      <span className="mx-1.5 text-ink-soft">|</span>
      <span className="text-ink">{kind}自由探索</span>
      <span className="text-ink-soft">（推荐区域：{area}）</span>
      <div className="mt-0.5 text-[10px] text-ink-soft/80">
        可用上方「搜索 / 添加 POI」把具体餐厅替换此时段
      </div>
    </div>
  )
}

/** 找离 anchor 最近的美食 POI 作为推荐区域 */
function nearestFoodArea(cityId: string | undefined, anchor: Poi): string {
  const city = cities.find((c) => c.id === cityId)
  const foods = city?.pois.filter((p) => p.type === 'food') ?? []
  if (foods.length === 0) return anchor.name
  let best = foods[0]
  let bestD = Infinity
  for (const f of foods) {
    const dx = f.location[0] - anchor.location[0]
    const dy = f.location[1] - anchor.location[1]
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = f
    }
  }
  return `${best.name}周边`
}

function LegLine({
  leg,
  from,
  to,
}: {
  leg: { mode: 'walk' | 'metro' | 'bus' | 'taxi'; line?: string; minutes: number; km: number; walkMin?: number }
  from?: string
  to?: string
}) {
  const Icon = leg.mode === 'walk' ? Footprints : leg.mode === 'metro' ? Train : leg.mode === 'bus' ? Bus : Car
  const via = from && to ? `（${from} → ${to}）` : ''
  const label =
    leg.mode === 'walk'
      ? `步行 ${leg.minutes} 分钟${via}`
      : leg.mode === 'metro'
        ? `地铁${leg.line ?? ''}${via} · ${leg.minutes} 分钟`
        : leg.mode === 'bus'
          ? `公交${leg.line ?? ''}${via} · ${leg.minutes} 分钟`
          : `打车 ${leg.minutes} 分钟${via}`
  return (
    <div className="ml-12 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-l-2 border-dashed border-moss/30 py-1.5 pl-3 text-[11px] text-ink-soft">
      <Icon size={12} className="shrink-0 text-moss" />
      <span>{label}</span>
      <span className="text-ink-soft/60">· {leg.km}km</span>
      {(leg.walkMin ?? 0) > 0 && (
        <span className="text-ink-soft/60">· 含换乘步行 {leg.walkMin} 分钟</span>
      )}
    </div>
  )
}

function ItineraryItemCard({
  poi,
  dayIndex,
  itemIndex,
  canReplace,
  canRemove,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  poi: Poi
  dayIndex: number
  itemIndex: number
  canReplace: boolean
  canRemove: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const focusPoi = useAppStore((s) => s.focusPoi)
  const replacePoi = useAppStore((s) => s.replacePoi)
  const activePoiId = useAppStore((s) => s.activePoiId)
  const isWanted = useAppStore((s) => s.wantedPoiIds.includes(poi.id))
  const locked =
    useAppStore((s) => s.lockedPoiIds.includes(poi.id)) ||
    useAppStore((s) => s.touchedPoiIds.includes(poi.id))
  const meta = POI_META[poi.type]
  const active = activePoiId === poi.id
  const [isDragging, setDragging] = useState(false)
  const [isDragOver, setDragOver] = useState(false)
  const reorder = useAppStore((s) => s.reorderItem)

  return (
    <motion.div
      layout
      draggable
      onDragStart={(e) => {
        ;(e as unknown as DragEvent).dataTransfer?.setData('text/plain', `${dayIndex}:${itemIndex}`)
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const data = e.dataTransfer?.getData('text/plain') ?? ''
        const [fd, fi] = data.split(':').map(Number)
        if (fd === dayIndex && Number.isFinite(fi) && fi !== itemIndex) {
          reorder(dayIndex, fi, itemIndex)
        }
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={() => focusPoi(poi)}
      onMouseEnter={() => focusPoi(poi)}
      className={[
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-2.5 transition-colors',
        active ? 'border-moss bg-moss-pale/70' : 'border-line bg-white hover:border-moss/40',
        (isWanted || locked) && !active ? 'border-moss/40 shadow-sm' : '',
        isDragging ? 'opacity-50' : '',
        isDragOver ? 'ring-2 ring-moss/40' : '',
      ].join(' ')}
    >
      <PoiImage poi={poi} className="h-14 w-14 shrink-0" rounded="rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium" title={poi.name}>{poi.name}</span>
          {locked && <span title="已锁定：重新生成时保留" className="shrink-0 text-ink-soft/60"><Lock size={11} /></span>}
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label}
          </span>
          {isWanted && (
            <span className="rounded-full bg-moss-pale px-1.5 py-0.5 text-[10px] font-medium text-moss">
              ✓ 你选的
            </span>
          )}
          <DurationDot poi={poi} />
          <span className="flex items-center gap-0.5 text-[11px] text-ink-soft">
            <Star size={10} className="fill-apricot text-apricot" />
            {poi.rating.toFixed(1)}
          </span>
          {poi.ticket && (
            <span title={`门票：${poi.ticket}`} className="rounded-full bg-apricot-pale px-1.5 py-0.5 text-[10px] font-medium text-[#b07a4a]">
              🎫 {poi.ticket}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-soft">{poi.description}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <GripVertical size={14} className="text-ink-soft/40" />
        {canMoveUp && (
          <button
            type="button"
            title="上移"
            onClick={(e) => { e.stopPropagation(); onMoveUp() }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-moss-pale hover:text-moss sm:h-5 sm:w-5"
          >
            ▲
          </button>
        )}
        {canMoveDown && (
          <button
            type="button"
            title="下移"
            onClick={(e) => { e.stopPropagation(); onMoveDown() }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-moss-pale hover:text-moss sm:h-5 sm:w-5"
          >
            ▼
          </button>
        )}
        {canRemove && (
          <button
            type="button"
            title="移除"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-red-50 hover:text-red-400 sm:h-5 sm:w-5"
          >
            <X size={11} />
          </button>
        )}
        {canReplace && poi.type !== 'hotel' && (
          <button
            type="button"
            title="换一个"
            onClick={(e) => { e.stopPropagation(); replacePoi(dayIndex, itemIndex) }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-moss-pale hover:text-moss sm:h-5 sm:w-5"
          >
            <RefreshCw size={10} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function DaySection({ plan, dayIndex }: { plan: DayPlan; dayIndex: number }) {
  const focusCity = useAppStore((s) => s.focusCity)
  const focusPoi = useAppStore((s) => s.focusPoi)
  const reorder = useAppStore((s) => s.reorderItem)
  const replaceHotel = useAppStore((s) => s.replaceHotel)
  const setHoveredDay = useAppStore((s) => s.setHoveredDay)
  const setPinnedDay = useAppStore((s) => s.setPinnedDay)
  const hoveredDay = useAppStore((s) => s.hoveredDay)
  const city = cities.find((c) => c.id === plan.cityId)
  const [hotelOpen, setHotelOpen] = useState(false)

  // 落地/离开转场日：仅展示
  if (!city) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-white/60 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-soft text-xs font-bold text-white">
            {dayIndex + 1}
          </span>
          <h3 className="font-serif-sc text-lg">第 {dayIndex + 1} 天 · {plan.cityName ?? plan.cityId}</h3>
          <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-ink-soft">🚄 交通转场日</span>
        </div>
      </section>
    )
  }

  const currentHotel = plan.items.find((p) => p.type === 'hotel')
  const otherItems = plan.items.filter((p) => p.type !== 'hotel')
  const totalMin = (plan.legs ?? []).reduce((s, l) => s + l.minutes, 0)
  const totalKm = Math.round((plan.legs ?? []).reduce((s, l) => s + l.km, 0) * 10) / 10
  const isHovered = hoveredDay === dayIndex

  return (
    <section
      onMouseEnter={() => setHoveredDay(dayIndex)}
      onMouseLeave={() => setHoveredDay(null)}
      className={[
        'rounded-2xl border bg-white/60 p-4 transition-colors',
        isHovered ? 'border-moss/60 ring-1 ring-moss/20' : 'border-line',
        plan.transit ? 'border-dashed' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => focusCity(city)}
        className="flex w-full items-center gap-2 transition hover:text-moss"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
            plan.transit ? 'bg-ink-soft' : 'bg-moss'
          }`}
        >
          {dayIndex + 1}
        </span>
        <h3 className="font-serif-sc text-lg">第 {dayIndex + 1} 天 · {city.name}</h3>
        <span className="text-base">{city.emoji}</span>
        <MapPin size={13} className="text-ink-soft" />
        {plan.transit && (
          <span className="ml-1 rounded-full bg-cream px-2 py-0.5 text-xs text-ink-soft">🚄 交通转场日</span>
        )}
        {plan.legs && plan.legs.length > 0 && (
          <span className="ml-auto text-[11px] text-ink-soft">
            🚶 城内约 {totalMin} 分钟 · {totalKm}km
          </span>
        )}
      </button>

      {/* 今日预估数据栏：步数 / 移动耗时（含出站步行）/ 强度等级 */}
      {!plan.transit && plan.items.length > 0 && (() => {
        const st = dayStats(plan)
        return (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-cream/70 px-3 py-2 text-[11px]">
            <span className={st.level === '较高' ? 'text-red-500' : 'text-ink-soft'}>
              🚶 今日预估步行：{(st.steps / 10000).toFixed(1)} 万步（约 {st.km}km）
            </span>
            <span className={st.level === '较高' ? 'text-red-500' : 'text-ink-soft'}>
              ⏱ 移动耗时：{st.moveMin} 分钟
            </span>
            <span className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_STYLE[st.level]}`}>
              🏷 强度等级：{st.level}
            </span>
            {st.level === '较高' && (
              <span className="font-medium text-red-500">今日强度偏高，建议删减 1 个点</span>
            )}
          </div>
        )
      })()}

      <div className="mt-3 space-y-1">
        {plan.items.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-cream/60 py-6 text-center text-xs text-ink-soft">
            当天点位因闭馆等原因未安排，建议自由活动或调整日期
          </p>
        )}

        {otherItems.map((poi, i) => {
          // plan.legs[i-1] 是从"前一个 otherItem"到"当前 otherItem"的交通
          // 放在当前 POI 卡片"上方"作为连接线（i>0 才有上一段）
          const leg = i > 0 ? plan.legs?.[i - 1] : undefined
          const n = otherItems.length
          const lunchAfter = Math.ceil(n / 2) - 1
          const showLunch = !plan.transit && n >= 2 && i === lunchAfter
          const showDinner = !plan.transit && n >= 3 && i === n - 1
          return (
          <div key={poi.id}>
            {leg && <LegLine leg={leg} from={otherItems[i - 1]?.name} to={poi.name} />}
            <ItineraryItemCard
              poi={poi}
              dayIndex={dayIndex}
              itemIndex={plan.items.indexOf(poi)}
              canReplace={city.pois.filter((p) => p.type === poi.type).length > 1}
              canRemove={true}
              canMoveUp={i > 0}
              canMoveDown={i < otherItems.length - 1}
              onMoveUp={() => reorder(dayIndex, plan.items.indexOf(poi), plan.items.indexOf(otherItems[i - 1]))}
              onMoveDown={() => reorder(dayIndex, plan.items.indexOf(poi), plan.items.indexOf(otherItems[i + 1]))}
              onRemove={() => reorder(dayIndex, plan.items.indexOf(poi), null)}
            />
            {showLunch && (
              <MealSlot kind="午餐" time="12:00 - 13:30" area={nearestFoodArea(city.id, poi)} />
            )}
            {showDinner && (
              <MealSlot kind="晚餐" time="18:00 - 19:30" area={nearestFoodArea(city.id, poi)} />
            )}
          </div>
        )})}

        {/* 酒店（多选） */}
        {currentHotel && (
          <div className="mt-2 rounded-2xl border border-line bg-white">
            <button
              type="button"
              onClick={() => {
                setHotelOpen((v) => !v)
                // 地图联动：飞到酒店并钉住当天动线高亮（不受鼠标移出影响），4 秒后解除
                focusPoi(currentHotel)
                setPinnedDay(dayIndex)
                window.setTimeout(() => setPinnedDay(null), 4000)
              }}
              className="flex w-full items-center gap-3 p-2.5"
            >
              <PoiImage poi={currentHotel} className="h-12 w-12 shrink-0" rounded="rounded-xl" />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <Hotel size={12} className="text-moss" />
                  <span className="text-sm font-medium">住宿 · {currentHotel.name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                  <span className="font-medium text-apricot">{formatPriceRange(currentHotel.id)}</span>
                  <span className="text-ink-soft">· ★{currentHotel.rating.toFixed(1)}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-soft">{currentHotel.description}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-ink-soft">
                <span>{Math.max(0, (plan.hotelCandidates?.length ?? 1) - 1)} 个备选</span>
                <ChevronDown size={12} className={hotelOpen ? 'rotate-180' : ''} />
              </div>
            </button>
            <AnimatePresence>
              {hotelOpen && plan.hotelCandidates && plan.hotelCandidates.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-line"
                >
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {plan.hotelCandidates.map((h) => {
                      const active = h.id === currentHotel.id
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => replaceHotel(dayIndex, h.id)}
                          className={[
                            'flex items-center gap-2 rounded-xl border p-1.5 text-left transition',
                            active ? 'border-moss bg-moss-pale' : 'border-line bg-cream hover:border-moss/50',
                          ].join(' ')}
                        >
                          <PoiImage poi={h} className="h-9 w-9 shrink-0" rounded="rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-[11px] font-medium leading-tight" title={h.name}>{h.name}</div>
                            <div className="text-[10px] font-medium text-apricot">{formatPriceRange(h.id)}</div>
                            <div className="text-[10px] text-ink-soft">★{h.rating.toFixed(1)}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  )
}

export default function ItineraryPlanner() {
  const itinerary = useAppStore((s) => s.itinerary)
  const tripParams = useAppStore((s) => s.tripParams)
  const setStep = useAppStore((s) => s.setStep)

  const totalItems = itinerary.reduce((sum, d) => sum + d.items.length, 0)
  const cityNames = [...new Set(itinerary.map((d) => d.cityId))]
    .map((id) => cities.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(' · ')
  const itineraryView = useAppStore((s) => s.itineraryView)
  const setItineraryView = useAppStore((s) => s.setItineraryView)

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex items-center gap-1 text-sm text-ink-soft transition hover:text-ink"
        >
          <ChevronLeft size={16} />
          返回修改参数
        </button>

      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium tracking-wide text-moss">
            <Sparkles size={14} />
            STEP 4 · AI 行程规划
          </p>
          <h2 className="mt-1 font-serif-sc text-2xl leading-snug">你的专属行程出炉了</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {cityNames} · {tripParams.days} 天 · {totalItems} 个安排 · 拖动调整顺序<span className="sm:hidden">（手机推荐用卡片右侧 ▲▼）</span>
          </p>
        </div>
      </div>

      <div className="mt-3">
        <PlanManager />
      </div>

      {/* 视图切换：卡片 / 时间轴 */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-ink-soft">视图</span>
        <div className="flex rounded-full border border-line bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setItineraryView('card')}
            className={`rounded-full px-3 py-1 transition ${itineraryView === 'card' ? 'bg-moss text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            📋 卡片
          </button>
          <button
            type="button"
            onClick={() => setItineraryView('timeline')}
            className={`rounded-full px-3 py-1 transition ${itineraryView === 'timeline' ? 'bg-moss text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            📅 时间轴
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {itineraryView === 'card' ? (
          itinerary.map((plan, dayIndex) => (
            <DaySection key={`${plan.cityId}-${dayIndex}`} plan={plan} dayIndex={dayIndex} />
          ))
        ) : (
          <ItineraryTimeline />
        )}
      </div>
    </div>
  )
}
