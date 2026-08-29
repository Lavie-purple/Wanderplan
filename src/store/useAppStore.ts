import { create } from 'zustand'
import { cities } from '../data/cities'
import { countries } from '../data/countries'
import type { City, DayPlan, FlyTarget, Poi, PoiType, PrefKey, Preferences, TransportMode, TripParams } from '../types'
import { findAlternative, generateItinerary } from '../utils/itineraryGenerator'
import { pseudoCity, resolveRouteOrder } from '../utils/route'
import { haversineKm } from '../utils/coord'

interface AppState {
  currentStep: 1 | 2 | 3 | 4
  preferences: Preferences
  selectedContinentId: string
  selectedCountryId: string
  selectedCityIds: string[]
  /** 用户手动勾选「想去」的 POI，生成行程时优先安排 */
  wantedPoiIds: string[]
  /** 落地城市（null = 暂不确定；可为非旅游城市） */
  arrivalCityId: string | null
  /** 自定义落地城市名（不在已知城市列表时） */
  arrivalCustom: string | null
  /** 出发城市（旅程起点·家；null = 未设置） */
  originCityId: string | null
  /** 自定义出发城市名 */
  originCustom: string | null
  /** 离开城市与落地相同（往返，默认 true） */
  departureSameAsArrival: boolean
  /** 离开城市（可为非旅游城市） */
  departureCityId: string | null
  /** 自定义离开城市名 */
  departureCustom: string | null
  /** 归途城市（旅程终点·家；null = 未设置） */
  returnCityId: string | null
  /** 自定义归途城市名 */
  returnCustom: string | null
  /** 游览方向：A = 按选择顺序，B = 逆序，C = 由南向北，D = 最短总路程（TSP 优化） */
  routeChoice: 'A' | 'B' | 'C' | 'D'
  /** 用户微调/地图点选后的城市顺序（null = 未调整，跟随路线 A/B/C） */
  manualOrder: string[] | null
  /** 地图点选路线模式 */
  routePicking: boolean
  /** 点选模式中已确定顺序的城市 */
  pickingOrder: string[]
  /** 用户手动指定的每日城市（null = 自动均分） */
  manualDayCities: string[] | null
  /** 城际交通方式 */
  interCityTransport: TransportMode
  /** 有雨的行程日索引（0 = 第一天），天气查询后写入，生成时优先室内点 */
  rainyDayIndexes: number[]
  tripParams: TripParams
  itinerary: DayPlan[]
  activeCityId: string | null
  activePoiId: string | null
  /** 地图上显示的 POI 分类 */
  visiblePoiTypes: Record<PoiType, boolean>
  /** 自由探索模式总开关（默认开启）：关闭后即不展示视口内的 Overpass 实时点位与精选点位 */
  exploreEnabled: boolean
  /** 天地图开发者 Key（境外中文标注瓦片），localStorage 可覆盖默认值 */
  tiandituKey: string
  /** 境外中文标注开关 */
  tiandituEnabled: boolean
  /** 历史行程开关：开启时步骤 2/3/4 可自由跳转，关闭后必须从偏好测评开始 */
  historyEnabled: boolean
  /** 地图飞行目标：key 自增用于触发 flyTo */
  fly: FlyTarget

  setStep: (step: 1 | 2 | 3 | 4) => void
  setPreference: (key: PrefKey, value: string) => void
  resetPreferences: () => void
  setContinent: (continentId: string) => void
  setCountry: (countryId: string) => void
  /** 悬停国家时仅预览（飞行），不切换所选国家 */
  previewCountry: (countryId: string) => void
  toggleWantedPoi: (poi: Poi) => void
  togglePoiType: (type: PoiType) => void
  setTiandituKey: (key: string) => void
  setTiandituEnabled: (enabled: boolean) => void
  setArrivalCity: (cityId: string | null) => void
  setArrivalCustom: (name: string | null) => void
  setOriginCity: (cityId: string | null) => void
  setOriginCustom: (name: string | null) => void
  setDepartureSameAsArrival: (same: boolean) => void
  setDepartureCityId: (cityId: string | null) => void
  setDepartureCustom: (name: string | null) => void
  setReturnCity: (cityId: string | null) => void
  setReturnCustom: (name: string | null) => void
  setRouteChoice: (choice: 'A' | 'B' | 'C' | 'D') => void
  setManualOrder: (order: string[] | null) => void
  /** 自由探索模式总开关（默认开启） */
  setExploreEnabled: (enabled: boolean) => void
  setRoutePicking: (picking: boolean) => void
  togglePickingCity: (cityId: string) => void
  finishPicking: () => void
  setManualDayCities: (cities: string[] | null) => void
  setInterCityTransport: (mode: TransportMode) => void
  setRainyDayIndexes: (indexes: number[]) => void

