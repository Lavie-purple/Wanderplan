import type { City, DayPlan, Poi } from '../types'
import { TRANSPORT_META } from './transport'
import { haversineKm } from './coord'
import type { BudgetLevel, TransportMode } from '../types'

/** 预算 → 酒店档位过滤：经济档仅青旅/快捷，舒适保留中端，豪华仅选评分 4.7+ 的高端 */
const BUDGET_HOTEL_FILTER: Record<BudgetLevel, (h: Poi) => boolean> = {
  economy: (h) => h.rating <= 4.5 || /青旅|快捷|经济|民宿|hostel|inn|hostel/i.test(h.name),
  comfort: (h) => h.rating >= 4.4 && h.rating <= 4.8,
  luxury: (h) => h.rating >= 4.7,
}

/** 不同节奏下，一天安排的项目类型序列 */
const DAY_TEMPLATE: Record<string, Poi['type'][]> = {
  fast: ['attraction', 'food', 'attraction', 'shopping'],
  balanced: ['attraction', 'food', 'attraction'],
  slow: ['attraction', 'food'],
}

export interface ItineraryOptions {
  /** 城际交通方式，决定换城日的安排扣减 */
  transport?: TransportMode
  /** 第一天是否为落地日（抵达+入住，扣减安排） */
  arrivalDay?: boolean
  /** 有雨的日期索引（雨天优先安排室内人文点） */
  rainyDays?: Set<number>
  /** 出发日期（用于计算每天的星期，避开闭馆日） */
  startDate?: string
  /** 独立的落地转场城市（非旅游城市，首日为转场日） */
  arrivalStop?: City
  /** 独立的离开转场城市（非旅游城市，末日为转场日） */
  departureStop?: City
  /** 落地时刻（HH:mm；18:00 后到达扣减更多，转场日晚上到则不安排） */
  arrivalTime?: string | null
  /** 离开时刻（HH:mm；中午前离开扣减最后一天，转场日赶时间则不安排） */
  departureTime?: string | null
  /** 市内交通偏好：公交优先时当日点位按近邻排序减少往返 */
  cityTransport?: 'transit' | 'taxi'
  /** 用户手动指定的每日城市（长度须等于天数；含转场城市） */
  manualDayCities?: string[]
  /** 预算档位：影响酒店价位过滤、是否加入高级 SPA/米其林等点 */
  budget?: BudgetLevel
  /** 行程节奏强度 1-5（1=塞 6 个景点 / 5=只放 1-2 个深度游），滑块实时控制 */
  paceIntensity?: 1 | 2 | 3 | 4 | 5
}

/** HH:mm → 当天分钟数 */
function toMinutes(t?: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h * 60 + (m || 0)
}

/** 近邻排序：从第一个点出发贪心选最近的下一个，减少当日往返奔波 */
function nearNeighborSort(items: Poi[]): Poi[] {
  if (items.length <= 2) return items
  const sorted: Poi[] = [items[0]]
  const rest = items.slice(1)
  while (rest.length > 0) {
    const last = sorted[sorted.length - 1]
    let bestIdx = 0
    let bestDist = Infinity
    rest.forEach((p, i) => {
      const d = haversineKm(last.location, p.location)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    })
    sorted.push(rest.splice(bestIdx, 1)[0])
  }
  return sorted
}

/**
 * 模拟 AI 行程规划：
 * 1. 把总天数均分到已选城市
 * 2. 每天按节奏模板从城市 POI 池中取点，跨天不重复
 * 3. 用户勾选「想去」的点位优先安排
 * 4. 落地日与换城日按交通方式扣减安排数（交通需要时间）
 * 5. 每座城市的第一个白天附加一处住宿推荐
 * 6. 公交优先时当日点位近邻排序
 */
