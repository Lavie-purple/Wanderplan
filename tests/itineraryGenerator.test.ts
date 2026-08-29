import { describe, expect, it } from 'vitest'
import { findAlternative, generateItinerary } from '../src/utils/itineraryGenerator'
import type { City, Poi } from '../src/types'

const P = (id: string, type: Poi['type'], name = id, closedDays?: number[]): Poi => ({
  id, name, type, location: [0, 0], rating: 4.5, description: '', closedDays,
})

const city = (id: string, pois: Poi[]): City => ({
  id,
  countryId: 'test',
  name: id,
  province: '',
  emoji: '🏙',
  gradient: '',
  tagline: '',
  description: '',
  location: [0, 0],
  tags: [],
  pois,
})

describe('generateItinerary', () => {
  it('生成基础行程：每天 1 个景点 + 1 个美食 + 1 个酒店', () => {
    const c = city('c1', [
      P('a1', 'attraction', '故宫'),
      P('a2', 'attraction', '天坛'),
      P('a3', 'attraction', '颐和园'),
      P('f1', 'food', '烤鸭'),
      P('f2', 'food', '炸酱面'),
      P('h1', 'hotel', '北京饭店'),
    ])
    const result = generateItinerary([c], 3, 'balanced')
    expect(result).toHaveLength(3)
    expect(result[0].items.length).toBeGreaterThan(0)
    // 第 1 天有酒店
    expect(result[0].items.some((p) => p.type === 'hotel')).toBe(true)
    // 第 2、3 天不应再有酒店（firstDayOfCity 只对首日生效）
    expect(result[1].items.some((p) => p.type === 'hotel')).toBe(false)
    expect(result[2].items.some((p) => p.type === 'hotel')).toBe(false)
  })

  it('雨天优先安排室内人文点', () => {
    const c = city('c1', [
      P('a1', 'attraction', '室外公园'),
      P('c1', 'culture', '博物馆'),
    ])
    const rainy = new Set([0]) // 第 1 天下雨
    const result = generateItinerary([c], 1, 'balanced', undefined, { rainyDays: rainy })
    // 雨天时 attraction slot 应优先返回 culture 类型
    expect(result[0].items.some((p) => p.type === 'culture')).toBe(true)
  })

  it('闭馆日会被跳过（不会出现在安排中）', () => {
    const c = city('c1', [
      P('a1', 'attraction', '闭馆周一', [1]), // 周一闭馆
      P('a2', 'attraction', '一直开放'),
    ])
    // 2024-01-01 是周一 → 闭馆日
    const result = generateItinerary([c], 5, 'balanced', undefined, { startDate: '2024-01-01' })
    const day1Items = result[0].items
    // 第 1 天（周一）不应有"闭馆周一"
    expect(day1Items.some((p) => p.name === '闭馆周一')).toBe(false)
  })

  it('预算=经济档：仅显示青旅/快捷酒店', () => {
    const c = city('c1', [
      P('h-lux', 'hotel', '上海外滩瑞吉酒店'),
      P('h-com', 'hotel', '亚朵酒店'),
      P('h-eco', 'hotel', '熊猫驿站国际青旅'),
      P('a1', 'attraction', '景点A'),
    ])
    // 把瑞吉和亚朵的 rating 调高以排除经济档
    ;(c.pois[0] as Poi).rating = 4.8
    ;(c.pois[1] as Poi).rating = 4.6
    const result = generateItinerary([c], 1, 'balanced', undefined, { budget: 'economy' })
    const hotel = result[0].items.find((p) => p.type === 'hotel')
    // 经济档应选青旅（只有 1 个酒店，且名字含"青旅"）
    expect(hotel?.name).toBe('熊猫驿站国际青旅')
  })

  it('预算=豪华档：仅显示 4.7+ 评分酒店', () => {
    const c = city('c1', [
      P('h-lux', 'hotel', '丽思卡尔顿', undefined),
    ])
    // 评分需 ≥ 4.7 才进入豪华候选
    ;(c.pois[0] as Poi).rating = 4.9
    const result = generateItinerary([c], 1, 'balanced', undefined, { budget: 'luxury' })
    const hotel = result[0].items.find((p) => p.type === 'hotel')
    expect(hotel?.name).toBe('丽思卡尔顿')
  })

  it('节奏=5（深度游）每天只放 1 个景点 + 1 个美食', () => {
    const c = city('c1', [
      P('a1', 'attraction'),
      P('a2', 'attraction'),
      P('a3', 'attraction'),
      P('f1', 'food'),
    ])
    const result = generateItinerary([c], 1, 'balanced', undefined, { paceIntensity: 5 })
    // 节奏 5 时 slots 限制为 ['attraction','food']
    expect(result[0].items.filter((p) => p.type === 'attraction').length).toBe(1)
  })

  it('节奏=1（塞满）attraction slot 数量翻倍', () => {
    const c = city('c1', [
      P('a1', 'attraction'), P('a2', 'attraction'), P('a3', 'attraction'),
      P('a4', 'attraction'), P('a5', 'attraction'), P('a6', 'attraction'),
      P('a7', 'attraction'), P('a8', 'attraction'),
    ])
    const result = generateItinerary([c], 1, 'balanced', undefined, { paceIntensity: 1 })
    // 节奏 1 时 attraction 翻倍，至少 4 个
    expect(result[0].items.filter((p) => p.type === 'attraction').length).toBeGreaterThanOrEqual(4)
  })

  it('落地日 18:00 后到达：安排数 -2', () => {
    const c = city('c1', [
      P('a1', 'attraction'), P('a2', 'attraction'), P('a3', 'attraction'),
      P('f1', 'food'), P('f2', 'food'), P('f3', 'food'),
    ])
    const base = generateItinerary([c], 1, 'balanced', undefined, { arrivalDay: true })
    const baseCount = base[0].items.filter((p) => p.type !== 'hotel').length
    const late = generateItinerary([c], 1, 'balanced', undefined, { arrivalDay: true, arrivalTime: '20:00' })
    const lateCount = late[0].items.filter((p) => p.type !== 'hotel').length
    // 晚到比正常少至少 1 个
    expect(lateCount).toBeLessThanOrEqual(baseCount - 1)
  })

  it('跨城日：penalty 扣减安排数（飞机扣 2）', () => {
    const c1 = city('c1', [P('a1', 'attraction'), P('a2', 'attraction'), P('a3', 'attraction'), P('f1', 'food')])
    const c2 = city('c2', [P('b1', 'attraction'), P('b2', 'attraction'), P('b3', 'attraction'), P('g1', 'food')])
    const result = generateItinerary([c1, c2], 2, 'balanced', undefined, { transport: 'plane' })
    // 第 2 天是换城日，安排数应少于第 1 天
    expect(result[1].items.length).toBeLessThanOrEqual(result[0].items.length)
  })
})