  toggleCity: (city: City) => void
  focusCity: (city: City) => void
  focusPoi: (poi: Poi) => void
  /** 取消当前激活的 POI（退出附近推荐，回到自由探索） */
  clearActivePoi: () => void
  resetFocus: () => void

  updateTripParams: (patch: Partial<TripParams>) => void
  generateItinerary: (options?: { preserveLocks?: boolean; routeChoiceOverride?: 'A' | 'B' | 'C' | 'D' }) => void
  replacePoi: (dayIndex: number, itemIndex: number) => boolean
  /** 拖拽重排：dayIndex 天 from→to 移动 itemIndex；
   *  - to=null：移除该 POI 改为底部收纳 */
  reorderItem: (dayIndex: number, from: number, to: number | null) => void
  /** 替换当天酒店为候选中的另一家 */
  replaceHotel: (dayIndex: number, hotelId: string) => void

  /** 多套方案管理：把当前 itinerary 保存为 A/B/C…，可随时切换 */
  savedPlans: Record<string, { itinerary: DayPlan[]; savedAt: number; label?: string }>
  activePlanKey: string
  saveAsPlan: (label?: string) => string
  loadPlan: (key: string) => void
  deletePlan: (key: string) => void
  renamePlan: (key: string, label: string) => void
  /** 用户已锁定的 POI（重新生成时不会替换），按 id 集合 */
  lockedPoiIds: string[]
  toggleLockPoi: (poiId: string) => void
  /** 用户手动调整过（拖拽/删除/替换）的 POI——自动提示锁定 */
  touchedPoiIds: string[]
  touchPois: (ids: string[]) => void
  clearTouchedPois: () => void

  /** 用户手动添加的 POI（按城市 id 索引；持久化到 localStorage） */
  customPoisByCity: Record<string, Poi[]>
  addCustomPoi: (cityId: string, poi: Poi) => void
  removeCustomPoi: (cityId: string, poiId: string) => void

  /** 行程节奏强度 1-5（1=塞满 / 5=深度游） */
  paceIntensity: 1 | 2 | 3 | 4 | 5
  setPaceIntensity: (v: 1 | 2 | 3 | 4 | 5) => void

  /** Leaflet map 实例（由 MapController 在 onMapLoad 时注入），用于屏幕坐标计算 */
  leafletMap: unknown
  setLeafletMap: (m: unknown) => void

  /** 左侧悬浮 POI 卡片时，在地图中央放大展示该 POI 的图片 */
  imagePreviewPoi: Poi | null
  setImagePreviewPoi: (p: Poi | null) => void

  /** 每天的天气简报（rainy: 当天是否有雨，用于地图动线染色） */
  weatherByDate: Record<string, { code: number; rainy: boolean; tmin: number; tmax: number }>
  setWeatherByDate: (w: Record<string, { code: number; rainy: boolean; tmin: number; tmax: number }>) => void

  /** 主题：'light' | 'dark'，持久化 */
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  setHistoryEnabled: (v: boolean) => void
  /** 清空所有当前行程数据，重置回偏好测评。返回旧数据（用于备份为 markdown） */
  clearAllTripData: () => { preferences: Preferences; tripParams: TripParams; itinerary: DayPlan[]; selectedCityIds: string[] }
  /** 从 markdown 重新导入行程（用户备份的） */
  importFromMarkdown: (md: string) => boolean
  /** 行程展示模式：'card' = 当前垂直卡片，'timeline' = 水平时间轴 */
  itineraryView: 'card' | 'timeline'
  setItineraryView: (v: 'card' | 'timeline') => void
  /** 鼠标悬停的日期（用于联动地图在该天内动线高亮） */
  hoveredDay: number | null
  setHoveredDay: (idx: number | null) => void
  /** 钉住的日期（点住宿卡等触发，不受鼠标移出影响） */
  pinnedDay: number | null
  setPinnedDay: (idx: number | null) => void
}

