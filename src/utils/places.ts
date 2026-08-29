import type { Poi, PoiType } from '../types'

/** Overpass（OSM）实时点位查询：多镜像并发竞速 + 超时 + 缓存，无需 Key */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

const REQUEST_TIMEOUT_MS = 12000

export interface BBox {
  south: number
  west: number
  north: number
  east: number
}

/** 同一区域缓存（约 1km 网格），拖动/缩放不重复查询 */
const cache = new Map<string, Poi[]>()

/** OSM 标签 → 应用内点位类型 */
function categorize(tags: Record<string, string>): PoiType | null {
  const t = tags.tourism
  const a = tags.amenity
  const h = tags.historic
  const r = tags.railway
  const s = tags.shop
  const l = tags.leisure

  if (t === 'museum' || h) return 'culture'
  if (t === 'attraction' || l === 'park' || t === 'viewpoint') return 'attraction'
  if (a === 'restaurant' || a === 'fast_food' || a === 'cafe') return 'food'
  if (s === 'mall' || s === 'department_store') return 'shopping'
  if (r === 'station' || a === 'bus_station' || a === 'ferry_terminal' || tags.aeroway === 'aerodrome')
    return 'transport'
  if (t === 'hotel' || t === 'hostel' || t === 'guest_house') return 'hotel'
  return null
}

function typeDesc(type: PoiType, tags: Record<string, string>): string {
  const a = tags.amenity
  switch (type) {
    case 'culture':
      return tags.historic === 'museum' || tags.tourism === 'museum'
        ? '博物馆 / 展馆（地图实时点位）'
        : '历史人文遗迹（地图实时点位）'
    case 'attraction':
      return tags.leisure === 'park'
        ? '公园绿地（地图实时点位）'
        : tags.tourism === 'viewpoint'
          ? '观景点（地图实时点位）'
          : '景点（地图实时点位）'
    case 'food':
      return a === 'cafe'
        ? '咖啡馆（地图实时点位）'
        : a === 'fast_food'
          ? '快餐（地图实时点位）'
          : '餐厅（地图实时点位）'
    case 'shopping':
      return '商场 / 购物中心（地图实时点位）'
    case 'transport':
      return '车站 / 交通枢纽（地图实时点位）'
    case 'hotel':
      return '酒店 / 住宿（地图实时点位）'
  }
}

/** 多个 Promise 竞速：取第一个成功的结果，全部失败才抛错 */
function firstSuccess<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let failed = 0
    let settled = false
    promises.forEach((p) =>
      p.then(
        (v) => {
          if (!settled) {
            settled = true
            resolve(v)
          }
        },
        () => {
          if (++failed === promises.length && !settled) {
            settled = true
            reject(new Error('all endpoints failed'))
          }
        },
      ),
    )
  })
}

/** 按视口范围（WGS-84）查询真实点位 */
export async function fetchRealPlaces(bbox: BBox): Promise<Poi[]> {
  // 关键 1：cache key 用入参 bbox（调用方负责扩 bbox）；避免请求和 key 不一致导致缓存穿透
  const key = [
    bbox.south.toFixed(3),
    bbox.west.toFixed(3),
    bbox.north.toFixed(3),
    bbox.east.toFixed(3),
  ].join(',')
  const hit = cache.get(key)
  if (hit) return hit

  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
  // nwr 同时查 node/way/relation：国内公园、商场、餐厅多为面状 way，只查 node 几乎查不到
  const query = `[out:json][timeout:10];(
    nwr["tourism"~"^(attraction|museum|viewpoint|hotel|hostel|guest_house)$"](${b});
    nwr["leisure"~"^(park|garden)$"](${b});
    nwr["historic"](${b});
    nwr["amenity"~"^(restaurant|fast_food|cafe|bus_station|ferry_terminal)$"](${b});
    nwr["railway"="station"](${b});
    nwr["shop"~"^(mall|department_store)$"](${b});
  );out tags center 90;`

  const attempt = async (endpoint: string): Promise<Poi[]> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      // 服务器繁忙时会返回 200 + HTML 错误页（无 elements），视为失败让其它镜像接管
      if (!data || !Array.isArray(data.elements)) throw new Error('invalid overpass response')
      const places: Poi[] = []
      const seen = new Set<string>()
      for (const el of data.elements ?? []) {
        const lat = el.lat ?? el.center?.lat
        const lon = el.lon ?? el.center?.lon
        if (!lat || !lon || !el.tags?.name) continue
        const type = categorize(el.tags)
        if (!type) continue
        // node 与其所属 way 会重复出现，按名称+粗略坐标去重
        const dedupeKey = `${el.tags.name}@${lat.toFixed(3)},${lon.toFixed(3)}`
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        places.push({
          id: `osm-${el.type}-${el.id}`,
          name: el.tags.name,
          type,
          location: [lat, lon],
          rating: 0,
          description: typeDesc(type, el.tags),
        })
      }
      return places.slice(0, 90)
    } finally {
      clearTimeout(timer)
    }
  }

  const places = await firstSuccess(OVERPASS_ENDPOINTS.map(attempt))
  cache.set(key, places)
  return places
}

/**
 * 国内网络环境常无法访问境外 Overpass：当主请求失败时，调用方可以尝试
 * `fetchFallbackPlaces(bbox)`，从内置城市 POI 库中按区域就近取出"已知地点"，
 * 至少保证地图上有内容可看。
 */
export function fetchFallbackPlaces(bbox: BBox, allCities: { name: string; location: [number, number]; pois: Poi[] }[]): Poi[] {
  const out: Poi[] = []
  for (const city of allCities) {
    const [lat, lng] = city.location
    if (lat < bbox.south - 0.5 || lat > bbox.north + 0.5) continue
    if (lng < bbox.west - 0.5 || lng > bbox.east + 0.5) continue
    for (const p of city.pois) {
      if (p.location[0] < bbox.south || p.location[0] > bbox.north) continue
      if (p.location[1] < bbox.west || p.location[1] > bbox.east) continue
      out.push(p)
    }
  }
  return out
}
