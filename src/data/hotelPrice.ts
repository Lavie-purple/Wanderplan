/**
 * 酒店价格区间（人民币/晚）。每个酒店一个 [min, max] 范围，
 * 反映国内主流 OTA 的常见报价区间。可随时替换为 Booking/携程 API 实时价。
 */
export interface PriceRange {
  min: number
  max: number
  currency: 'CNY' | 'USD' | 'EUR' | 'JPY' | 'THB' | 'MYR'
}

export const POI_HOTEL_PRICE: Record<string, PriceRange> = {
  // 北京
  'bj-hotel': { min: 880, max: 1580, currency: 'CNY' },
  'bj-hotel2': { min: 380, max: 520, currency: 'CNY' },
  'bj-hotel3': { min: 2200, max: 3800, currency: 'CNY' },
  'bj-hotel4': { min: 80, max: 180, currency: 'CNY' },

  // 上海
  'sh-hotel': { min: 1100, max: 1880, currency: 'CNY' },
  'sh-hotel2': { min: 420, max: 580, currency: 'CNY' },
  'sh-hotel3': { min: 80, max: 160, currency: 'CNY' },
  'sh-hotel4': { min: 980, max: 1480, currency: 'CNY' },

  // 成都
  'cd-hotel': { min: 380, max: 520, currency: 'CNY' },
  'cd-hotel2': { min: 60, max: 120, currency: 'CNY' },
  'cd-hotel3': { min: 1280, max: 2380, currency: 'CNY' },

  // 杭州
  'hz-hotel': { min: 420, max: 580, currency: 'CNY' },
  'hz-hotel2': { min: 80, max: 150, currency: 'CNY' },
  'hz-hotel3': { min: 2380, max: 4200, currency: 'CNY' },

  // 西安
  'xa-hotel': { min: 380, max: 540, currency: 'CNY' },
  'xa-hotel2': { min: 60, max: 110, currency: 'CNY' },
  'xa-hotel3': { min: 880, max: 1380, currency: 'CNY' },

  // 大理
  'dl-hotel': { min: 1100, max: 1800, currency: 'CNY' },
  'dl-hotel2': { min: 680, max: 1080, currency: 'CNY' },
  'dl-hotel3': { min: 80, max: 140, currency: 'CNY' },

  // 重庆
  'cq-hotel': { min: 1100, max: 1880, currency: 'CNY' },
  'cq-hotel2': { min: 420, max: 580, currency: 'CNY' },
  'cq-hotel3': { min: 60, max: 120, currency: 'CNY' },

  // 青岛
  'qd-hotel': { min: 580, max: 880, currency: 'CNY' },
  'qd-hotel2': { min: 1280, max: 2080, currency: 'CNY' },
  'qd-hotel3': { min: 60, max: 130, currency: 'CNY' },
  'qd-hotel4': { min: 380, max: 520, currency: 'CNY' },

  // 东京
  'tk-hotel': { min: 5800, max: 8800, currency: 'JPY' },
  'tk-hotel2': { min: 38000, max: 78000, currency: 'JPY' },
  'tk-hotel3': { min: 4500, max: 6500, currency: 'JPY' },
  'tk-hotel4': { min: 6800, max: 9800, currency: 'JPY' },

  // 京都
  'ky-hotel': { min: 8800, max: 15800, currency: 'JPY' },
  'ky-hotel2': { min: 4500, max: 7000, currency: 'JPY' },
  'ky-hotel3': { min: 68000, max: 138000, currency: 'JPY' },
  'ky-hotel4': { min: 8800, max: 12800, currency: 'JPY' },

  // 曼谷
  'bk-hotel': { min: 2200, max: 3200, currency: 'THB' },
  'bk-hotel2': { min: 12000, max: 22000, currency: 'THB' },
  'bk-hotel3': { min: 500, max: 800, currency: 'THB' },
  'bk-hotel4': { min: 1800, max: 2800, currency: 'THB' },

  // 清迈
  'cm-hotel': { min: 1800, max: 2800, currency: 'THB' },
  'cm-hotel2': { min: 18000, max: 32000, currency: 'THB' },
  'cm-hotel3': { min: 250, max: 450, currency: 'THB' },
  'cm-hotel4': { min: 1500, max: 2400, currency: 'THB' },

  // 吉隆坡
  'kl-hotel': { min: 280, max: 420, currency: 'MYR' },
  'kl-hotel2': { min: 980, max: 1680, currency: 'MYR' },
  'kl-hotel3': { min: 60, max: 110, currency: 'MYR' },
  'kl-hotel4': { min: 480, max: 720, currency: 'MYR' },

  // 槟城
  'pg-hotel': { min: 280, max: 420, currency: 'MYR' },
  'pg-hotel2': { min: 880, max: 1480, currency: 'MYR' },
  'pg-hotel3': { min: 60, max: 100, currency: 'MYR' },
  'pg-hotel4': { min: 380, max: 580, currency: 'MYR' },

  // 兰卡威
  'lk-hotel': { min: 480, max: 720, currency: 'MYR' },
  'lk-hotel2': { min: 1800, max: 3800, currency: 'MYR' },
  'lk-hotel3': { min: 80, max: 150, currency: 'MYR' },
  'lk-hotel4': { min: 320, max: 480, currency: 'MYR' },

  // 马六甲
  'mk-hotel': { min: 280, max: 420, currency: 'MYR' },
  'mk-hotel2': { min: 80, max: 140, currency: 'MYR' },
  'mk-hotel3': { min: 580, max: 980, currency: 'MYR' },
  'mk-hotel4': { min: 320, max: 480, currency: 'MYR' },
  'ml-hotel': { min: 280, max: 420, currency: 'MYR' },
  'ml-hotel2': { min: 80, max: 140, currency: 'MYR' },
  'ml-hotel3': { min: 580, max: 980, currency: 'MYR' },
  'ml-hotel4': { min: 320, max: 480, currency: 'MYR' },

  // 巴生
  'klg-hotel': { min: 280, max: 380, currency: 'MYR' },
  'klg-hotel2': { min: 480, max: 780, currency: 'MYR' },
  'klg-hotel3': { min: 60, max: 110, currency: 'MYR' },
  'klg-hotel4': { min: 320, max: 480, currency: 'MYR' },

  // 巴黎
  'pa-hotel': { min: 180, max: 280, currency: 'EUR' },
  'pa-hotel2': { min: 1200, max: 2400, currency: 'EUR' },
  'pa-hotel3': { min: 40, max: 70, currency: 'EUR' },
  'pa-hotel4': { min: 160, max: 240, currency: 'EUR' },

  // 罗马
  'rm-hotel': { min: 160, max: 240, currency: 'EUR' },
  'rm-hotel2': { min: 480, max: 880, currency: 'EUR' },
  'rm-hotel3': { min: 35, max: 65, currency: 'EUR' },
  'rm-hotel4': { min: 180, max: 280, currency: 'EUR' },
}

export function formatPriceRange(id: string): string {
  const p = POI_HOTEL_PRICE[id]
  if (!p) return '价格待定'
  const symbol = { CNY: '¥', USD: '$', EUR: '€', JPY: '¥', THB: '฿', MYR: 'RM' }[p.currency]
  return `${symbol}${p.min}–${symbol}${p.max}/晚`
}