describe('findAlternative', () => {
  it('能找到同类型不同 id 的备选', () => {
    const c = city('c1', [P('a1', 'attraction'), P('a2', 'attraction')])
    const cur = c.pois[0]
    const used = new Set<string>([cur.id])
    const alt = findAlternative(c, cur, used)
    expect(alt?.id).toBe('a2')
  })

  it('没有备选时返回 null', () => {
    const c = city('c1', [P('a1', 'attraction')])
    const cur = c.pois[0]
    const used = new Set<string>([cur.id])
    expect(findAlternative(c, cur, used)).toBeNull()
  })
})

describe('legs 与 otherItems 一一对应', () => {
  it('legs 长度 = otherItems 长度 - 1（每段都渲染）', () => {
    const c = city('c1', [
      P('a1', 'attraction'),
      P('a2', 'attraction'),
      P('a3', 'attraction'),
      P('f1', 'food'),
      P('f2', 'food'),
      P('h1', 'hotel'),
    ])
    const result = generateItinerary([c], 1, 'balanced')
    const otherItems = result[0].items.filter((p) => p.type !== 'hotel' && p.type !== 'transport')
    const legs = result[0].legs ?? []
    expect(legs.length).toBe(otherItems.length - 1)
  })

  it('legs[0] 对应 otherItems[0] → otherItems[1] 的交通', () => {
    const c = city('c1', [
      P('a1', 'attraction'),
      P('a2', 'attraction'),
      P('f1', 'food'),
      P('h1', 'hotel'),
    ])
    const result = generateItinerary([c], 1, 'balanced')
    const otherItems = result[0].items.filter((p) => p.type !== 'hotel' && p.type !== 'transport')
    const legs = result[0].legs ?? []
    // 每段 legs[i] 描述 otherItems[i] → otherItems[i+1]
    for (let i = 0; i < legs.length; i++) {
      expect(legs[i]).toBeDefined()
      expect(legs[i].minutes).toBeGreaterThan(0)
    }
    expect(legs.length).toBe(otherItems.length - 1)
  })

  it('交通枢纽不在 legs 中（避免与酒店/车站相连的无效腿）', () => {
    const c = city('c1', [
      P('a1', 'attraction'),
      P('a2', 'attraction'),
      P('t1', 'transport'),
      P('h1', 'hotel'),
    ])
    const result = generateItinerary([c], 1, 'balanced')
    const otherItems = result[0].items.filter((p) => p.type !== 'hotel' && p.type !== 'transport')
    const legs = result[0].legs ?? []
    expect(legs.length).toBe(otherItems.length - 1)
  })
})
