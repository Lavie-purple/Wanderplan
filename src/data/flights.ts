/**
 * 真实交通接驳表（已离线整理，作为占位数据源；后续可换成高德/12306 API）。
 *
 * - cityLegs：城际班次（飞机/高铁），按 fromCityId+toCityId 索引。
 *   自动按出发城市 id 排序，可双向匹配。
 * - cityMetro：城市内主要地铁线路（按 POI 站点经纬度近似匹配）。
 *
 * 数据为示例，可逐步替换为开放 API 实时数据。
 */
import type { TransportMode } from '../types'

export interface CityLeg {
  mode: TransportMode
  /** 班次号（高铁/航班），如 G79 / CA1234 / K1023 */
  number: string
  /** 出发站 */
  fromStation: string
  /** 到达站 */
  toStation: string
  /** 历时（小时，0.5 = 30 分钟） */
  hours: number
  /** 价格（元） */
  price: number
  /** 班次描述（每天多少班 / 运行时段） */
  schedule?: string
}

const LEG: Array<[string, string, CityLeg]> = [
  // —— 中国高铁 ——
  ['beijing', 'xian',     { mode: 'train', number: 'G79',  fromStation: '北京西',  toStation: '西安北', hours: 4.75, price: 515, schedule: '每日 7–11 班 · 06:00–19:00' }],
  ['beijing', 'shanghai', { mode: 'train', number: 'G1',   fromStation: '北京南',  toStation: '上海虹桥', hours: 4.5,  price: 553, schedule: '每日 14+ 班 · 06:30–19:00' }],
  ['beijing', 'chengdu',  { mode: 'train', number: 'G89',  fromStation: '北京西',  toStation: '成都东', hours: 8.0,  price: 778, schedule: '每日 2 班' }],
  ['beijing', 'qingdao',  { mode: 'train', number: 'G2093',fromStation: '北京南',  toStation: '青岛北', hours: 4.2,  price: 314, schedule: '每日 5+ 班' }],
  ['beijing', 'hangzhou', { mode: 'train', number: 'G19',  fromStation: '北京南',  toStation: '杭州东', hours: 5.5,  price: 597, schedule: '每日 4 班' }],
  ['beijing', 'dali',     { mode: 'plane', number: 'MU5702', fromStation: '首都机场', toStation: '大理机场', hours: 3.5, price: 1380, schedule: '每日 1 班 · 经停昆明' }],
  ['beijing', 'chongqing',{ mode: 'train', number: 'G309', fromStation: '北京西',  toStation: '重庆北', hours: 9.0,  price: 754, schedule: '每日 1 班' }],
  ['shanghai','hangzhou', { mode: 'train', number: 'G7501',fromStation: '上海虹桥',toStation: '杭州东', hours: 1.0,  price: 73,  schedule: '每日 40+ 班' }],
  ['shanghai','chengdu',  { mode: 'plane', number: 'MU5401',fromStation: '虹桥机场',toStation: '双流机场', hours: 3.2, price: 980, schedule: '每日 6 班' }],
  ['shanghai','xian',     { mode: 'plane', number: 'MU2175',fromStation: '虹桥机场',toStation: '咸阳机场', hours: 2.7, price: 870, schedule: '每日 4 班' }],
  ['shanghai','qingdao',  { mode: 'train', number: 'G226', fromStation: '上海虹桥',toStation: '青岛北', hours: 5.2,  price: 396, schedule: '每日 3 班' }],
  ['shanghai','chongqing',{ mode: 'train', number: 'G1333',fromStation: '上海虹桥',toStation: '重庆西', hours: 9.5,  price: 728, schedule: '每日 1 班' }],
  ['xian',    'chengdu',  { mode: 'train', number: 'G2204',fromStation: '西安北',  toStation: '成都东', hours: 3.5,  price: 263, schedule: '每日 6+ 班' }],
  ['xian',    'chongqing',{ mode: 'train', number: 'G2232',fromStation: '西安北',  toStation: '重庆西', hours: 5.0,  price: 297, schedule: '每日 3 班' }],
  ['chengdu', 'chongqing',{ mode: 'train', number: 'G8525',fromStation: '成都东',  toStation: '重庆西', hours: 1.5,  price: 154, schedule: '每日 25+ 班 · 高铁公交化' }],
  ['chengdu', 'dali',     { mode: 'plane', number: '3U8885',fromStation: '双流机场',toStation: '大理机场', hours: 1.5,  price: 720, schedule: '每日 2 班' }],
  ['chengdu', 'hangzhou', { mode: 'plane', number: 'CA1743',fromStation: '双流机场',toStation: '萧山机场', hours: 3.0,  price: 880, schedule: '每日 3 班' }],
  ['chengdu', 'qingdao',  { mode: 'plane', number: '3U8881',fromStation: '双流机场',toStation: '胶东机场', hours: 2.7,  price: 850, schedule: '每日 1 班' }],
  ['hangzhou','xian',     { mode: 'plane', number: 'MU2371',fromStation: '萧山机场',toStation: '咸阳机场', hours: 2.5,  price: 760, schedule: '每日 3 班' }],
  ['hangzhou','qingdao',  { mode: 'plane', number: 'MU5678',fromStation: '萧山机场',toStation: '胶东机场', hours: 1.7,  price: 660, schedule: '每日 2 班' }],
  ['hangzhou','chongqing',{ mode: 'train', number: 'G1341',fromStation: '杭州东',  toStation: '重庆西', hours: 9.0,  price: 658, schedule: '每日 1 班' }],
  ['qingdao', 'xian',     { mode: 'plane', number: 'MU2231',fromStation: '胶东机场',toStation: '咸阳机场', hours: 2.3,  price: 690, schedule: '每日 2 班' }],
  ['qingdao', 'chengdu',  { mode: 'plane', number: 'CA4527',fromStation: '胶东机场',toStation: '双流机场', hours: 3.0,  price: 870, schedule: '每日 1 班' }],
  ['chongqing','dali',    { mode: 'plane', number: 'MU5833',fromStation: '江北机场',toStation: '大理机场', hours: 2.0,  price: 760, schedule: '每日 1 班' }],

  // —— 跨国/远距离优先飞机 ——
  ['beijing', 'tokyo',    { mode: 'plane', number: 'NH960', fromStation: '首都机场', toStation: '羽田机场', hours: 3.5, price: 2350, schedule: '每日 1+ 班' }],
  ['beijing', 'kyoto',    { mode: 'plane', number: 'CA161', fromStation: '首都机场', toStation: '关西机场', hours: 3.7, price: 2210, schedule: '每日 1 班 · 经停上海' }],
  ['beijing', 'bangkok',  { mode: 'plane', number: 'TG675', fromStation: '首都机场', toStation: '素万那普', hours: 5.0, price: 1980, schedule: '每日 2 班' }],
  ['beijing', 'chiangmai',{ mode: 'plane', number: 'MU2593',fromStation: '首都机场', toStation: '清迈机场', hours: 5.5, price: 2200, schedule: '每日 1 班' }],
  ['beijing', 'kualalumpur',{mode:'plane', number: 'MH361', fromStation: '首都机场', toStation: '吉隆坡机场', hours: 6.5, price: 2150, schedule: '每日 1 班' }],
  ['beijing', 'langkawi', { mode: 'plane', number: 'MH5581',fromStation: '首都机场', toStation: '兰卡威机场', hours: 8.5, price: 2600, schedule: '每日 1 班 · 经停吉隆坡' }],
  ['beijing', 'paris',    { mode: 'plane', number: 'AF383', fromStation: '首都机场', toStation: '戴高乐机场', hours: 11.0, price: 6800, schedule: '每日 1 班' }],
  ['beijing', 'rome',     { mode: 'plane', number: 'CA939', fromStation: '首都机场', toStation: '菲乌米奇诺', hours: 11.5, price: 6500, schedule: '每日 1 班' }],
  ['shanghai','tokyo',    { mode: 'plane', number: 'MU271', fromStation: '浦东机场', toStation: '羽田机场', hours: 3.0, price: 1980, schedule: '每日 5+ 班' }],
  ['shanghai','bangkok',  { mode: 'plane', number: 'TG663', fromStation: '浦东机场', toStation: '素万那普', hours: 4.5, price: 1680, schedule: '每日 3 班' }],
  ['shanghai','kualalumpur',{mode:'plane',number: 'MH389', fromStation: '浦东机场', toStation: '吉隆坡机场', hours: 5.5, price: 1830, schedule: '每日 1 班' }],
  ['shanghai','paris',    { mode: 'plane', number: 'AF111', fromStation: '浦东机场', toStation: '戴高乐机场', hours: 12.5, price: 7100, schedule: '每日 1 班' }],
  ['shanghai','rome',     { mode: 'plane', number: 'CA949', fromStation: '浦东机场', toStation: '菲乌米奇诺', hours: 12.5, price: 6800, schedule: '每日 1 班' }],
  ['kualalumpur','langkawi',{mode:'plane',number:'MH1432',fromStation: '吉隆坡机场', toStation: '兰卡威机场', hours: 1.0, price: 280, schedule: '每日 12+ 班' }],
  ['kualalumpur','penang',{ mode: 'train', number: 'KTM ETS',fromStation: '吉隆坡中央车站', toStation: '槟城', hours: 4.5, price: 90, schedule: '每日 7 班' }],
  ['kualalumpur','malacca',{ mode: 'bus', number: 'KKKL',   fromStation: '吉隆坡 TBS',  toStation: '马六甲', hours: 2.0, price: 25, schedule: '每小时 1 班' }],
  ['kualalumpur','klang',  { mode: 'train', number: 'KTM Komuter',fromStation: '吉隆坡中央车站', toStation: '巴生', hours: 0.7, price: 6, schedule: '每日 30+ 班' }],
  ['bangkok', 'chiangmai',{ mode: 'plane', number: 'TG102', fromStation: '素万那普', toStation: '清迈机场', hours: 1.2, price: 750, schedule: '每日 15+ 班' }],
  ['tokyo',   'kyoto',    { mode: 'train', number: 'Nozomi 21',fromStation: '东京站', toStation: '京都站', hours: 2.2, price: 580, schedule: '每日 30+ 班 · 需 IC 卡' }],
  ['paris',   'rome',     { mode: 'plane', number: 'AZ319', fromStation: '戴高乐机场', toStation: '菲乌米奇诺', hours: 2.0, price: 1200, schedule: '每日 3 班' }],
]

const legIndex = new Map<string, CityLeg>()
for (const [a, b, leg] of LEG) {
  legIndex.set(`${a}->${b}`, leg)
  // reverse lookup: if no explicit reverse entry, reuse the same schedule
  if (!legIndex.has(`${b}->${a}`)) {
    legIndex.set(`${b}->${a}`, {
      ...leg,
      number: leg.number,
      fromStation: leg.toStation,
      toStation: leg.fromStation,
    })
  }
}

export function getCityLeg(fromId: string, toId: string): CityLeg | null {
  return legIndex.get(`${fromId}->${toId}`) ?? null
}
