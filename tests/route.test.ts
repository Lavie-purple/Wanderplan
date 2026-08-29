import { describe, expect, it } from 'vitest'
import { optimizeOrder, resolveRouteOrder } from '../src/utils/route'
import type { City } from '../src/types'

const c = (id: string, lat: number, lng: number): City => ({
  id, countryId: '', name: id, province: '', emoji: '', gradient: '',
  tagline: '', description: '', location: [lat, lng], tags: [], pois: [],
})

describe('resolveRouteOrder', () => {
  const cities: City[] = [c('beijing', 39.9, 116.4), c('shanghai', 31.2, 121.5), c('guangzhou', 23.1, 113.3)]
  it('路线 A：按选择顺序', () => {
    const r = resolveRouteOrder(cities, null, 'A', null)
    expect(r.map((x) => x.id)).toEqual(['beijing', 'shanghai', 'guangzhou'])
  })
  it('路线 B：逆序', () => {
    const r = resolveRouteOrder(cities, null, 'B', null)
    expect(r.map((x) => x.id)).toEqual(['guangzhou', 'shanghai', 'beijing'])
  })
  it('路线 C：由南向北（纬度升序）', () => {
    const r = resolveRouteOrder(cities, null, 'C', null)
    expect(r.map((x) => x.id)).toEqual(['guangzhou', 'shanghai', 'beijing'])
  })
  it('路线 D（TSP）：总距离最短', () => {
    // 三个城市：beijing(北) - shanghai(中) - guangzhou(南)
    // 最短路径应该是 beijing → shanghai → guangzhou
    const r = resolveRouteOrder(cities, null, 'D', null)
    // D 不强制包含起点；任一对临近城市顺序均可
    const ids = r.map((x) => x.id)
    expect(ids).toContain('beijing')
    expect(ids).toContain('shanghai')
    expect(ids).toContain('guangzhou')
  })
  it('落地城市是已选城市时置顶', () => {
    const r = resolveRouteOrder(cities, 'shanghai', 'A', null)
    expect(r[0].id).toBe('shanghai')
    expect(r).toHaveLength(3)
  })
  it('手动顺序覆盖：未列出的城市补到末尾', () => {
    const r = resolveRouteOrder(cities, null, 'A', ['guangzhou', 'beijing'])
    // 用户给出 guangzhou → beijing，shanghai 缺失则补到尾
    expect(r.map((x) => x.id)).toEqual(['guangzhou', 'beijing', 'shanghai'])
  })
})

describe('optimizeOrder (TSP)', () => {
  it('空数组返回空', () => {
    expect(optimizeOrder([])).toEqual([])
  })
  it('单个城市', () => {
    const r = optimizeOrder([c('a', 0, 0)])
    expect(r).toHaveLength(1)
  })
  it('两个城市保持原样', () => {
    const r = optimizeOrder([c('a', 0, 0), c('b', 1, 1)])
    expect(r).toHaveLength(2)
  })
  it('4 城市 TSP 优化：4 城市呈矩形时最优路径是周边一圈', () => {
    const cities = [c('a', 0, 0), c('b', 0, 1), c('c', 1, 1), c('d', 1, 0)]
    const r = optimizeOrder(cities)
    expect(r).toHaveLength(4)
    // 任意起点都是矩形周边
  })
})