const CHINA_VIEW: FlyTarget = { center: [35.5, 105], zoom: 4, key: 0 }

const today = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let flyKey = 0

/** 天地图默认 Key（可在顶部「配置」中更换） */
/** 天地图 Key 不入库：仅存 localStorage，公开仓库/部署不含任何密钥 */
export const DEFAULT_TIANDITU_KEY = ''

export const useAppStore = create<AppState>((set, get) => ({
  currentStep: 1,
  preferences: {},
  selectedContinentId: 'asia',
  selectedCountryId: 'china',
  selectedCityIds: [],
  wantedPoiIds: [],
  arrivalCityId: null,
  arrivalCustom: null,
  originCityId: null,
  originCustom: null,
  departureSameAsArrival: true,
  departureCityId: null,
  departureCustom: null,
  returnCityId: null,
  returnCustom: null,
  routeChoice: 'A',
  manualOrder: null,
  routePicking: false,
  pickingOrder: [],
  manualDayCities: null,
  interCityTransport: 'train',
  rainyDayIndexes: [],
  tripParams: {
    startDate: today(),
    days: 3,
    budget: 'comfort',
    departureDate: null,
    travelers: 2,
    companions: 'couple',
    arrivalTime: '15:00',
    departureTime: null,
    stayType: 'chain',
    stayLocation: 'nearStation',
    cityTransport: 'taxi',
  },
  itinerary: [],
  activeCityId: null,
  activePoiId: null,
  savedPlans: {},
  activePlanKey: 'current',
  lockedPoiIds: [],
  touchedPoiIds: [],
  customPoisByCity: {},
  paceIntensity: 3,
  weatherByDate: {},
  theme: 'light',
  historyEnabled: false,
  itineraryView: 'card',
  hoveredDay: null,
  pinnedDay: null,
  leafletMap: null,
  imagePreviewPoi: null,
  visiblePoiTypes: {
    attraction: true,
    culture: true,
    food: true,
    shopping: true,
    transport: true,
    hotel: true,
  },
  exploreEnabled: true,
  tiandituKey:
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('tianditu_key') ?? DEFAULT_TIANDITU_KEY
      : DEFAULT_TIANDITU_KEY,
  tiandituEnabled:
    typeof localStorage !== 'undefined' ? localStorage.getItem('tianditu_enabled') !== '0' : true,
  fly: CHINA_VIEW,

  setStep: (step) => set({ currentStep: step }),

  setPreference: (key, value) =>
    set((s) => ({ preferences: { ...s.preferences, [key]: value } })),

  setContinent: (continentId) => {
    if (continentId === get().selectedContinentId) return
    const first = countries.find((c) => c.continent === continentId)
    if (!first) return
    set({ selectedContinentId: continentId })
    get().setCountry(first.id)
  },

  setCountry: (countryId) => {
    const country = countries.find((c) => c.id === countryId)
    if (!country || countryId === get().selectedCountryId) return
    set({
      selectedCountryId: countryId,
      activeCityId: null,
      activePoiId: null,
      fly: { center: country.view.center, zoom: country.view.zoom, key: ++flyKey },
    })
  },

  previewCountry: (countryId) => {
    const country = countries.find((c) => c.id === countryId)
    if (!country) return
    set({ fly: { center: country.view.center, zoom: country.view.zoom, key: ++flyKey } })
  },

  toggleWantedPoi: (poi) => {
    const ids = get().wantedPoiIds
    const has = ids.includes(poi.id)
    set({
      wantedPoiIds: has ? ids.filter((i) => i !== poi.id) : [...ids, poi.id],
      activePoiId: poi.id,
      fly: { center: poi.location, zoom: 15, key: ++flyKey },
    })
  },

  togglePoiType: (type) =>
    set((s) => ({
      visiblePoiTypes: { ...s.visiblePoiTypes, [type]: !s.visiblePoiTypes[type] },
    })),

  setTiandituKey: (key) => {
    try {
      if (key) localStorage.setItem('tianditu_key', key)
      else localStorage.removeItem('tianditu_key')
    } catch {
      /* localStorage 不可用时忽略 */
    }
    set({ tiandituKey: key || DEFAULT_TIANDITU_KEY })
  },

  setTiandituEnabled: (enabled) => {
    try {
      localStorage.setItem('tianditu_enabled', enabled ? '1' : '0')
    } catch {
      /* ignore */
    }
    set({ tiandituEnabled: enabled })
  },

  setArrivalCity: (cityId) => set({ arrivalCityId: cityId }),
  setArrivalCustom: (name) => set({ arrivalCustom: name }),
  setOriginCity: (cityId) => set({ originCityId: cityId }),
  setOriginCustom: (name) => set({ originCustom: name }),
  setDepartureSameAsArrival: (same) => set({ departureSameAsArrival: same }),
  setDepartureCityId: (cityId) => set({ departureCityId: cityId }),
  setDepartureCustom: (name) => set({ departureCustom: name }),
  setReturnCity: (cityId) => set({ returnCityId: cityId }),
  setReturnCustom: (name) => set({ returnCustom: name }),
  setRouteChoice: (choice) => set({ routeChoice: choice, manualOrder: null }),

  setExploreEnabled: (enabled) => set({ exploreEnabled: enabled }),
  setManualOrder: (order) => set({ manualOrder: order }),
  setRoutePicking: (picking) => set({ routePicking: picking, pickingOrder: [] }),
  togglePickingCity: (cityId) =>
    set((s) => ({
      pickingOrder: s.pickingOrder.includes(cityId)
        ? s.pickingOrder.filter((id) => id !== cityId)
        : [...s.pickingOrder, cityId],
    })),
  finishPicking: () =>
    set((s) => ({ manualOrder: s.pickingOrder, routePicking: false, pickingOrder: [] })),
  setManualDayCities: (cities) => set({ manualDayCities: cities }),
  setInterCityTransport: (mode) => set({ interCityTransport: mode }),
  setRainyDayIndexes: (indexes) => set({ rainyDayIndexes: indexes }),

  resetPreferences: () =>
    set({
      preferences: {},
      selectedCityIds: [],
      wantedPoiIds: [],
      itinerary: [],
      activeCityId: null,
      activePoiId: null,
      fly: { ...CHINA_VIEW, key: ++flyKey },
    }),

  toggleCity: (city) => {
    const ids = get().selectedCityIds
    const selected = ids.includes(city.id)
    set({
      selectedCityIds: selected ? ids.filter((id) => id !== city.id) : [...ids, city.id],
      activeCityId: city.id,
      activePoiId: null,
      fly: { center: city.location, zoom: 11, key: ++flyKey },
    })
  },

  focusCity: (city) =>
    set({
      activeCityId: city.id,
      activePoiId: null,
      fly: { center: city.location, zoom: 11, key: ++flyKey },
    }),

  focusPoi: (poi) =>
    set({ activePoiId: poi.id, fly: { center: poi.location, zoom: 15, key: ++flyKey } }),

  clearActivePoi: () => set({ activePoiId: null }),

  resetFocus: () =>
    set({
      activeCityId: null,
      activePoiId: null,
      fly: { center: CHINA_VIEW.center, zoom: CHINA_VIEW.zoom, key: ++flyKey },
    }),

  updateTripParams: (patch) => set((s) => ({ tripParams: { ...s.tripParams, ...patch } })),

  generateItinerary: (options) => {
      const {
        selectedCityIds, wantedPoiIds, preferences, tripParams,
        arrivalCityId, arrivalCustom, routeChoice, manualOrder,
        departureSameAsArrival, departureCityId, departureCustom,
        interCityTransport, rainyDayIndexes, manualDayCities,
        itinerary: prevItinerary, lockedPoiIds,
      } = get()
      const effRouteChoice = options?.routeChoiceOverride ?? routeChoice
      const preserveLocks = options?.preserveLocks !== false
    const list = selectedCityIds
      .map((id) => cities.find((c) => c.id === id))
      .filter((c): c is City => c != null)

    // 落地端点：已知城市（含未选中的枢纽城市）或自定义
    const arrivalKnown = arrivalCityId ? cities.find((c) => c.id === arrivalCityId) : undefined
    const arrivalInTourism =
      arrivalKnown && arrivalCityId ? selectedCityIds.includes(arrivalCityId) : false
    const arrivalStop =
      arrivalKnown && !arrivalInTourism
        ? arrivalKnown
        : !arrivalKnown && arrivalCustom
          ? pseudoCity(arrivalCustom, 'custom-arrival')
          : undefined

    // 离开端点
    const depId = departureSameAsArrival ? arrivalCityId : departureCityId
    const depCustom = departureSameAsArrival ? arrivalCustom : departureCustom
    const depKnown = depId ? cities.find((c) => c.id === depId) : undefined
    const depInTourism = depKnown && depId ? selectedCityIds.includes(depId) : false
    const departureStop =
      depKnown && !depInTourism
        ? depKnown
        : !depKnown && depCustom
          ? pseudoCity(depCustom, 'custom-departure')
          : undefined

    // 旅游城市顺序：落地/离开若为已选城市则按原规则置顶，否则仅排序旅游城市
    const ordered = resolveRouteOrder(
      list,
      arrivalInTourism ? arrivalCityId : null,
      effRouteChoice,
      manualOrder,
    )

    // 用户勾选的「想去」景点按城市分组，生成时优先安排
    const wantedByCity = new Map<string, Poi[]>()
    for (const id of wantedPoiIds) {
      for (const c of ordered) {
        const poi = c.pois.find((x) => x.id === id)
        if (poi) {
          const arr = wantedByCity.get(c.id) ?? []
          arr.push(poi)
          wantedByCity.set(c.id, arr)
        }
      }
    }

    const generated = generateItinerary(ordered, tripParams.days, preferences.pace, wantedByCity, {
      transport: interCityTransport,
      arrivalDay: arrivalInTourism && arrivalCityId != null,
      arrivalStop: arrivalStop ?? undefined,
      departureStop: departureStop ?? undefined,
      rainyDays: new Set(rainyDayIndexes),
      startDate: tripParams.startDate,
      arrivalTime: tripParams.arrivalTime,
      departureTime: tripParams.departureTime,
      cityTransport: tripParams.cityTransport,
      manualDayCities: manualDayCities ?? undefined,
      budget: tripParams.budget,
      paceIntensity: get().paceIntensity,
    })

    // 保留锁定的项目（酒店/景点/美食等全部类型）：按天插回到生成结果里
    if (preserveLocks) {
      for (let i = 0; i < generated.length; i++) {
        const prevItems = prevItinerary[i]?.items ?? []
        const keep = prevItems.filter((p) => lockedPoiIds.includes(p.id))
        if (keep.length === 0) continue
        let merged = [...generated[i].items]
        for (const k of keep) {
          if (k.type === 'hotel') {
            merged = [...merged.filter((p) => p.type !== 'hotel'), k]
          } else if (!merged.some((p) => p.id === k.id)) {
            // 同类型槽位替换，保持当天结构稳定
            const idx = merged.findIndex((p) => p.type === k.type)
            if (idx >= 0) merged[idx] = k
            else merged.push(k)
          }
        }
        generated[i].items = merged
        generated[i].legs = computeLegs(merged)
      }
    }

    set({
      itinerary: generated,
      // 首次成功生成 AI 行程后，自动开启"历史行程"开关，让用户能自由切换步骤
      ...(generated.length > 0 ? { historyEnabled: true } : {}),
    })
  },

  saveAsPlan: (label) => {
    const { itinerary, savedPlans } = get()
    const usedKeys = Object.keys(savedPlans)
    const next = usedKeys.length === 0 ? 'A' : String.fromCharCode('A'.charCodeAt(0) + usedKeys.length)
    const key = `plan-${next}-${Date.now()}`
    set({
      savedPlans: {
        ...savedPlans,
        [key]: { itinerary, savedAt: Date.now(), label: label ?? `方案 ${next}` },
      },
      activePlanKey: key,
    })
    return key
  },

  loadPlan: (key) => {
    const { savedPlans } = get()
    const plan = savedPlans[key]
    if (!plan) return
    set({ itinerary: plan.itinerary, activePlanKey: key, historyEnabled: true })
  },

  deletePlan: (key) => {
    const { savedPlans, activePlanKey } = get()
    const { [key]: _omit, ...rest } = savedPlans
    set({
      savedPlans: rest,
      activePlanKey: activePlanKey === key ? 'current' : activePlanKey,
    })
  },

  renamePlan: (key, label) => {
    const { savedPlans } = get()
    const plan = savedPlans[key]
    if (!plan) return
    set({ savedPlans: { ...savedPlans, [key]: { ...plan, label } } })
  },

  toggleLockPoi: (poiId) => {
    const { lockedPoiIds } = get()
    set({
      lockedPoiIds: lockedPoiIds.includes(poiId)
        ? lockedPoiIds.filter((id) => id !== poiId)
        : [...lockedPoiIds, poiId],
    })
  },

  touchPois: (ids) =>
    set((s) => ({
      touchedPoiIds: Array.from(new Set([...s.touchedPoiIds, ...ids])),
    })),

  clearTouchedPois: () => set({ touchedPoiIds: [] }),

  addCustomPoi: (cityId, poi) =>
    set((s) => ({
      customPoisByCity: {
        ...s.customPoisByCity,
        [cityId]: [...(s.customPoisByCity[cityId] ?? []), poi],
      },
    })),

  removeCustomPoi: (cityId, poiId) =>
    set((s) => ({
      customPoisByCity: {
        ...s.customPoisByCity,
        [cityId]: (s.customPoisByCity[cityId] ?? []).filter((p) => p.id !== poiId),
      },
    })),

  setPaceIntensity: (v) => set({ paceIntensity: v }),

  setWeatherByDate: (w) => set({ weatherByDate: w }),
  setTheme: (t) => set({ theme: t }),

  setHistoryEnabled: (v) => set({ historyEnabled: v }),

  setLeafletMap: (m) => set({ leafletMap: m }),
  setImagePreviewPoi: (p) => set({ imagePreviewPoi: p }),

  clearAllTripData: () => {
    const snapshot = {
      preferences: get().preferences,
      tripParams: get().tripParams,
      itinerary: get().itinerary,
      selectedCityIds: get().selectedCityIds,
    }
    set({
      preferences: {},
      selectedContinentId: 'asia',
      selectedCountryId: 'china',
      selectedCityIds: [],
      wantedPoiIds: [],
      lockedPoiIds: [],
      arrivalCityId: null,
      arrivalCustom: null,
      originCityId: null,
      originCustom: null,
      departureSameAsArrival: true,
      departureCityId: null,
      departureCustom: null,
      returnCityId: null,
      returnCustom: null,
      routeChoice: 'A',
      manualOrder: null,
      routePicking: false,
      pickingOrder: [],
      manualDayCities: null,
      interCityTransport: 'train',
      rainyDayIndexes: [],
      customPoisByCity: {},
      itinerary: [],
      activeCityId: null,
      activePoiId: null,
      currentStep: 1,
      activePlanKey: 'current',
    })
    return snapshot
  },

  importFromMarkdown: (md) => {
    // 简单解析：识别 "## 第 N 天 · 城市名" + "- **POI 名**" 行
    const lines = md.split('\n')
    const days: { city: string; items: string[] }[] = []
    let cur: { city: string; items: string[] } | null = null
    for (const line of lines) {
      const m = line.match(/^##\s*第\s*(\d+)\s*天\s*·\s*(.+)$/)
      if (m) { cur = { city: m[2].trim(), items: [] }; days.push(cur); continue }
      const p = line.match(/^-\s*\*\*(.+?)\*\*/)
      if (p && cur) cur.items.push(p[1].trim())
    }
    if (days.length === 0) return false
    // 重建行程：每个 city name 在 cities.ts 中匹配，items 用 city.pois
    const itinerary: DayPlan[] = days.map((d) => {
      const city = cities.find((c) => c.name === d.city)
      const items = (city?.pois ?? []).filter((p) => d.items.includes(p.name))
      return { cityId: city?.id ?? d.city, items, cityName: city?.name ?? d.city }
    })
    set({
      itinerary,
      selectedCityIds: Array.from(new Set(itinerary.map((d) => d.cityId).filter((id) => cities.some((c) => c.id === id)))),
      currentStep: 4,
      activePlanKey: 'current',
      historyEnabled: true,
    })
    return true
  },
  setItineraryView: (v) => set({ itineraryView: v }),

  replacePoi: (dayIndex, itemIndex) => {
    const { itinerary } = get()
    const day = itinerary[dayIndex]
    const current = day?.items[itemIndex]
    if (!day || !current) return false

    const city = cities.find((c) => c.id === day.cityId)
    if (!city) return false

    const usedIds = new Set(itinerary.flatMap((d) => d.items.map((i) => i.id)))
    const alt = findAlternative(city, current, usedIds)
    if (!alt) return false

    set({
      itinerary: itinerary.map((d, di) =>
        di === dayIndex
          ? { ...d, items: d.items.map((it, ii) => (ii === itemIndex ? alt : it)) }
          : d,
      ),
      touchedPoiIds: Array.from(new Set([...get().touchedPoiIds, alt.id])),
      activePoiId: alt.id,
      fly: { center: alt.location, zoom: 14, key: ++flyKey },
    })
    return true
  },

  reorderItem: (dayIndex, from, to) => {
    const { itinerary } = get()
    const day = itinerary[dayIndex]
    if (!day) return
    const items = [...day.items]
    if (from < 0 || from >= items.length) return
    const [m] = items.splice(from, 1)
    if (to == null || to < 0 || to > items.length) {
      items.push(m)
    } else {
      items.splice(to, 0, m)
    }
    set({
      itinerary: itinerary.map((d, di) =>
        di === dayIndex ? { ...d, items, legs: computeLegs(items) } : d,
      ),
      touchedPoiIds: Array.from(new Set([...get().touchedPoiIds, m.id])),
    })
  },

  replaceHotel: (dayIndex, hotelId) => {
    const { itinerary } = get()
    const day = itinerary[dayIndex]
    if (!day) return
    const pool = day.hotelCandidates ?? []
    const target = pool.find((h) => h.id === hotelId)
    if (!target) return
    // 酒店通常作为最后一条或第一条
    const items = day.items.filter((p) => p.type !== 'hotel')
    items.push(target)
    set({
      itinerary: itinerary.map((d, di) =>
        di === dayIndex ? { ...d, items, legs: computeLegs(items) } : d,
      ),
      touchedPoiIds: Array.from(new Set([...get().touchedPoiIds, target.id])),
      fly: { center: target.location, zoom: 14, key: ++flyKey },
    })
  },

  setHoveredDay: (idx) => set({ hoveredDay: idx }),
  setPinnedDay: (idx) => set({ pinnedDay: idx }),
}))

// —— localStorage 持久化：保存与恢复 selectedCities / wantedPois / tripParams / itinerary / plans —— //
const PERSIST_KEY = 'wanderplan.v1'
type PersistShape = {
  selectedCityIds: string[]
  wantedPoiIds: string[]
  lockedPoiIds: string[]
  tripParams: TripParams
  preferences: Preferences
  selectedContinentId: string
  selectedCountryId: string
  arrivalCityId: string | null
  arrivalCustom: string | null
  originCityId: string | null
  originCustom: string | null
  departureSameAsArrival: boolean
  departureCityId: string | null
  departureCustom: string | null
  returnCityId: string | null
  returnCustom: string | null
  interCityTransport: TransportMode
  routeChoice: 'A' | 'B' | 'C' | 'D'
  manualOrder: string[] | null
  manualDayCities: string[] | null
  rainyDayIndexes: number[]
  itinerary: DayPlan[]
  savedPlans: Record<string, { itinerary: DayPlan[]; savedAt: number; label?: string }>
  activePlanKey: string
  customPoisByCity: Record<string, Poi[]>
  theme: 'light' | 'dark'
  itineraryView: 'card' | 'timeline'
  historyEnabled: boolean
}

function loadPersisted(): Partial<PersistShape> | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<PersistShape>
  } catch {
    return null
  }
}

