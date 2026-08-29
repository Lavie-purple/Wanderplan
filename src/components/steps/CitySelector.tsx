import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronLeft, ChevronUp, Search, Sparkles, X } from 'lucide-react'
import { cities } from '../../data/cities'
import { CONTINENTS, countries, COUNTRY_RANK } from '../../data/countries'
import { POI_META, SELECTABLE_POI_TYPES } from '../../types'
import type { City, Poi } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import CityCard from '../cards/CityCard'
import { matchScore } from '../../utils/match'
import { PoiImage } from '../poi/PoiImage'


/** 耗时小圆点：红=深度耗时（≥3h）/ 绿=轻松路过（≤1.5h）——与地图标注同款暗示 */
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

const WEEKDAYS = '日一二三四五六'

/** TOP1/TOP2 角标：紧贴 chip 文字右侧，比文字小一档（不遮挡） */
function TopBadge({ rank }: { rank: number }) {
  if (rank < 1 || rank > 2) return null
  return (
    <span
      className="ml-1 inline-flex h-3.5 items-center rounded-full px-1 text-[8px] font-extrabold leading-none"
      style={{
        background: rank === 1 ? 'linear-gradient(135deg, #f5a623, #f5cf67)' : 'linear-gradient(135deg, #a4c9a0, #cfe1cb)',
        color: rank === 1 ? '#5a3b00' : '#1d3a26',
        transform: 'translateY(-1px)',
      }}
    >
      TOP{rank}
    </span>
  )
}

