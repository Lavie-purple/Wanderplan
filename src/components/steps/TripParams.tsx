import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Coins,
  Loader2,
  Minus,
  MoveDown,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { cities } from '../../data/cities'
import { TRANSPORT_META, legHours } from '../../utils/transport'
import { pseudoCity, resolveEndPoint, resolveRouteOrder } from '../../utils/route'
import type { BudgetLevel, City, CompanionType, StayType, StayLocation, CityTransport, TransportMode } from '../../types'
import { useAppStore } from '../../store/useAppStore'

const BUDGET_OPTIONS: { id: BudgetLevel; label: string; desc: string }[] = [
  { id: 'economy', label: '经济穷游', desc: '精打细算，体验不减' },
  { id: 'comfort', label: '舒适出行', desc: '主流选择，吃住平衡' },
  { id: 'luxury', label: '轻奢享受', desc: '该省省该花花' },
]

const TRANSPORT_OPTIONS: TransportMode[] = ['plane', 'train', 'bus', 'car']

const COMPANION_OPTIONS: { id: CompanionType; label: string }[] = [
  { id: 'solo', label: '独自出行' },
  { id: 'couple', label: '情侣二人' },
  { id: 'family', label: '家庭亲子' },
  { id: 'elders', label: '带上长辈' },
  { id: 'friends', label: '朋友结伴' },
]

/** 落地时刻快捷选项 */
const ARRIVAL_TIME_PRESETS: { time: string; label: string }[] = [
  { time: '12:00', label: '中午前' },
  { time: '15:00', label: '下午' },
  { time: '20:00', label: '晚上' },
]

/** 离开时刻快捷选项（null = 不赶时间） */
const DEPARTURE_TIME_PRESETS: { time: string | null; label: string }[] = [
  { time: null, label: '不赶时间' },
  { time: '12:00', label: '中午前' },
  { time: '18:00', label: '傍晚' },
]

const STAY_TYPE_OPTIONS: { id: StayType; label: string }[] = [
  { id: 'chain', label: '连锁酒店' },
  { id: 'homestay', label: '民宿客栈' },
  { id: 'upscale', label: '高档酒店' },
]

const STAY_LOCATION_OPTIONS: { id: StayLocation; label: string }[] = [
  { id: 'nearSpot', label: '景点旁' },
  { id: 'nearStation', label: '交通枢纽旁' },
]

const CITY_TRANSPORT_OPTIONS: { id: CityTransport; label: string; desc: string }[] = [
  { id: 'transit', label: '公共交通优先', desc: '经济实惠，点位就近串联' },
  { id: 'taxi', label: '打车为主', desc: '行程更紧凑，省时省力' },
]

/** 建议路线预设 */
const ROUTE_PRESETS: { id: 'A' | 'B' | 'C' | 'D'; label: string; desc: string }[] = [
  { id: 'A', label: '路线A', desc: '按城市选择顺序游览' },
  { id: 'B', label: '路线B', desc: '按选择顺序逆序游览' },
  { id: 'C', label: '路线C', desc: '由南向北游览（减少回头路）' },
  { id: 'D', label: '最短路程', desc: 'TSP 智能优化总里程' },
]

/** WMO 天气代码 → emoji */
function wmoEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '🌤️'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 57) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  return '⛈️'
}
const WEEKDAYS = '日一二三四五六'

/** 端点选择器：已选城市 chips + 其他城市（搜索已知城市 / 自定义输入） */
function PlacePicker({
  title,
  emojiIcon,
  hint,
  tourismCities,
  allCities,
  cityId,
  custom,
  sameChipLabel,
  sameActive,
  onSame,
  onPick,
  onClear,
}: {
  title: string
  emojiIcon: string
  hint: string
  tourismCities: City[]
  allCities: City[]
  cityId: string | null
  custom: string | null
  sameChipLabel?: string
  sameActive?: boolean
  onSame?: () => void
  onPick: (cityId: string | null, custom: string | null) => void
  onClear: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const known = allCities.find((c) => c.id === cityId)
  const hasValue = known != null || custom != null

  const commit = () => {
    const name = text.trim()
    if (!name) return
    const match = allCities.find((c) => c.name === name)
    if (match) onPick(match.id, null)
    else onPick(null, name)
    setText('')
    setExpanded(false)
  }

  const chipCls = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition ${
      active
        ? 'border-moss bg-moss-pale font-medium text-ink'
        : 'border-line bg-cream text-ink-soft hover:border-moss/40'
    }`

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium">
        {emojiIcon} {title}
        <span className="text-xs font-normal text-ink-soft">（{hint}）</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sameChipLabel && onSame && (
          <button type="button" onClick={onSame} className={chipCls(!!sameActive)}>
            🔁 {sameChipLabel}
          </button>
        )}
        {!sameChipLabel && (
          <button type="button" onClick={onClear} className={chipCls(!hasValue)}>
            暂不确定
          </button>
        )}
        {tourismCities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id, null)}
            className={chipCls(cityId === c.id)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
        {(hasValue && !known) || (known && !tourismCities.some((t) => t.id === cityId)) ? (
          <span className={chipCls(true)}>
            📍 {known?.name ?? custom}
            <button type="button" onClick={onClear} className="ml-1 text-ink-soft hover:text-ink">
              <X size={11} />
            </button>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`rounded-full border border-dashed px-3 py-1.5 text-xs transition ${
            expanded ? 'border-moss text-moss' : 'border-line text-ink-soft hover:border-moss/40'
          }`}
        >
          📍 其他城市
        </button>
      </div>

      {expanded && (
        <div className="mt-2 rounded-xl border border-line bg-cream p-2.5">
          <div className="flex gap-2">
            <input
              list={`cities-dl-${title}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              placeholder="输入或选择城市名（如 上海）"
              className="flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs outline-none focus:border-moss/50"
            />
            <button
              type="button"
              onClick={commit}
              className="rounded-lg bg-moss px-3 py-1.5 text-xs font-medium text-white transition hover:bg-moss-light"
            >
              确定
            </button>
          </div>
          <datalist id={`cities-dl-${title}`}>
            {allCities.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <p className="mt-1.5 text-[10px] text-ink-soft/80">
            匹配到已知城市可提供天气与交通估算；其他城市仅作路线标注
          </p>
        </div>
      )}
    </div>
  )
}