function savePersisted(s: PersistShape) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(s))
  } catch {
    // ignore quota errors
  }
}

const persisted = loadPersisted()
if (persisted) {
  // 兼容旧版持久化：旧 itinerary 缺 legs/hotelCandidates 字段——自动根据 items 重新算
  if (persisted.itinerary && Array.isArray(persisted.itinerary)) {
    persisted.itinerary = persisted.itinerary.map((d) => {
      const items = d.items ?? []
      const legs = d.legs && d.legs.length > 0 ? d.legs : computeLegs(items)
      let hotelCandidates: Poi[] = d.hotelCandidates ?? []
      // 如果 hotelCandidates 为空但 items 里有 hotel，从 cities.ts 把所有 hotel 补进去
      if (hotelCandidates.length === 0) {
        const currentHotel = items.find((p) => p.type === 'hotel')
        if (currentHotel) {
          const city = cities.find((c) => c.id === d.cityId)
          if (city) {
            hotelCandidates = city.pois.filter((p) => p.type === 'hotel')
          }
        }
      }
      return { ...d, items, legs, hotelCandidates }
    })
  }
  useAppStore.setState((prev) => ({ ...prev, ...persisted } as Partial<AppState>))
}

useAppStore.subscribe((s) => {
  savePersisted({
    selectedCityIds: s.selectedCityIds,
    wantedPoiIds: s.wantedPoiIds,
    lockedPoiIds: s.lockedPoiIds,
    tripParams: s.tripParams,
    preferences: s.preferences,
    selectedContinentId: s.selectedContinentId,
    selectedCountryId: s.selectedCountryId,
    arrivalCityId: s.arrivalCityId,
    arrivalCustom: s.arrivalCustom,
    originCityId: s.originCityId,
    originCustom: s.originCustom,
    departureSameAsArrival: s.departureSameAsArrival,
    departureCityId: s.departureCityId,
    departureCustom: s.departureCustom,
    returnCityId: s.returnCityId,
    returnCustom: s.returnCustom,
    interCityTransport: s.interCityTransport,
    routeChoice: s.routeChoice,
    manualOrder: s.manualOrder,
    manualDayCities: s.manualDayCities,
    rainyDayIndexes: s.rainyDayIndexes,
    itinerary: s.itinerary,
    savedPlans: s.savedPlans,
    activePlanKey: s.activePlanKey,
    customPoisByCity: s.customPoisByCity,
    theme: s.theme,
    itineraryView: s.itineraryView,
    historyEnabled: s.historyEnabled,
  })
  // imagePreviewPoi 不持久化（不需要跨刷新保留）
})

