import type { Poi, PoiType } from '../types'
import { EXTRA_POIS } from '../data/extraPois'
import { cities } from '../data/cities'

export interface SearchResult extends Poi {
  /** 'library' = 内置库，'custom' = 用户自建 */
  source: 'library' | 'custom'
  /** 命中的城市（如果有） */
  matchedCityId?: string
}

const ALL_KNOWN: Poi[] = [
  ...cities.flatMap((c) => c.pois.map((p) => ({ ...p }))),
  ...EXTRA_POIS,
]

/** 关键字搜索：优先按城市名归类，再按 POI 名/描述模糊匹配 */
export function searchPois(query: string, limit = 20): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: SearchResult[] = []
  const seen = new Set<string>()
  for (const p of ALL_KNOWN) {
    const hay = `${p.name} ${p.description ?? ''}`.toLowerCase()
    if (!hay.includes(q)) continue
    if (seen.has(p.id)) continue
    seen.add(p.id)
    // 找到所属城市
    const matchedCity = cities.find((c) => c.pois.some((cp) => cp.id === p.id))
    out.push({
      ...p,
      source: EXTRA_POIS.some((e) => e.id === p.id) ? 'library' : 'library',
      matchedCityId: matchedCity?.id,
    })
    if (out.length >= limit) break
  }
  return out
}

/** 用户手动添加一个 POI */
export function makeCustomPoi(
  name: string,
  type: PoiType,
  location: [number, number],
  description: string,
  rating = 4.5,
): Poi {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    type,
    location,
    rating,
    description,
  }
}