export default function CitySelector() {
  const [query, setQuery] = useState('')
  // 每个城市的 POI 区独立展开 / 折叠
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // 整个城市列表整体折叠
  const [listCollapsed, setListCollapsed] = useState(false)

  const preferences = useAppStore((s) => s.preferences)
  const selectedContinentId = useAppStore((s) => s.selectedContinentId)
  const setContinent = useAppStore((s) => s.setContinent)
  const selectedCountryId = useAppStore((s) => s.selectedCountryId)
  const setCountry = useAppStore((s) => s.setCountry)
  const previewCountry = useAppStore((s) => s.previewCountry)
  const selectedCityIds = useAppStore((s) => s.selectedCityIds)
  const wantedPoiIds = useAppStore((s) => s.wantedPoiIds)
  const toggleWantedPoi = useAppStore((s) => s.toggleWantedPoi)
  const toggleCity = useAppStore((s) => s.toggleCity)
  const focusCity = useAppStore((s) => s.focusCity)
  const focusPoi = useAppStore((s) => s.focusPoi)
  const setStep = useAppStore((s) => s.setStep)

  // 1. 城市池：当前国家
  const pool = useMemo(
    () => cities.filter((c) => c.countryId === selectedCountryId),
    [selectedCountryId],
  )
  const sorted = useMemo(
    () => [...pool].sort((a, b) => matchScore(b, preferences) - matchScore(a, preferences)),
    [pool, preferences],
  )
  const keyword = query.trim()
  const filtered = keyword
    ? sorted.filter((c) => c.name.includes(keyword) || c.province.includes(keyword))
    : sorted

  // 2. 已选 vs 未选，统一在同一张列表（已选置顶）
  const selectedSet = new Set(selectedCityIds)
  const orderedCities: City[] = [
    ...filtered.filter((c) => selectedSet.has(c.id)),
    ...filtered.filter((c) => !selectedSet.has(c.id)),
  ]

  const toggleExpanded = (cityId: string) =>
    setExpanded((e) => ({ ...e, [cityId]: !e[cityId] }))

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      {/* 头部 */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-sm text-ink-soft transition hover:text-ink"
        >
          <ChevronLeft size={16} />
          返回测评
        </button>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-moss">STEP 2 · 选择目的地</p>
            <h2 className="mt-1 font-serif-sc text-2xl leading-snug">
              根据你的偏好，为你推荐
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              悬停卡片在地图预览 · 点击城市加入行程 · 点击「展开」勾选想去的地点
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-apricot-pale text-lg">
            <Sparkles size={18} className="text-apricot" />
          </span>
        </div>
      </div>

      {/* 大洲一级选择 */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {CONTINENTS.map((continent, idx) => {
          const active = selectedContinentId === continent.id
          const continentRank = idx < 2 ? idx + 1 : 0
          return (
            <button
              key={continent.id}
              type="button"
              onClick={() => setContinent(continent.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-moss bg-moss text-white shadow-sm'
                  : 'border-line bg-white text-ink-soft hover:border-moss/40 hover:text-ink'
              }`}
            >
              <span>{continent.emoji}</span>
              {continent.name}
              {continentRank > 0 && <TopBadge rank={continentRank} />}
            </button>
          )
        })}
      </div>

      {/* 国家二级选择 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {countries
          .filter((c) => c.continent === selectedContinentId)
          .map((country) => {
            const active = selectedCountryId === country.id
            const cRank = COUNTRY_RANK[country.id] ?? 0
            return (
              <button
                key={country.id}
                type="button"
                onClick={() => setCountry(country.id)}
                onMouseEnter={() => previewCountry(country.id)}
                title={country.description}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? 'border-moss bg-moss text-white shadow-sm'
                    : 'border-line bg-white text-ink-soft hover:border-moss/40 hover:text-ink'
                }`}
              >
                <span>{country.emoji}</span>
                {country.name}
                {cRank > 0 && <TopBadge rank={cRank} />}
              </button>
            )
          })}
      </div>

      {/* 搜索 + 整体折叠 */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索城市或地区…"
            className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-ink-soft/60 focus:border-moss/50 focus:ring-2 focus:ring-moss-pale"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setListCollapsed((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 py-2 text-xs text-ink-soft transition hover:border-moss/50 hover:text-moss"
          title={listCollapsed ? '展开所有城市' : '折叠所有城市'}
        >
          {listCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {listCollapsed ? '展开' : '折叠'}
        </button>
      </div>

      {/* 合并：已选 + 未选 城市列表（已选置顶，POI 区可折叠） */}
      <div className="space-y-3">
        {orderedCities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 py-12 text-center text-sm text-ink-soft">
            没有找到相关城市，换个关键词试试～
          </div>
        ) : (
          orderedCities.map((city) => {
            const isSelected = selectedSet.has(city.id)
            const isOpen = listCollapsed ? false : (expanded[city.id] ?? isSelected)
            return (
              <motion.div
                key={city.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`overflow-hidden rounded-2xl border ${
                  isSelected ? 'border-moss/40 bg-moss-pale/30' : 'border-line bg-white'
                }`}
              >
                <CityCard
                  city={city}
                  selected={isSelected}
                  match={matchScore(city, preferences)}
                  onToggle={() => toggleCity(city)}
                  onHover={() => focusCity(city)}
                />
                {/* 折叠/展开按钮 + 已勾选 POI 计数 */}
                <div className="flex items-center justify-between border-t border-line/60 px-3 py-1.5 text-[11px] text-ink-soft">
                  <span>
                    {wantedPoiIds.filter((id) => city.pois.some((p) => p.id === id)).length > 0 && (
                      <>
                        已选 <b className="text-moss">{wantedPoiIds.filter((id) => city.pois.some((p) => p.id === id)).length}</b> 个想去的地点
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(city.id)}
                    className="flex items-center gap-0.5 text-ink-soft transition hover:text-moss"
                  >
                    {isOpen ? '收起 POI' : '展开 POI'}
                    {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-line/60 bg-white"
                    >
                      <div className="space-y-2.5 p-3">
                        {SELECTABLE_POI_TYPES.map((type) => {
                          const group = city.pois.filter((poi) => poi.type === type)
                          if (group.length === 0) return null
                          const meta = POI_META[type]
                          const verb =
                            type === 'attraction'
                              ? '看景点'
                              : type === 'culture'
                                ? '品人文'
                                : type === 'food'
                                  ? '吃美食'
                                  : '逛购物'
                          return (
                            <div key={type}>
                              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: meta.color }}>
                                <span>{meta.emoji}</span>
                                {verb}
                              </div>
                              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {group.map((poi) => {
                                  const wanted = wantedPoiIds.includes(poi.id)
                                  return (
                                    <button
                                      key={poi.id}
                                      type="button"
                                      onClick={() => toggleWantedPoi(poi)}
                                      onMouseEnter={() => focusPoi(poi)}
                                      title="悬停在地图上查看 · 点击加入想去清单"
                                      className={`group flex items-center gap-2 overflow-hidden rounded-xl border p-1.5 text-left transition ${
                                        wanted
                                          ? 'border-moss bg-moss-pale'
                                          : 'border-line bg-cream hover:border-moss/50 hover:bg-moss-pale'
                                      }`}
                                    >
                                      <PoiImage
                                        poi={poi}
                                        className="h-12 w-12 shrink-0"
                                        rounded="rounded-lg"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div
                                          className="flex items-start gap-1 text-xs font-medium leading-tight"
                                          title={poi.name}
                                        >
                                          <span className="shrink-0">{meta.emoji}</span>
                                          <span className="line-clamp-2 break-all">{poi.name}</span>
                                        </div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-soft">
                                          <DurationDot poi={poi} />
                                          <span>★{poi.rating}</span>
                                          {poi.ticket && (
                                            <span title={`门票：${poi.ticket}`} className="text-[#b07a4a]">🎫{poi.ticket}</span>
                                          )}
                                          {poi.closedDays && poi.closedDays.length > 0 && (
                                            <span>周{WEEKDAYS[poi.closedDays[0]]}休</span>
                                          )}
                                          {wanted && <Check size={10} className="text-moss" />}
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      {/* 底部：下一步 */}
      <div className="sticky bottom-0 mt-6 -mx-5 border-t border-line bg-cream/90 px-5 py-3 backdrop-blur">
        {selectedCityIds.length > 0 ? (
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setStep(3)}
            className="w-full rounded-full bg-moss py-3 text-sm font-medium text-white shadow-md transition hover:bg-moss-light"
          >
            已选 {selectedCityIds.length} 座城市
            {wantedPoiIds.length > 0 && ` · ${wantedPoiIds.length} 个想去的地点`}
            {' · 下一步：填写旅行参数'}
          </motion.button>
        ) : (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-full border border-line bg-white py-3 text-sm text-ink-soft"
          >
            点击上方城市卡片，开始组建你的行程
          </button>
        )}
      </div>
    </div>
  )
}
