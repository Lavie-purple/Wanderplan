export type PoiType = 'attraction' | 'culture' | 'food' | 'hotel' | 'shopping' | 'transport'

export interface Poi {
  id: string
  name: string
  type: PoiType
  location: [number, number]
  rating: number
  description: string
  /** 每周固定闭馆日（0=周日 … 6=周六），行程编排时自动避开 */
  closedDays?: number[]
  /** 概览图（Unsplash / 维基共享资源），缺失时回退 emoji 占位 */
  image?: string
  /** 推荐游玩时长（小时）—— AI 生成行程时参考 */
  duration?: number
  /** 内部标签（前端不展示，传给 AI 行程生成器） */
  hiddenTags?: string[]
  /** 门票价格（如 '旺季¥60 / 淡季¥40'、'免费（需预约）'、'€22'）；无门票不填 */
  ticket?: string
}

export interface Continent {
  id: string
  name: string
  emoji: string
}

export interface Country {
  id: string
  /** 所属大洲，见 countries.ts 的 CONTINENTS */
  continent: string
  name: string
  emoji: string
  description: string
  /** 国家概览视图中心与缩放 */
  view: { center: [number, number]; zoom: number }
}

export interface City {
  id: string
  countryId: string
  name: string
  province: string
  emoji: string
  gradient: string
  tagline: string
  description: string
  location: [number, number]
  tags: string[]
  pois: Poi[]
}

export type PrefKey = 'travelStyle' | 'activity' | 'pace' | 'season'

export type Preferences = Partial<Record<PrefKey, string>>

export type BudgetLevel = 'economy' | 'comfort' | 'luxury'

/** 城际交通方式 */
export type TransportMode = 'plane' | 'train' | 'bus' | 'car'

/** 同行构成 */
export type CompanionType = 'solo' | 'couple' | 'family' | 'elders' | 'friends'
/** 住宿类型 */
export type StayType = 'chain' | 'homestay' | 'upscale'
/** 住宿位置偏好 */
export type StayLocation = 'nearSpot' | 'nearStation'
/** 市内交通偏好 */
export type CityTransport = 'transit' | 'taxi'

export interface TripParams {
  startDate: string
  days: number
  budget: BudgetLevel
  /** 离开时间（行程终点日期；null = 由天数推算） */
  departureDate: string | null
  /** 出行人数 */
  travelers: number
  /** 同行构成 */
  companions: CompanionType
  /** 落地时刻（HH:mm，null = 未定；影响落地日安排数） */
  arrivalTime: string | null
  /** 离开时刻（HH:mm，null = 不赶时间；影响最后一天安排数） */
  departureTime: string | null
  /** 住宿类型偏好 */
  stayType: StayType
  /** 住宿位置偏好 */
  stayLocation: StayLocation
  /** 市内交通偏好 */
  cityTransport: CityTransport
}

/** 一天的行程：所属城市 + 当天安排的 POI 序列；transit=交通转场日 */
export interface DayPlan {
  cityId: string
  items: Poi[]
  transit?: boolean
  cityName?: string
  /** 当天可选住宿（仅旅游日首条之外显示，不存在则按 hotel 替换规则生成） */
  hotelCandidates?: Poi[]
  /** 景点间交通信息（POI → 下一 POI）：方式、线路、耗时 */
  legs?: { mode: 'walk' | 'metro' | 'bus' | 'taxi'; line?: string; minutes: number; km: number; walkMin?: number }[]
}

export interface FlyTarget {
  center: [number, number]
  zoom: number
  key: number
}

export const POI_META: Record<PoiType, { label: string; emoji: string; color: string }> = {
  attraction: { label: '景点', emoji: '📸', color: '#4a90d9' },
  culture: { label: '人文', emoji: '🏛️', color: '#a67c52' },
  food: { label: '美食', emoji: '🍜', color: '#e8a87c' },
  hotel: { label: '住宿', emoji: '🏨', color: '#9b7fbf' },
  shopping: { label: '购物', emoji: '🛍️', color: '#e891a8' },
  transport: { label: '交通', emoji: '🚉', color: '#7f8c9b' },
}

export const POI_TYPE_ORDER: PoiType[] = [
  'attraction',
  'culture',
  'food',
  'shopping',
  'transport',
  'hotel',
]

/** 供用户挑选「想去」的点位类型；酒店/交通仅作为选中景点后的周边参考展示 */
export const SELECTABLE_POI_TYPES: PoiType[] = ['attraction', 'culture', 'food', 'shopping']