/** 简单按距离+市内交通偏好估算相邻 POI 间的耗时/方式 */
export function computeLegs(items: Poi[]): { mode: 'walk' | 'metro' | 'bus' | 'taxi'; line?: string; minutes: number; km: number; walkMin?: number }[] {
  // 自动排除酒店和交通枢纽（它们与景点/美食间的"步行/地铁"不构成行程腿）
  const points = items.filter((p) => p.type !== 'hotel' && p.type !== 'transport')
  const legs: { mode: 'walk' | 'metro' | 'bus' | 'taxi'; line?: string; minutes: number; km: number; walkMin?: number }[] = []
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
      line = pickLine(a, b)
      minutes = Math.round(km * 6 + 6)
    } else if (km < 10) {
      mode = 'bus'
      line = `${1 + ((a.id.charCodeAt(0) + b.id.charCodeAt(0)) % 50)}路`
      minutes = Math.round(km * 4 + 8)
    } else {
      mode = 'taxi'
      minutes = Math.round(km * 3 + 6)
    }
    // 出站步行系数：乘公交/地铁前后各有一段"景点出口↔车站口"的步行（5-15 分钟）
    const walkMin = mode === 'metro' ? 7 : mode === 'bus' ? 6 : mode === 'taxi' ? 3 : 0
    legs.push({ mode, line, minutes, km: Math.round(km * 10) / 10, walkMin })
  }
  return legs
}

function pickLine(a: Poi, b: Poi): string {
  const letters = '一二三四五六七八九'
  const i = (a.id.charCodeAt(0) + b.id.charCodeAt(0)) % letters.length
  return `${letters[i]}号线`
}