const LOADING_MESSAGES = [
  '正在分析你的旅行偏好…',
  '正在挑选最匹配的景点与美食…',
  '正在编排每日路线与节奏…',
]


/** 极简折叠卡片：标题 + 一行当前状态摘要 + 展开内容 */
function FoldCard({
  emoji,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  emoji: string
  title: string
  summary?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const storeKey = `wanderplan.fold.${title}`
  const [open, setOpen] = useState(() => {
    if (typeof localStorage === 'undefined') return defaultOpen
    const saved = localStorage.getItem(storeKey)
    return saved == null ? defaultOpen : saved === '1'
  })
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <button
        type="button"
        onClick={() =>
          setOpen((v) => {
            try {
              localStorage.setItem(storeKey, v ? '0' : '1')
            } catch {
              /* ignore */
            }
            return !v
          })}
        className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
      >
        <span className="text-lg">{emoji}</span>
        <span className="shrink-0 text-sm font-medium">{title}</span>
        {summary && (
          <span className="ml-1 truncate text-xs text-ink-soft">{summary}</span>
        )}
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-ink-soft transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="space-y-4 border-t border-dashed border-line p-4">{children}</div>}
    </div>
  )
}

export default function TripParams() {
  const [generating, setGenerating] = useState(false)
  const [loadingIndex, setLoadingIndex] = useState(0)

  const selectedCityIds = useAppStore((s) => s.selectedCityIds)
  const arrivalCityId = useAppStore((s) => s.arrivalCityId)
  const setArrivalCity = useAppStore((s) => s.setArrivalCity)
  const arrivalCustom = useAppStore((s) => s.arrivalCustom)
  const setArrivalCustom = useAppStore((s) => s.setArrivalCustom)
  const departureSameAsArrival = useAppStore((s) => s.departureSameAsArrival)
  const setDepartureSameAsArrival = useAppStore((s) => s.setDepartureSameAsArrival)
  const departureCityId = useAppStore((s) => s.departureCityId)
  const setDepartureCityId = useAppStore((s) => s.setDepartureCityId)
  const departureCustom = useAppStore((s) => s.departureCustom)
  const setDepartureCustom = useAppStore((s) => s.setDepartureCustom)
  const originCityId = useAppStore((s) => s.originCityId)
  const setOriginCity = useAppStore((s) => s.setOriginCity)
  const originCustom = useAppStore((s) => s.originCustom)
  const setOriginCustom = useAppStore((s) => s.setOriginCustom)
  const returnCityId = useAppStore((s) => s.returnCityId)
  const setReturnCity = useAppStore((s) => s.setReturnCity)
  const returnCustom = useAppStore((s) => s.returnCustom)
  const setReturnCustom = useAppStore((s) => s.setReturnCustom)
  const routeChoice = useAppStore((s) => s.routeChoice)
  const setRouteChoice = useAppStore((s) => s.setRouteChoice)
  const manualOrder = useAppStore((s) => s.manualOrder)
  const setManualOrder = useAppStore((s) => s.setManualOrder)
  const routePicking = useAppStore((s) => s.routePicking)
  const setRoutePicking = useAppStore((s) => s.setRoutePicking)
  const pickingOrder = useAppStore((s) => s.pickingOrder)
  const interCityTransport = useAppStore((s) => s.interCityTransport)
  const setInterCityTransport = useAppStore((s) => s.setInterCityTransport)
  const tripParams = useAppStore((s) => s.tripParams)
  const updateTripParams = useAppStore((s) => s.updateTripParams)
  const manualDayCities = useAppStore((s) => s.manualDayCities)
  const setManualDayCities = useAppStore((s) => s.setManualDayCities)
  const generateItinerary = useAppStore((s) => s.generateItinerary)
  const setStep = useAppStore((s) => s.setStep)

  const selectedCities = useMemo(
    () =>
      selectedCityIds
        .map((id) => cities.find((c) => c.id === id))
        .filter((c): c is NonNullable<typeof c> => c != null),
    [selectedCityIds],
  )

  // 落地端点（可为非旅游城市）
  const arrivalEp = useMemo(
    () => resolveEndPoint(arrivalCityId, arrivalCustom, cities),
    [arrivalCityId, arrivalCustom],
  )
  const arrivalInTourism = arrivalCityId != null && selectedCityIds.includes(arrivalCityId)
  const arrivalSeparate = arrivalEp != null && !arrivalInTourism

  // 离开端点
  const depEp = useMemo(
    () =>
      departureSameAsArrival
        ? arrivalEp
        : resolveEndPoint(departureCityId, departureCustom, cities),
    [departureSameAsArrival, departureCityId, departureCustom, arrivalEp],
  )
  const depSeparate =
    depEp != null &&
    (departureSameAsArrival
      ? arrivalSeparate
      : !(departureCityId != null && selectedCityIds.includes(departureCityId)))

  // 有效游览顺序（旅游城市）：落地城市若是旅游城市则置顶
  const orderedCities = useMemo(
    () =>
      resolveRouteOrder(
        selectedCities,
        arrivalInTourism ? arrivalCityId : null,
        routeChoice,
        manualOrder,
      ),
    [selectedCities, arrivalInTourism, arrivalCityId, routeChoice, manualOrder],
  )

  const epToCity = (ep: { name: string; city: City | null }, id: string): City =>
    ep.city ?? pseudoCity(ep.name, id)

  /** 按有效路线展开：第 N 天在哪个城市（含独立落地/离开转场日；用户手动指定优先） */
  const dayCities = useMemo(() => {
    // 用户手动指定：每天所在城市
    if (manualDayCities && manualDayCities.length === tripParams.days) {
      const pool = new Map<string, City>()
      for (const c of orderedCities) pool.set(c.id, c)
      if (arrivalEp?.city) pool.set(arrivalEp.city.id, arrivalEp.city)
      if (depEp?.city) pool.set(depEp.city.id, depEp.city)
      const mapped = manualDayCities
        .map((id) => pool.get(id))
        .filter((c): c is City => c != null)
      if (mapped.length === tripParams.days) return mapped
    }

    const arrDays = arrivalSeparate ? 1 : 0
    const depDays = depSeparate ? 1 : 0
    const tDays = Math.max(0, tripParams.days - arrDays - depDays)

    const n = orderedCities.length
    const alloc: City[] = []
    if (n > 0 && tDays > 0) {
      const base = Math.floor(tDays / n)
      let rem = tDays % n
      for (const c of orderedCities) {
        const count = base + (rem > 0 ? 1 : 0)
        if (rem > 0) rem--
        for (let i = 0; i < count; i++) alloc.push(c)
      }
    }

    const arrCity = arrivalSeparate && arrivalEp ? epToCity(arrivalEp, 'custom-arrival') : null
    const depCity = depSeparate && depEp ? epToCity(depEp, 'custom-departure') : null
    return [...(arrCity ? [arrCity] : []), ...alloc, ...(depCity ? [depCity] : [])].slice(
      0,
      tripParams.days,
    )
  }, [manualDayCities, tripParams.days, orderedCities, arrivalSeparate, arrivalEp, depSeparate, depEp])

  /** 每天可切换的城市候选（旅游城市 + 端点城市，去重） */
  const dayCityOptions = useMemo(() => {
    const map = new Map<string, City>()
    for (const c of orderedCities) map.set(c.id, c)
    if (arrivalEp?.city) map.set(arrivalEp.city.id, arrivalEp.city)
    if (depEp?.city) map.set(depEp.city.id, depEp.city)
    return [...map.values()]
  }, [orderedCities, arrivalEp, depEp])

  /** 手动修改某天所在城市 */
  const setDayCity = (dayIndex: number, cityId: string) => {
    const base = manualDayCities ?? dayCities.map((c) => c.id)
    const next = [...base]
    next[dayIndex] = cityId
    setManualDayCities(next)
  }

  /** 天数/城市/端点变化时，恢复自动分配 */
  useEffect(() => {
    setManualDayCities(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripParams.days, selectedCityIds, arrivalCityId, arrivalCustom, departureSameAsArrival, departureCityId, departureCustom])

  /** 行程第 N 天的日期（YYYY-MM-DD，本地时区） */
  const dateOf = (dayIndex: number) => {
    const d = new Date(tripParams.startDate + 'T00:00:00')
    d.setDate(d.getDate() + dayIndex)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  /** 天数、日期或端点变化时，恢复每日城市自动分配 */
  useEffect(() => {
    setManualDayCities(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripParams.days, tripParams.startDate, selectedCityIds, arrivalCityId, arrivalCustom, departureSameAsArrival, departureCityId, departureCustom])

  /** 微调城市顺序（落地城市固定在起点） */
  const moveCity = (i: number, dir: -1 | 1) => {
    const ids = orderedCities.map((c) => c.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    setManualOrder(ids)
  }

  // 天气查询（Open-Meteo，免费无 Key；预报范围约 16 天）
  // 查询范围：旅游城市 + 独立落地/离开端点城市
  const setRainyDayIndexes = useAppStore((s) => s.setRainyDayIndexes)
  const [weather, setWeather] = useState<Record<string, { date: string; code: number; tmin: number; tmax: number; rainy: boolean }[]>>({})
  const [weatherState, setWeatherState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [weatherMsg, setWeatherMsg] = useState('')

  const weatherCities = useMemo(() => {
    const map = new Map<string, City>()
    for (const c of selectedCities) map.set(c.id, c)
    if (arrivalSeparate && arrivalEp?.city) map.set(arrivalEp.city.id, arrivalEp.city)
    if (depSeparate && depEp?.city) map.set(depEp.city.id, depEp.city)
    return [...map.values()]
  }, [selectedCities, arrivalSeparate, arrivalEp, depSeparate, depEp])

  const localDateStr = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  useEffect(() => {
    if (weatherCities.length === 0) return
    let cancelled = false
    setWeatherState('loading')
    const start = tripParams.startDate
    const endDate = (() => {
      const d = new Date(start + 'T00:00:00')
      d.setDate(d.getDate() + tripParams.days - 1)
      return localDateStr(d)
    })()

    Promise.all(
      weatherCities.map(async (c) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.location[0]}&longitude=${c.location[1]}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${start}&end_date=${endDate}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const days = data.daily.time.map((t: string, i: number) => ({
          date: t as string,
          code: data.daily.weather_code[i] as number,
          tmin: Math.round(data.daily.temperature_2m_min[i]) as number,
          tmax: Math.round(data.daily.temperature_2m_max[i]) as number,
          rainy: data.daily.weather_code[i] >= 51,
        }))
        return [c.id, days] as const
      }),
    )
      .then((entries) => {
        if (cancelled) return
        setWeather(Object.fromEntries(entries))
        setWeatherState('ok')
        // 把每天天气写入 store（地图动线染色用）
        const flat: Record<string, { code: number; rainy: boolean; tmin: number; tmax: number }> = {}
        for (const [, days] of entries) {
          days.forEach((d: { date: string; code: number; tmin: number; tmax: number; rainy: boolean }) => {
            flat[d.date] = { code: d.code, rainy: d.rainy, tmin: d.tmin, tmax: d.tmax }
          })
        }
        useAppStore.getState().setWeatherByDate(flat)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setWeatherState('error')
        setWeatherMsg(
          err.message === '400'
            ? '出发日期超出 16 天预报范围，临近出发再来查看'
            : '天气查询失败，请检查网络',
        )
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherCities, tripParams.startDate, tripParams.days])

  useEffect(() => {
    if (!generating) return
    const timer = window.setInterval(() => {
      setLoadingIndex((i) => (i + 1) % LOADING_MESSAGES.length)
    }, 600)
    return () => window.clearInterval(timer)
  }, [generating])

  // 雨天判定：按路线只看「当天所在城市」的天气
  useEffect(() => {
    if (dayCities.length === 0) return
    const rainy = dayCities
      .map((c, i) => (weather[c.id]?.[i]?.rainy ? i : -1))
      .filter((i) => i >= 0)
    setRainyDayIndexes(rainy)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayCities, weather])

  // 日期/天数变化 → 天气卡短暂高亮提示"这里更新了"
  const [weatherFlash, setWeatherFlash] = useState(false)
  useEffect(() => {
    setWeatherFlash(true)
    const t = window.setTimeout(() => setWeatherFlash(false), 1300)
    return () => window.clearTimeout(t)
  }, [tripParams.startDate, tripParams.days])

  const setDays = (days: number) => {
    // 上限 30 天：长线旅行/多国深度游也能装下
    const d = Math.min(30, Math.max(1, days))
    updateTripParams({ days: d, departureDate: dateOf(d - 1) })
  }

  const startGenerate = () => {
    setGenerating(true)
    setLoadingIndex(0)
    window.setTimeout(() => {
      generateItinerary()
      setGenerating(false)
      setStep(4)
    }, 1800)
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      <button
        type="button"
        onClick={() => setStep(2)}
        className="flex items-center gap-1 text-sm text-ink-soft transition hover:text-ink"
      >
        <ChevronLeft size={16} />
        返回选择目的地
      </button>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-moss">STEP 3 · 旅行参数</p>
          <h2 className="mt-1 font-serif-sc text-2xl leading-snug">最后几个小问题</h2>
          <p className="mt-1 text-sm text-ink-soft">AI 将根据这些信息为你编排每日行程</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-apricot-pale text-lg">
          <Sparkles size={18} className="text-apricot" />
        </span>
      </div>

      {generating ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-line bg-white py-14 text-center"
        >
          <Loader2 size={40} className="animate-spin text-moss" />
          <motion.p
            key={loadingIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-ink-soft"
          >
            {LOADING_MESSAGES[loadingIndex]}
          </motion.p>
          <p className="mt-1 text-xs text-ink-soft/70">
            {selectedCities.map((c) => c.name).join(' · ')} · {tripParams.days} 天
          </p>
        </motion.div>
      ) : (
        <div className="mt-6 space-y-3">
          <FoldCard emoji="🧭" title="行程骨架" summary={`${tripParams.startDate.slice(5)} 出发 · ${tripParams.days} 天 · ${selectedCities.length} 城`}>
          {/* 出发日期 */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">出发日期</p>
              <span className="text-xs text-ink-soft">即行程第 1 天</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="date"
                value={tripParams.startDate}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) return
                  if (tripParams.departureDate && tripParams.departureDate < v) {
                    updateTripParams({ startDate: v, departureDate: v })
                  } else {
                    updateTripParams({ startDate: v })
                  }
                }}
                min={new Date().toISOString().slice(0, 10)}
                className="flex-1 rounded-lg border border-line bg-cream px-3 py-2 text-sm outline-none transition focus:border-moss/50"
              />
            </div>
            
          </div>

          {/* 天数 */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm font-medium">旅行天数</p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => setDays(tripParams.days - 1)}
                disabled={tripParams.days <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream transition hover:bg-moss-pale disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-16 text-center font-serif-sc text-2xl">
                {tripParams.days} <span className="text-sm text-ink-soft">天</span>
              </span>
              <button
                type="button"
                onClick={() => setDays(tripParams.days + 1)}
                disabled={tripParams.days >= 30}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream transition hover:bg-moss-pale disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            {selectedCities.length > 1 && (
              <p className="mt-2 text-xs text-ink-soft">
                将在 {selectedCities.length} 座城市间均分：约{' '}
                {Math.max(1, Math.round(tripParams.days / selectedCities.length))} 天/城
              </p>
            )}
          </div>

          {/* 天气参考（按所选路线的时间轴展示） */}
          <div className={`rounded-2xl border border-line bg-white p-4 transition-shadow duration-700 ${weatherFlash ? 'ring-2 ring-moss/40' : ''}`}>
            <p className="flex items-center gap-2 text-sm font-medium">
              🌤️ 天气参考
              <span className="text-xs font-normal text-ink-soft">
                （按路线{routeChoice === 'A' ? 'A' : 'B'}展示 · Open-Meteo · 雨天优先安排室内人文点）
              </span>
            </p>
            {weatherState === 'loading' && (
              <p className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                <Loader2 size={12} className="animate-spin" />
                正在查询 {selectedCities.length} 座城市旅行期间的天气…
              </p>
            )}
            {weatherState === 'error' && (
              <p className="mt-2 text-xs text-apricot">⚠️ {weatherMsg}</p>
            )}
            {weatherState === 'ok' && dayCities.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {manualDayCities != null && (
                  <button
                    type="button"
                    onClick={() => setManualDayCities(null)}
                    className="rounded-full border border-line bg-cream px-2.5 py-1 text-[10px] text-ink-soft transition hover:border-moss/40 hover:text-ink"
                  >
                    ↺ 恢复自动分配
                  </button>
                )}
                {dayCities.map((city, i) => {
                  const d = weather[city.id]?.[i]
                  const day = new Date(dateOf(i) + 'T00:00:00').getDay()
                  if (!d) {
                    // 自定义转场城市（无坐标）：仅展示名称
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-cream px-2.5 py-1.5 text-xs"
                      >
                        <span className="w-12 shrink-0 font-medium text-ink">第 {i + 1} 天</span>
                        <span className="w-16 shrink-0 text-ink-soft">
                          周{WEEKDAYS[day]} · {dateOf(i).slice(5).replace('-', '/')}
                        </span>
                        <span className="font-medium">{city.emoji}{city.name}</span>
                        <span className="text-ink-soft">天气暂无法查询</span>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                        d.rainy ? 'border-sky-300 bg-sky-50' : 'border-line bg-cream'
                      }`}
                    >
                      <span className="w-12 shrink-0 font-medium text-ink">第 {i + 1} 天</span>
                      <span className="w-16 shrink-0 text-ink-soft">
                        周{WEEKDAYS[day]} · {d.date.slice(5).replace('-', '/')}
                      </span>
                      <select
                        value={city.id}
                        onChange={(e) => setDayCity(i, e.target.value)}
                        title="修改这一天所在的城市"
                        className="w-20 shrink-0 rounded-md border border-line bg-white px-1 py-0.5 text-xs font-medium text-ink outline-none transition focus:border-moss/50"
                      >
                        {dayCityOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.emoji}
                            {opt.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-base leading-none">{wmoEmoji(d.code)}</span>
                      <span className="font-medium text-ink">
                        {d.tmin}~{d.tmax}°
                      </span>
                      {d.rainy && (
                        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">
                          🌧️ 有雨 · 优先室内
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 行程起点与终点 */}
          <div className="space-y-5">
            <PlacePicker
              title="出发城市（旅程起点·家）"
              emojiIcon="✈️"
              hint="从哪座城市出发（可选非旅游城市）"
              tourismCities={selectedCities}
              allCities={cities}
              cityId={originCityId}
              custom={originCustom}
              onPick={(id, custom) => {
                setOriginCity(id)
                setOriginCustom(custom)
              }}
              onClear={() => {
                setOriginCity(null)
                setOriginCustom(null)
              }}
            />
            <div className="border-t border-dashed border-line" />
            <PlacePicker
              title="落地城市（首站抵达）"
              emojiIcon="🛬"
              hint="可选非旅游枢纽城市，落地当天预留交通时间"
              tourismCities={selectedCities}
              allCities={cities}
              cityId={arrivalCityId}
              custom={arrivalCustom}
              onPick={(id, custom) => {
                setArrivalCity(id)
                setArrivalCustom(custom)
              }}
              onClear={() => {
                setArrivalCity(null)
                setArrivalCustom(null)
              }}
            />
            {/* 落地时间（日期 + 时段/精确时刻） */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="shrink-0 text-moss" />
                <span className="w-16 shrink-0 font-medium text-ink">落地时间</span>
                <input
                  type="date"
                  value={tripParams.startDate}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    if (tripParams.departureDate && tripParams.departureDate < v) {
                      updateTripParams({ startDate: v, departureDate: v, days: 1 })
                    } else {
                      updateTripParams({ startDate: v })
                    }
                  }}
                  className="flex-1 rounded-lg border border-line bg-cream px-2.5 py-1.5 outline-none transition focus:border-moss/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-[22px]">
                <span className="shrink-0 text-ink-soft">时段</span>
                {ARRIVAL_TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => updateTripParams({ arrivalTime: preset.time })}
                    className={`rounded-full border px-2.5 py-1 transition ${
                      tripParams.arrivalTime === preset.time
                        ? 'border-moss bg-moss-pale font-medium text-ink'
                        : 'border-line bg-cream text-ink-soft hover:border-moss/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <input
                  type="time"
                  value={tripParams.arrivalTime ?? ''}
                  onChange={(e) => updateTripParams({ arrivalTime: e.target.value || null })}
                  title="精确到时分"
                  className="w-[86px] rounded-lg border border-line bg-cream px-2 py-1 outline-none transition focus:border-moss/50"
                />
              </div>
            </div>
            <div className="border-t border-dashed border-line" />
            <PlacePicker
              title="离开城市（游览收尾）"
              emojiIcon="🛫"
              hint="往返同地或开口行程（A 进 B 出）"
              tourismCities={selectedCities}
              allCities={cities}
              cityId={departureSameAsArrival ? arrivalCityId : departureCityId}
              custom={departureSameAsArrival ? arrivalCustom : departureCustom}
              sameChipLabel="同落地城市"
              sameActive={departureSameAsArrival}
              onSame={() => setDepartureSameAsArrival(true)}
              onPick={(id, custom) => {
                setDepartureSameAsArrival(false)
                setDepartureCityId(id)
                setDepartureCustom(custom)
              }}
              onClear={() => {
                setDepartureSameAsArrival(true)
                setDepartureCityId(null)
                setDepartureCustom(null)
              }}
            />
            <div className="border-t border-dashed border-line" />
            <PlacePicker
              title="归途城市（旅程终点·回家）"
              emojiIcon="🏠"
              hint="返回到哪座城市（可选非旅游城市）"
              tourismCities={selectedCities}
              allCities={cities}
              cityId={returnCityId}
              custom={returnCustom}
              onPick={(id, custom) => {
                setReturnCity(id)
                setReturnCustom(custom)
              }}
              onClear={() => {
                setReturnCity(null)
                setReturnCustom(null)
              }}
            />
            {/* 离开时间（日期 + 时段/精确时刻） */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="shrink-0 text-moss" />
                <span className="w-16 shrink-0 font-medium text-ink">离开时间</span>
                <input
                  type="date"
                  value={tripParams.departureDate ?? dateOf(tripParams.days - 1)}
                  min={tripParams.startDate}
                  max={dateOf(13)}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!v) return
                    const diff =
                      Math.round(
                        (+new Date(v + 'T00:00:00') - +new Date(tripParams.startDate + 'T00:00:00')) /
                          86400000,
                      ) + 1
                    const d = Math.min(14, Math.max(1, diff))
                    updateTripParams({ days: d, departureDate: dateOf(d - 1) })
                  }}
                  className="flex-1 rounded-lg border border-line bg-cream px-2.5 py-1.5 outline-none transition focus:border-moss/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pl-[22px]">
                <span className="shrink-0 text-ink-soft">时段</span>
                {DEPARTURE_TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => updateTripParams({ departureTime: preset.time })}
                    className={`rounded-full border px-2.5 py-1 transition ${
                      tripParams.departureTime === preset.time
                        ? 'border-moss bg-moss-pale font-medium text-ink'
                        : 'border-line bg-cream text-ink-soft hover:border-moss/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <input
                  type="time"
                  value={tripParams.departureTime ?? ''}
                  onChange={(e) => updateTripParams({ departureTime: e.target.value || null })}
                  title="精确到时分"
                  className="w-[86px] rounded-lg border border-line bg-cream px-2 py-1 outline-none transition focus:border-moss/50"
                />
              </div>
            </div>
            <p className="text-xs text-ink-soft">
              {arrivalSeparate || depSeparate
                ? '✓ 起终点为转场城市：首尾各 1 个转场日（安排抵达/返程），中间为游览日'
                : '落地/离开为旅游城市时，首尾当天会预留交通与入住时间'}
            </p>
          </div>

          {selectedCities.length >= 2 && (
            <div className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    推荐路线与顺序
                    <span className="ml-2 text-xs font-normal text-ink-soft">箭头为移动方向 · 可微调</span>
                  </p>
                  <div className="flex shrink-0 gap-1.5">
                    {ROUTE_PRESETS.map((preset) => {
                      const active = manualOrder == null && routeChoice === preset.id
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setRouteChoice(preset.id)}
                          title={preset.desc}
                          className={`rounded-full border px-2.5 py-1 text-xs transition ${
                            active
                              ? 'border-moss bg-moss-pale font-medium text-ink'
                              : 'border-line bg-cream text-ink-soft hover:border-moss/40'
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 地图点选入口 */}
                <button
                  type="button"
                  onClick={() => setRoutePicking(true)}
                  className={`mt-3 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-xs transition ${
                    routePicking
                      ? 'border-moss bg-moss-pale text-ink'
                      : 'border-line bg-cream text-ink-soft hover:border-moss/50 hover:text-ink'
                  }`}
                >
                  <span className="text-base">🗺️</span>
                  <span>
                    <span className="font-medium">
                      {routePicking ? '点选模式进行中：在右侧地图依次点击城市标记…' : '在地图上点选城市，完全自定义游览顺序'}
                    </span>
                    <span className="ml-1">
                      {routePicking
                        ? `已选 ${pickingOrder.length} 座，完成后点地图上的「完成」`
                        : '（也可用 ↑↓ 微调或选择上方建议路线）'}
                    </span>
                  </span>
                </button>

                {/* 路线流程图：端点转场 + 竖向城市链 + 动画箭头 + 每段交通时长 */}
                <div className="mt-3">
                  {/* 落地转场节点 */}
                  {arrivalSeparate && arrivalEp && (
                    <>
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-moss/40 bg-moss-pale/30 px-3 py-2.5">
                        <span className="text-lg">🛬</span>
                        <span className="font-medium">{arrivalEp.name}</span>
                        <span className="rounded-full border border-moss/30 bg-white px-1.5 py-0.5 text-[10px] text-moss">
                          落地转场
                        </span>
                        <span className="ml-auto text-[10px] text-ink-soft">当天前往首城</span>
                      </div>
                      <div className="flex items-center gap-2 py-1 pl-7">
                        <motion.span
                          animate={{ y: [0, 4, 0] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          className="text-apricot"
                        >
                          <MoveDown size={16} />
                        </motion.span>
                        <span className="text-xs text-ink-soft">前往 {orderedCities[0]?.name}</span>
                      </div>
                    </>
                  )}

                  {orderedCities.map((city, i) => {
                    const arrivalPinned = i === 0 && arrivalCityId === city.id
                    const canUp = i > (arrivalInTourism ? 1 : 0)
                    const canDown = i < orderedCities.length - 1
                    return (
                      <Fragment key={city.id}>
                        {i > 0 && (
                          <div className="flex items-center gap-2 py-1 pl-7">
                            <motion.span
                              animate={{ y: [0, 4, 0] }}
                              transition={{ repeat: Infinity, duration: 1.2 }}
                              className="text-apricot"
                            >
                              <MoveDown size={16} />
                            </motion.span>
                            <span className="text-xs text-ink-soft">
                              {TRANSPORT_META[interCityTransport].emoji}{' '}
                              {TRANSPORT_META[interCityTransport].label} · 约{' '}
                              {legHours(orderedCities[i - 1], city, interCityTransport)}h
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                            arrivalPinned
                              ? 'border-moss/40 bg-moss-pale/50'
                              : 'border-line bg-cream'
                          }`}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-moss text-[11px] font-bold text-white">
                            {i + 1}
                          </span>
                          <span className="text-lg">{city.emoji}</span>
                          <span className="font-medium">{city.name}</span>
                          {arrivalPinned && (
                            <span className="rounded-full border border-moss/30 bg-white px-1.5 py-0.5 text-[10px] text-moss">
                              ✈️ 落地城市
                            </span>
                          )}
                          {i === orderedCities.length - 1 && !depSeparate && (
                            <span className="rounded-full border border-apricot/40 bg-white px-1.5 py-0.5 text-[10px] text-[#b07a4a]">
                              🛫 返程
                            </span>
                          )}
                          <div className="ml-auto flex gap-1">
                            <button
                              type="button"
                              onClick={() => moveCity(i, -1)}
                              disabled={!canUp}
                              title="上移"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-moss/50 hover:text-moss disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveCity(i, 1)}
                              disabled={!canDown}
                              title="下移"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:border-moss/50 hover:text-moss disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      </Fragment>
                    )
                  })}

                  {/* 离开转场节点 */}
                  {depSeparate && depEp && (
                    <>
                      <div className="flex items-center gap-2 py-1 pl-7">
                        <motion.span
                          animate={{ y: [0, 4, 0] }}
                          transition={{ repeat: Infinity, duration: 1.2 }}
                          className="text-apricot"
                        >
                          <MoveDown size={16} />
                        </motion.span>
                        <span className="text-xs text-ink-soft">前往 {depEp.name}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-apricot/40 bg-apricot-pale/40 px-3 py-2.5">
                        <span className="text-lg">🛫</span>
                        <span className="font-medium">{depEp.name}</span>
                        <span className="rounded-full border border-apricot/40 bg-white px-1.5 py-0.5 text-[10px] text-[#b07a4a]">
                          离开转场
                        </span>
                        <span className="ml-auto text-[10px] text-ink-soft">当天返程离开</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  点 ↑↓ 微调城市顺序（落地城市固定为起点）；点「路线 A / B」恢复推荐路线
                </p>
              </div>
          )}
          </FoldCard>

          <FoldCard emoji="🚄" title="交通与节奏" summary={`${TRANSPORT_META[interCityTransport].label} · ${tripParams.cityTransport === 'transit' ? '公交优先' : '打车优先'}`}>
          {selectedCities.length >= 2 && (
            <div className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm font-medium">城际交通方式</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TRANSPORT_OPTIONS.map((mode) => {
                    const meta = TRANSPORT_META[mode]
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setInterCityTransport(mode)}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          interCityTransport === mode
                            ? 'border-moss bg-moss-pale'
                            : 'border-line bg-cream hover:border-moss/40'
                        }`}
                      >
                        <span className="block text-base">{meta.emoji}</span>
                        <span className="mt-0.5 block text-xs font-medium">{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  {TRANSPORT_META[interCityTransport].desc}；换城当天会相应减少游览安排
                </p>
              </div>
          )}
          {/* 市内交通偏好 */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm font-medium">🚇 市内交通偏好</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CITY_TRANSPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTripParams({ cityTransport: opt.id })}
                  className={`rounded-xl border p-3 text-left transition ${
                    tripParams.cityTransport === opt.id
                      ? 'border-moss bg-moss-pale'
                      : 'border-line bg-cream hover:border-moss/40'
                  }`}
                >
                  <span className="block text-xs font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              公共交通优先时，每日点位将按近邻排序，减少跨城往返奔波
            </p>
          </div>

          </FoldCard>

          <FoldCard emoji="👥" title="人群与舒适度" summary={`${tripParams.travelers} 人 · ${{ economy: '经济', comfort: '舒适', luxury: '豪华' }[tripParams.budget]}`}>
          {/* 出行人数与构成 */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm font-medium">👥 出行人数与构成</p>
            <div className="mt-3 flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateTripParams({ travelers: Math.max(1, tripParams.travelers - 1) })}
                disabled={tripParams.travelers <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream transition hover:bg-moss-pale disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-16 text-center font-serif-sc text-2xl">
                {tripParams.travelers} <span className="text-sm text-ink-soft">人</span>
              </span>
              <button
                type="button"
                onClick={() => updateTripParams({ travelers: Math.min(12, tripParams.travelers + 1) })}
                disabled={tripParams.travelers >= 12}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream transition hover:bg-moss-pale disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {COMPANION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTripParams({ companions: opt.id })}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    tripParams.companions === opt.id
                      ? 'border-moss bg-moss-pale font-medium text-ink'
                      : 'border-line bg-cream text-ink-soft hover:border-moss/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 住宿偏好 */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-sm font-medium">🏨 住宿偏好</p>
            <p className="mt-3 text-xs font-medium text-ink-soft">住宿类型</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {STAY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTripParams({ stayType: opt.id })}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    tripParams.stayType === opt.id
                      ? 'border-moss bg-moss-pale font-medium text-ink'
                      : 'border-line bg-cream text-ink-soft hover:border-moss/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-ink-soft">位置优先</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {STAY_LOCATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTripParams({ stayLocation: opt.id })}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    tripParams.stayLocation === opt.id
                      ? 'border-moss bg-moss-pale font-medium text-ink'
                      : 'border-line bg-cream text-ink-soft hover:border-moss/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-soft">将按偏好为每座城市推荐入住地点</p>
          </div>

          {/* 预算 */}
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Coins size={16} className="text-moss" />
              预算档位
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {BUDGET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateTripParams({ budget: opt.id })}
                  className={`rounded-xl border p-3 text-left transition ${
                    tripParams.budget === opt.id
                      ? 'border-moss bg-moss-pale'
                      : 'border-line bg-cream hover:border-moss/40'
                  }`}
                >
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          </FoldCard>

          {/* 已选城市回顾 */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-soft">已选：</span>
            {selectedCities.map((c) => (
              <span
                key={c.id}
                className="flex items-center gap-1 rounded-full border border-line bg-white px-3 py-1"
              >
                {c.emoji} {c.name}
              </span>
            ))}
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={startGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-moss py-3.5 font-medium text-white shadow-md transition hover:bg-moss-light"
          >
            <Sparkles size={18} />
            生成 AI 行程
          </motion.button>
        </div>
      )}
    </div>
  )
}