export function generateItinerary(
  cities: City[],
  days: number,
  pace?: string,
  wantedByCity?: Map<string, Poi[]>,
  options?: ItineraryOptions,
): DayPlan[] {
  if (cities.length === 0 || days < 1) return []
  const baseTemplate = DAY_TEMPLATE[pace ?? 'balanced'] ?? DAY_TEMPLATE.balanced

  // 独立的落地/离开转场城市（非旅游城市）：首尾各占 1 个转场日
  const headStop = options?.arrivalStop
  const tailStop =
    options?.departureStop && options.departureStop.id !== headStop?.id
      ? options.departureStop
      : undefined
  const headDays = headStop ? 1 : 0
  const tailDays = tailStop ? 1 : 0

  // 每日城市：手动指定优先，否则自动分配（独立端点占首尾各 1 天）
  const cityLookup = new Map<string, City>()
  for (const c of cities) cityLookup.set(c.id, c)
  if (headStop) cityLookup.set(headStop.id, headStop)
  if (tailStop) cityLookup.set(tailStop.id, tailStop)

  let dayCities: City[] = []
  if (options?.manualDayCities && options.manualDayCities.length === days) {
    for (const id of options.manualDayCities) {
      const c = cityLookup.get(id)
      if (c) dayCities.push(c)
    }
    // 不足则按第一座旅游城市补齐
    while (dayCities.length < days && cities.length > 0) dayCities.push(cities[0])
  } else {
    const tourismDays = Math.max(0, days - headDays - tailDays)
    const base = Math.floor(tourismDays / cities.length)
    let remainder = tourismDays % cities.length
    for (const city of cities) {
      const count = base + (remainder > 0 ? 1 : 0)
      if (remainder > 0) remainder--
      for (let i = 0; i < count; i++) dayCities.push(city)
    }
    if (headStop) dayCities.unshift(headStop)
    if (tailStop) dayCities.push(tailStop)
  }

  // 标记每座城市的「第一个出现位置」，仅当天才挂酒店
  const firstDayOfCity = new Set<number>()
  const seen = new Set<string>()
  for (let i = 0; i < dayCities.length; i++) {
    if (!seen.has(dayCities[i].id)) {
      seen.add(dayCities[i].id)
      firstDayOfCity.add(i)
    }
  }

  const cursors = new Map<string, number>()
  const used = new Set<string>()

  /** 是否当天闭馆 */
  const isClosed = (p: Poi, weekday?: number) =>
    weekday != null && (p.closedDays?.includes(weekday) ?? false)

  const pick = (city: City, type: Poi['type'], weekday?: number, preferCulture = false): Poi | null => {
    // 「景点」槽位默认可用人文类点位；雨天优先室内人文点
    const types: Poi['type'][] =
      type === 'attraction' ? (preferCulture ? ['culture', 'attraction'] : ['attraction', 'culture']) : [type]

    // 优先使用用户勾选的「想去」点位（避开当天闭馆）
    const wanted = wantedByCity?.get(city.id) ?? []
    const wantedPick = wanted.find(
      (p) => types.includes(p.type) && !used.has(p.id) && !isClosed(p, weekday),
    )
    if (wantedPick) {
      used.add(wantedPick.id)
      return wantedPick
    }

    const open = (p: Poi) => !isClosed(p, weekday)
    const unused = city.pois.filter((p) => types.includes(p.type) && !used.has(p.id) && open(p))
    const fallback = city.pois.filter((p) => types.includes(p.type) && open(p))
    const list = unused.length > 0 ? unused : fallback
    if (list.length === 0) return null
    const key = `${city.id}:${type}`
    const idx = (cursors.get(key) ?? 0) % list.length
    cursors.set(key, (cursors.get(key) ?? 0) + 1)
    const chosen = list[idx]
    used.add(chosen.id)
    return chosen
  }

  const weekdayOf = () =>
    options?.startDate ? new Date(options.startDate + 'T00:00:00').getDay() : undefined

  const dayPlans: DayPlan[] = []

  dayCities.forEach((city, idx) => {
    // 落地/离开转场日（独立端点城市）：只安排 1 餐（晚上到/赶时间则当天不安排）
    const isFirstHead =
      headStop != null &&
      city.id === headStop.id &&
      idx === dayCities.findIndex((c) => c.id === headStop.id)
    const isTail = tailStop != null && city.id === tailStop.id && idx === dayCities.length - 1

    // 落地/离开时刻（分钟数）
    const arrMin = toMinutes(options?.arrivalTime)
    const depMin = toMinutes(options?.departureTime)

    if (isFirstHead || isTail) {
      const items: Poi[] = []
      // 落地转场日：18:00 后到达当天不安排（未定按下午处理）；离开转场日：中午前离开当天不安排（未定按不赶时间处理）
      const eveningArrival = isFirstHead && arrMin != null && arrMin >= 1080
      const rushedReturn = isTail && depMin != null && depMin <= 720
      if (!eveningArrival && !rushedReturn) {
        const food = pick(city, 'food', weekdayOf())
        if (food) items.push(food)
      }
      dayPlans.push({ cityId: city.id, items, transit: true, cityName: city.name })
      return
    }

    let slots: Poi['type'][] = [...baseTemplate]

  // 预算档位：豪华档追加一次"购物/spa"额外 slot；经济档只用步行距离
  if (options?.budget === 'luxury' && !slots.includes('shopping')) {
    slots = [...slots, 'shopping']
  }

  // 节奏强度（1-5）调整当天 slot 数：1=塞满（×2），5=只放 1-2 个深度
  const intensity = options?.paceIntensity ?? 3
  if (intensity <= 2) {
    // 紧凑（1-2）：每个 attraction slot 重复一次，最多 6 个
    slots = slots.flatMap((s) => (s === 'attraction' ? ['attraction', 'attraction'] : [s]))
  } else if (intensity === 4) {
    // 慢节奏：去掉 shopping 类 slot
    slots = slots.filter((s) => s !== 'shopping')
  } else if (intensity >= 5) {
    // 极慢：只保留 1 个 attraction + 1 个 food
    slots = ['attraction', 'food']
  }

    // 换城日扣减安排数（交通耗时）
    if (idx > 0 && dayCities[idx - 1].id !== city.id) {
      const penalty = TRANSPORT_META[options?.transport ?? 'train'].slotPenalty
      slots = slots.slice(0, Math.max(1, slots.length - penalty))
    }
    if (idx === 0 && options?.arrivalDay) {
      // 落地日：18:00 后到扣 2 个，其他时段扣 1 个（未定按下午到处理）
      slots = slots.slice(0, Math.max(1, slots.length - (arrMin != null && arrMin >= 1080 ? 2 : 1)))
    }
    // 最后一天且为离开城市：中午前/傍晚离开扣 1 个安排（不赶时间则不扣）
    const isLastTourismDay = idx === dayCities.length - 1 && !tailStop
    if (isLastTourismDay && depMin != null) {
      slots = slots.slice(0, Math.max(1, slots.length - 1))
    }

    // 当天星期（用于避开闭馆日）与雨天偏好（优先室内人文点）
    const weekday = weekdayOf()
    const preferCulture = options?.rainyDays?.has(idx) ?? false

    let items: Poi[] = []
    for (const type of slots) {
      const poi = pick(city, type, weekday, preferCulture)
      if (poi) items.push(poi)
    }
    let hotelCandidates: Poi[] = []
    if (firstDayOfCity.has(idx)) {
      const allHotels = city.pois.filter((p) => p.type === 'hotel')
      const budget = options?.budget
      // 经济档只看 hostel/inn，舒适档保留 4.4-4.8，豪华档仅 4.7+
      const filtered = budget ? allHotels.filter(BUDGET_HOTEL_FILTER[budget]) : allHotels
      hotelCandidates = filtered.length > 0 ? filtered : allHotels
      const hotel = hotelCandidates[0]
      if (hotel) items.push(hotel)
    }

    // 公交优先：当日点位近邻排序，减少跨城往返（先排景点再算 legs，最后才挂酒店）
    if (options?.cityTransport === 'transit' && items.length > 2) {
      items = nearNeighborSort(items)
    }

    // 计算 legs（基于景点 + 美食等可游览的 POI，不含酒店/交通；legs[i] = points[i] → points[i+1]）
    const points = items.filter((p) => p.type !== 'hotel' && p.type !== 'transport')
    const legs = (() => {
      const out: { mode: 'walk' | 'metro' | 'bus' | 'taxi'; line?: string; minutes: number; km: number; walkMin?: number }[] = []
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i]
        const b = points[i + 1]
        const km = haversineKm(a.location, b.location)
        let mode: 'walk' | 'metro' | 'bus' | 'taxi' = 'walk'
        let line: string | undefined
        let minutes = 0
        if (km < 0.7) {
          mode = 'walk'
          minutes = Math.max(5, Math.round(km * 14))
        } else if (km < 3) {
          mode = 'metro'
          const letters = '一二三四五六七八九'
          line = `${letters[(a.id.charCodeAt(0) + b.id.charCodeAt(0)) % letters.length]}号线`
          minutes = Math.round(km * 6 + 6)
        } else if (km < 10) {
          mode = 'bus'
          line = `${1 + ((a.id.charCodeAt(0) + b.id.charCodeAt(0)) % 50)}路`
          minutes = Math.round(km * 4 + 8)
        } else {
          mode = 'taxi'
          minutes = Math.round(km * 3 + 6)
        }
        const walkMin = mode === 'metro' ? 7 : mode === 'bus' ? 6 : mode === 'taxi' ? 3 : 0
        out.push({ mode, line, minutes, km: Math.round(km * 10) / 10, walkMin })
      }
      return out
    })()

    dayPlans.push({ cityId: city.id, items, hotelCandidates, legs })
  })

  return dayPlans
}

/** 为某个行程项寻找同城市同类型的未用备选 */
export function findAlternative(city: City, current: Poi, usedIds: Set<string>): Poi | null {
  const alts = city.pois.filter(
    (p) => p.type === current.type && p.id !== current.id && !usedIds.has(p.id),
  )
  return alts.length > 0 ? alts[0] : null
}
