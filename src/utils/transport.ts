import { haversineKm } from './coord'
import type { City, TransportMode } from '../types'

export const TRANSPORT_META: Record<
  TransportMode,
  { label: string; emoji: string; desc: string; /** 换城日扣减的安排数 */ slotPenalty: number; /** 平均时速 km/h */ speed: number; /** 市内接驳固定耗时 h */ overhead: number }
> = {
  plane: { label: '飞机', emoji: '✈️', desc: '跨国 / 长距离首选，换城日约减 2 个安排', slotPenalty: 2, speed: 700, overhead: 2.5 },
  train: { label: '高铁/火车', emoji: '🚄', desc: '国内中长距离最稳，换城日约减 1 个安排', slotPenalty: 1, speed: 220, overhead: 1.2 },
  bus: { label: '大巴', emoji: '🚌', desc: '短途跨境经济之选，换城日约减 1 个安排', slotPenalty: 1, speed: 80, overhead: 0.8 },
  car: { label: '自驾/包车', emoji: '🚗', desc: '时间最灵活，沿途随时可停', slotPenalty: 0, speed: 75, overhead: 0.5 },
}

/** 两城之间该交通方式的预估门到门耗时（h，取 0.5h 精度） */
export function legHours(a: City, b: City, mode: TransportMode): number {
  const km = haversineKm(a.location, b.location)
  const m = TRANSPORT_META[mode]
  const raw = km / m.speed + m.overhead
  return Math.round(raw * 2) / 2
}
