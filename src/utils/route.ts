import type { City } from '../types'
import { haversineKm } from './coord'

/** 行程端点：已知城市（可查天气/估时）或自定义名称（仅展示） */
export interface EndPoint {
  name: string
  city: City | null
}

/** 自定义端点的展示用伪 City 对象 */
export function pseudoCity(name: string, id: string): City {
  return {
    id,
    name,
    countryId: '',
    province: '转场',
    emoji: '🛬',
    gradient: 'from-slate-100 to-slate-100',
    tagline: '交通转场',
    description: '',
    location: [0, 0],
    tags: [],
    pois: [],
  }
}

/** 解析端点：优先按已知城市 id 匹配，否则作为自定义名称 */
export function resolveEndPoint(
  cityId: string | null,
  custom: string | null,
  allCities: City[],
): EndPoint | null {
  if (cityId) {
    const c = allCities.find((x) => x.id === cityId)
    if (c) return { name: c.name, city: c }
  }
  if (custom) return { name: custom, city: null }
  return null
}

/**
 * 解析有效游览顺序：
 * - 未手动调整时，按路线 A（选择顺序）/ B（逆序）/ C（由南向北）/ D（最短总路程 TSP）排列
 * - 手动微调后（manualOrder），按用户顺序排列（缺失的城市按原顺序补尾）
 */
export function resolveRouteOrder(
  selected: City[],
  arrivalCityId: string | null,
  routeChoice: 'A' | 'B' | 'C' | 'D',
  manualOrder: string[] | null,
): City[] {
  const rest = arrivalCityId ? selected.filter((c) => c.id !== arrivalCityId) : selected

  let restOrdered: City[]
  if (manualOrder && manualOrder.length > 0) {
    const fromManual = manualOrder
      .map((id) => rest.find((c) => c.id === id))
      .filter((c): c is City => c != null)
    const missing = rest.filter((c) => !manualOrder.includes(c.id))
    restOrdered = [...fromManual, ...missing]
  } else if (routeChoice === 'B') {
    restOrdered = [...rest].reverse()
  } else if (routeChoice === 'C') {
    // 由南向北（纬度升序）
    restOrdered = [...rest].sort((a, b) => a.location[0] - b.location[0])
  } else if (routeChoice === 'D') {
    // 最短总路程：贪心最近邻 + 2-opt 局部优化
    restOrdered = optimizeOrder(rest)
  } else {
    restOrdered = rest
  }

  // 落地城市若是旅游城市则置顶
  const arrival = arrivalCityId ? selected.find((c) => c.id === arrivalCityId) : undefined
  return arrival ? [arrival, ...restOrdered] : restOrdered
}

/** 贪心最近邻 + 2-opt 局部优化，求总路径最短的访问顺序 */
export function optimizeOrder(cities: City[]): City[] {
  if (cities.length <= 2) return cities
  // 起点：以"中心度"最高的城市作为起点（总距离最小的那个）
  let startIdx = 0
  let bestSum = Infinity
  for (let i = 0; i < cities.length; i++) {
    let s = 0
    for (let j = 0; j < cities.length; j++) {
      if (i !== j) s += haversineKm(cities[i].location, cities[j].location)
    }
    if (s < bestSum) { bestSum = s; startIdx = i }
  }
  const path = [cities[startIdx]]
  const remaining = cities.filter((_, i) => i !== startIdx)
  while (remaining.length > 0) {
    const last = path[path.length - 1]
    let bi = 0
    let bd = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(last.location, remaining[i].location)
      if (d < bd) { bd = d; bi = i }
    }
    path.push(remaining.splice(bi, 1)[0])
  }
  // 2-opt 局部优化：反复尝试反转 (i, j) 段是否缩短总距离
  const totalDist = (p: City[]) => {
    let d = 0
    for (let i = 0; i < p.length - 1; i++) d += haversineKm(p[i].location, p[i + 1].location)
    return d
  }
  let improved = true
  let iter = 0
  while (improved && iter < 50) {
    improved = false
    iter++
    const cur = totalDist(path)
    for (let i = 1; i < path.length - 1; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const cand = [...path.slice(0, i), ...path.slice(i, j + 1).reverse(), ...path.slice(j + 1)]
        if (totalDist(cand) < cur - 0.01) {
          path.splice(0, path.length, ...cand)
          improved = true
          break
        }
      }
      if (improved) break
    }
  }
  return path
}
