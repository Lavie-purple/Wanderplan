import { useMemo } from 'react'
import { Calendar, Footprints, Train, Bus, Car } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Poi } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { PoiImage } from '../poi/PoiImage'
import { cities } from '../../data/cities'

interface SlotItem {
  poi: Poi
  /** 时段：'morning' | 'noon' | 'afternoon' | 'evening' */
  slot: 'morning' | 'noon' | 'afternoon' | 'evening'
  /** 大致时间文本 */
  timeText: string
}

const SLOTS: SlotItem['slot'][] = ['morning', 'noon', 'afternoon', 'evening']
const SLOT_LABEL: Record<SlotItem['slot'], string> = {
  morning: '上午',
  noon: '中午',
  afternoon: '下午',
  evening: '傍晚',
}
const SLOT_TIME: Record<SlotItem['slot'], string> = {
  morning: '08:00-12:00',
  noon: '12:00-13:30',
  afternoon: '13:30-18:00',
  evening: '18:00-22:00',
}

/** 根据 POI 类型与位置给每个点位安排一个时段 */
function assignSlot(items: Poi[]): SlotItem[] {
  const out: SlotItem[] = []
  const hourByType: Record<string, number> = {
    food: 12,         // 美食类 12:00
    attraction: 9,    // 景点 上午
    culture: 14,      // 人文 下午
    shopping: 16,     // 购物 下午
    hotel: 21,        // 酒店 入住
    transport: 7,     // 交通 早
  }
  for (let i = 0; i < items.length; i++) {
    const poi = items[i]
    const base = hourByType[poi.type] ?? 10
    const hour = base + (i * 1.5)
    let slot: SlotItem['slot'] = 'morning'
    if (hour < 12) slot = 'morning'
    else if (hour < 13.5) slot = 'noon'
    else if (hour < 18) slot = 'afternoon'
    else slot = 'evening'
    const hh = Math.floor(hour) % 24
    const mm = Math.round((hour - Math.floor(hour)) * 60)
    out.push({ poi, slot, timeText: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` })
  }
  return out
}

function LegPill({ mode, line, minutes }: { mode: 'walk' | 'metro' | 'bus' | 'taxi'; line?: string; minutes: number }) {
  const Icon = mode === 'walk' ? Footprints : mode === 'metro' ? Train : mode === 'bus' ? Bus : Car
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream/80 px-2 py-0.5 text-[10px] text-ink-soft">
      <Icon size={9} className="text-moss" />
      {mode === 'walk' ? '步行' : mode === 'metro' ? `地铁${line ?? ''}` : mode === 'bus' ? `公交${line ?? ''}` : '打车'} {minutes}m
    </span>
  )
}

export default function ItineraryTimeline() {
  const itinerary = useAppStore((s) => s.itinerary)
  const hoveredDay = useAppStore((s) => s.hoveredDay)
  const setHoveredDay = useAppStore((s) => s.setHoveredDay)
  const focusPoi = useAppStore((s) => s.focusPoi)
  const weatherByDate = useAppStore((s) => s.weatherByDate)
  const tripParams = useAppStore((s) => s.tripParams)

  const days = useMemo(() => {
    return itinerary.map((d, i) => {
      const date = new Date(tripParams.startDate)
      date.setDate(date.getDate() + i)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      return { plan: d, date: key, dayIndex: i }
    })
  }, [itinerary, tripParams.startDate])

  return (
    <div className="relative">
      {/* 横向滚动容器：移动端可横滑，桌面端铺满 */}
      <div
        className="snap-x snap-mandatory overflow-x-auto pb-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex min-w-max gap-2.5 px-1 pt-1">
          {days.map(({ plan, date, dayIndex }) => {
            const city = cities.find((c) => c.id === plan.cityId)
            const slots = assignSlot(plan.items)
            const bySlot: Record<SlotItem['slot'], SlotItem[]> = {
              morning: [], noon: [], afternoon: [], evening: [],
            }
            slots.forEach((s) => bySlot[s.slot].push(s))
            const w = weatherByDate[date]
            const isRainy = w?.rainy
            const isHovered = hoveredDay === dayIndex

            return (
              <motion.div
                key={`${plan.cityId}-${dayIndex}`}
                onMouseEnter={() => setHoveredDay(dayIndex)}
                onMouseLeave={() => setHoveredDay(null)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={[
                  'flex w-[200px] shrink-0 snap-start flex-col rounded-2xl border bg-white/70 p-2.5 transition-colors',
                  plan.transit ? 'border-dashed border-line' : isHovered ? 'border-moss ring-1 ring-moss/30' : 'border-line',
                ].join(' ')}
              >
                {/* 日期与城市 */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={['flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white', plan.transit ? 'bg-ink-soft' : 'bg-moss'].join(' ')}>
                      {dayIndex + 1}
                    </span>
                    <div className="leading-tight">
                      <div className="text-xs font-medium">
                        {String(date.slice(5, 7))}/{String(date.slice(8, 10))}
                      </div>
                      <div className="text-[10px] text-ink-soft">
                        {['日', '一', '二', '三', '四', '五', '六'][new Date(date).getDay()]}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-ink-soft">
                    <span>{city?.emoji}</span>
                    <span className="max-w-[64px] truncate">{city?.name ?? plan.cityName}</span>
                  </div>
                </div>

                {/* 天气小标 */}
                {w && (
                  <div className={['mb-2 rounded-lg px-1.5 py-0.5 text-center text-[10px]', isRainy ? 'bg-sky-100 text-sky-700' : 'bg-apricot-pale text-apricot'].join(' ')}>
                    {w.rainy ? '🌧️' : w.code === 0 ? '☀️' : '⛅'} {w.tmin}° / {w.tmax}°
                  </div>
                )}

                {/* 早中晚格子 */}
                <div className="space-y-1.5">
                  {SLOTS.map((slot) => {
                    const items = bySlot[slot]
                    return (
                      <div key={slot} className="rounded-lg border border-line/60 bg-cream/40 p-1.5">
                        <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-ink-soft">
                          <span>{SLOT_LABEL[slot]}</span>
                          <span>{SLOT_TIME[slot]}</span>
                        </div>
                        {(() => {
                          // 傍晚只剩酒店（入住≠晚餐活动）时，在酒店前保留晚餐自由时段
                          const onlyHotel =
                            slot === 'evening' && items.length > 0 && items.every((x) => x.poi.type === 'hotel')
                          const freeText =
                            slot === 'noon'
                              ? '自由活动（午餐时间）'
                              : slot === 'evening'
                                ? '自由活动（晚餐时间）'
                                : '自由活动'
                          if (items.length === 0) {
                            return (
                              <div className={`h-8 rounded border border-dashed text-center text-[10px] leading-8 ${slot === 'noon' || slot === 'evening' ? 'border-apricot/50 bg-apricot-pale/30 text-[#b07a4a]' : 'border-line/50 text-ink-soft/60'}`}>
                                {freeText}
                              </div>
                            )
                          }
                          return (
                            <div className="space-y-1">
                              {onlyHotel && (
                                <div className={`h-8 rounded border border-dashed text-center text-[10px] leading-8 ${slot === 'evening' ? 'border-apricot/50 bg-apricot-pale/30 text-[#b07a4a]' : 'border-line/50 text-ink-soft/60'}`}>
                                  {freeText}
                                </div>
                              )}
                              {items.map((s, i) => {
                                const prev = items[i - 1]
                                const prevPoiIndex = prev ? plan.items.findIndex((p) => p.id === prev.poi.id) : -1
                                const leg = prevPoiIndex >= 0 ? plan.legs?.[prevPoiIndex] : undefined
                                return (
                                  <div key={s.poi.id}>
                                    {leg && (
                                      <div className="my-0.5 flex items-center gap-1 text-[9px] text-ink-soft">
                                        <span className="h-px flex-1 bg-line" />
                                        <LegPill mode={leg.mode} line={leg.line} minutes={leg.minutes} />
                                        <span className="h-px flex-1 bg-line" />
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => focusPoi(s.poi)}
                                      onMouseEnter={() => focusPoi(s.poi)}
                                      className="flex w-full items-center gap-1.5 rounded-md border border-line/60 bg-white px-1.5 py-1 text-left transition hover:border-moss/50 hover:bg-moss-pale"
                                    >
                                      <PoiImage poi={s.poi} className="h-7 w-7 shrink-0" rounded="rounded" />
                                      <div className="min-w-0 flex-1">
                                        <div className="line-clamp-2 text-[10px] font-medium leading-tight" title={s.poi.name}>{s.poi.name}</div>
                                        <div className="text-[9px] text-ink-soft">{s.timeText} · ★{s.poi.rating.toFixed(1)}</div>
                                      </div>
                                      {s.poi.type !== 'hotel' && (
                                        <span
                                          title="预估游玩时长"
                                          className={`shrink-0 self-center text-[9px] font-medium ${
                                            (s.poi.duration ?? 2) >= 3 ? 'text-red-400' : 'text-ink-soft/70'
                                          }`}
                                        >
                                          ⏱ {s.poi.duration ?? 2}h
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}
                </div>

                {plan.transit && (
                  <div className="mt-1.5 rounded bg-cream/60 py-0.5 text-center text-[10px] text-ink-soft">
                    🚄 交通转场日
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-soft">
        <Calendar size={11} />
        横向时间轴 · 悬停某天联动地图 · 点击点位在地图定位
      </p>
    </div>
  )
}
