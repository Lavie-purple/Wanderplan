import { describe, expect, it } from 'vitest'
import { computeLegs } from '../src/store/useAppStore'
import type { Poi } from '../src/types'

const p = (id: string, lat: number, lng: number): Poi => ({
  id, name: id, type: 'attraction', location: [lat, lng], rating: 4.5, description: '',
})

describe('computeLegs', () => {
  it('空数组返回空', () => {
    expect(computeLegs([])).toEqual([])
  })

  it('单个 POI 无 legs', () => {
    expect(computeLegs([p('a', 0, 0)])).toEqual([])
  })

  it('< 0.7km 步行', () => {
    const legs = computeLegs([p('a', 0, 0), p('b', 0, 0.005)]) // ~0.55km
    expect(legs[0].mode).toBe('walk')
    expect(legs[0].minutes).toBeGreaterThanOrEqual(5)
  })

  it('0.7-3km 地铁', () => {
    const legs = computeLegs([p('a', 0, 0), p('b', 0, 0.02)]) // ~2.2km
    expect(legs[0].mode).toBe('metro')
    expect(legs[0].line).toMatch(/号线/)
  })

  it('3-10km 公交', () => {
    const legs = computeLegs([p('a', 0, 0), p('b', 0, 0.05)]) // ~5.5km
    expect(legs[0].mode).toBe('bus')
    expect(legs[0].line).toMatch(/路/)
  })

  it('> 10km 打车', () => {
    const legs = computeLegs([p('a', 0, 0), p('b', 0, 0.2)]) // ~22km
    expect(legs[0].mode).toBe('taxi')
  })

  it('km 字段精度：没有 1.7999999999999998 浮点尾数', () => {
    const legs = computeLegs([p('a', 0, 0), p('b', 0.012, 0)])
    // 1.33 km, should be 1.3 (one decimal)
    const kmStr = String(legs[0].km)
    expect(kmStr).not.toMatch(/999999/)
    expect(legs[0].km).toBeGreaterThan(0)
  })

  it('三个 POI → 2 legs', () => {
    const legs = computeLegs([p('a', 0, 0), p('b', 0.01, 0), p('c', 0.02, 0)])
    expect(legs).toHaveLength(2)
  })
})
