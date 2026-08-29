import type { Continent, Country } from '../types'

/**
 * 大洲（按国际游客到访数排序，TOP2 标"洲级 TOP1/TOP2"）：
 *  - 亚洲：到访数最多
 *  - 欧洲：紧随其后
 *  - 北美洲 / 大洋洲 / 非洲 / 南美洲
 */
export const CONTINENTS: Continent[] = [
  { id: 'asia', name: '亚洲', emoji: '🌏' },
  { id: 'europe', name: '欧洲', emoji: '🌍' },
  { id: 'north_america', name: '北美洲', emoji: '🌎' },
  { id: 'oceania', name: '大洋洲', emoji: '🏝️' },
  { id: 'africa', name: '非洲', emoji: '🦁' },
  { id: 'south_america', name: '南美洲', emoji: '🌴' },
]

/**
 * 国家（按国际游客到访数排序 2023 数据，同一洲内按热门度）：
 * - 亚洲：法国、西班牙、美国、意大利、中国、土耳其、墨西哥、泰国、德国、英国...
 *   在我们的项目里以中国/日本/泰国/韩国/新加坡/越南/印度/阿联酋/土耳其/印尼 为代表
 * - 欧洲：法国、意大利、西班牙、德国、英国、希腊、荷兰、瑞士、奥地利
 * - 北美：美国、加拿大、墨西哥
 * - 大洋洲：澳大利亚、新西兰
 * - 非洲：埃及、摩洛哥、南非
 * - 南美：巴西、阿根廷、秘鲁
 */
export const countries: Country[] = [
  // ==================== 亚洲 ====================
  {
    id: 'china', continent: 'asia', name: '中国', emoji: '🇨🇳',
    description: '从北国雪原到江南水乡，五千年历史与八大菜系',
    view: { center: [35.5, 105], zoom: 4 },
  },
  {
    id: 'japan', continent: 'asia', name: '日本', emoji: '🇯🇵',
    description: '神社古都与潮流都会，四季皆景',
    view: { center: [36.5, 138.5], zoom: 5 },
  },
  {
    id: 'thailand', continent: 'asia', name: '泰国', emoji: '🇹🇭',
    description: '微笑之国，寺庙、海岛与街头美食',
    view: { center: [15.5, 101], zoom: 6 },
  },
  {
    id: 'korea', continent: 'asia', name: '韩国', emoji: '🇰🇷',
    description: '首尔潮流、济州海岛与韩式烤肉',
    view: { center: [36.5, 128], zoom: 7 },
  },
  {
    id: 'singapore', continent: 'asia', name: '新加坡', emoji: '🇸🇬',
    description: '狮城花园城市，亚洲美食与购物天堂',
    view: { center: [1.35, 103.82], zoom: 11 },
  },
  {
    id: 'malaysia', continent: 'asia', name: '马来西亚', emoji: '🇲🇾',
    description: '南洋风情，多元文化交汇的美食之地',
    view: { center: [3.8, 102], zoom: 6 },
  },
  {
    id: 'vietnam', continent: 'asia', name: '越南', emoji: '🇻🇳',
    description: '湄公河三角洲、下龙湾与法殖风情',
    view: { center: [16, 108], zoom: 6 },
  },
  {
    id: 'india', continent: 'asia', name: '印度', emoji: '🇮🇳',
    description: '泰姬陵、恒河与多元文化古国',
    view: { center: [22, 79], zoom: 5 },
  },
  {
    id: 'uae', continent: 'asia', name: '阿联酋', emoji: '🇦🇪',
    description: '迪拜哈利法塔、沙漠奢华与未来建筑',
    view: { center: [24.5, 54.5], zoom: 7 },
  },
  {
    id: 'turkey', continent: 'asia', name: '土耳其', emoji: '🇹🇷',
    description: '横跨欧亚，伊斯坦布尔与卡帕多奇亚热气球',
    view: { center: [39, 35], zoom: 5 },
  },
  {
    id: 'indonesia', continent: 'asia', name: '印度尼西亚', emoji: '🇮🇩',
    description: '巴厘岛、婆罗浮屠与千岛之国',
    view: { center: [-2, 118], zoom: 5 },
  },
  {
    id: 'philippines', continent: 'asia', name: '菲律宾', emoji: '🇵🇭',
    description: '长滩岛、宿务与热带海岛',
    view: { center: [12, 122], zoom: 6 },
  },

  // ==================== 欧洲 ====================
  {
    id: 'france', continent: 'europe', name: '法国', emoji: '🇫🇷',
    description: '浪漫与艺术之都，博物馆与美食的殿堂',
    view: { center: [46.6, 2.4], zoom: 6 },
  },
  {
    id: 'italy', continent: 'europe', name: '意大利', emoji: '🇮🇹',
    description: '罗马帝国遗产与地中海风情美食',
    view: { center: [42.8, 12.5], zoom: 5 },
  },
  {
    id: 'spain', continent: 'europe', name: '西班牙', emoji: '🇪🇸',
    description: '高迪建筑、弗拉门戈与地中海',
    view: { center: [40, -3.7], zoom: 6 },
  },
  {
    id: 'germany', continent: 'europe', name: '德国', emoji: '🇩🇪',
    description: '新天鹅堡、柏林与啤酒节',
    view: { center: [51, 10.5], zoom: 6 },
  },
  {
    id: 'uk', continent: 'europe', name: '英国', emoji: '🇬🇧',
    description: '伦敦大本钟、莎士比亚与下午茶',
    view: { center: [54, -2], zoom: 6 },
  },
  {
    id: 'greece', continent: 'europe', name: '希腊', emoji: '🇬🇷',
    description: '圣托里尼、爱琴海与雅典卫城',
    view: { center: [39, 22], zoom: 6 },
  },
  {
    id: 'netherlands', continent: 'europe', name: '荷兰', emoji: '🇳🇱',
    description: '阿姆斯特丹运河、风车与郁金香',
    view: { center: [52.1, 5.3], zoom: 7 },
  },
  {
    id: 'switzerland', continent: 'europe', name: '瑞士', emoji: '🇨🇭',
    description: '阿尔卑斯雪山、巧克力与苏黎世',
    view: { center: [46.8, 8.2], zoom: 7 },
  },

  // ==================== 北美洲 ====================
  {
    id: 'usa', continent: 'north_america', name: '美国', emoji: '🇺🇸',
    description: '纽约时代广场、大峡谷与好莱坞',
    view: { center: [39, -98], zoom: 4 },
  },
  {
    id: 'canada', continent: 'north_america', name: '加拿大', emoji: '🇨🇦',
    description: '落基山脉、尼亚加拉与极光',
    view: { center: [56, -106], zoom: 4 },
  },
  {
    id: 'mexico', continent: 'north_america', name: '墨西哥', emoji: '🇲🇽',
    description: '玛雅遗迹、加勒比海岸与亡灵节',
    view: { center: [23.6, -102.5], zoom: 5 },
  },

  // ==================== 大洋洲 ====================
  {
    id: 'australia', continent: 'oceania', name: '澳大利亚', emoji: '🇦🇺',
    description: '悉尼歌剧院、大堡礁与乌鲁鲁',
    view: { center: [-25, 133], zoom: 4 },
  },
  {
    id: 'new_zealand', continent: 'oceania', name: '新西兰', emoji: '🇳🇿',
    description: '霍比特村、冰川与南阿尔卑斯',
    view: { center: [-41, 174], zoom: 5 },
  },

  // ==================== 非洲 ====================
  {
    id: 'egypt', continent: 'africa', name: '埃及', emoji: '🇪🇬',
    description: '金字塔、狮身人面像与尼罗河',
    view: { center: [26.8, 30.8], zoom: 6 },
  },
  {
    id: 'morocco', continent: 'africa', name: '摩洛哥', emoji: '🇲🇦',
    description: '马拉喀什麦地那与撒哈拉星空',
    view: { center: [31.8, -7.1], zoom: 6 },
  },
  {
    id: 'south_africa', continent: 'africa', name: '南非', emoji: '🇿🇦',
    description: '开普敦、好望角与野生动物',
    view: { center: [-30.5, 22.9], zoom: 5 },
  },

  // ==================== 南美洲 ====================
  {
    id: 'brazil', continent: 'south_america', name: '巴西', emoji: '🇧🇷',
    description: '里约热内卢、亚马逊雨林与桑巴',
    view: { center: [-14, -51], zoom: 4 },
  },
  {
    id: 'argentina', continent: 'south_america', name: '阿根廷', emoji: '🇦🇷',
    description: '布宜诺斯艾利斯、莫雷诺冰川与探戈',
    view: { center: [-38, -63], zoom: 4 },
  },
  {
    id: 'peru', continent: 'south_america', name: '秘鲁', emoji: '🇵🇪',
    description: '马丘比丘、的的喀喀湖与纳斯卡线',
    view: { center: [-9.2, -75], zoom: 5 },
  },
]

/** 国家大洲归属（快速查询） */
export const CONTINENT_OF_COUNTRY: Record<string, string> = Object.fromEntries(
  countries.map((c) => [c.id, c.continent]),
)

/**
 * 各洲 TOP2 推荐国家（按热门度预设；后续可改成"按 user preference 动态算"）。
 * 洲级标识：圈圈右上角角标"TOP1/TOP2"。
 */
export const TOP_COUNTRIES_BY_CONTINENT: Record<string, string[]> = {
  asia: ['china', 'japan'],
  europe: ['france', 'italy'],
  north_america: ['usa', 'canada'],
  oceania: ['australia', 'new_zealand'],
  africa: ['egypt', 'morocco'],
  south_america: ['brazil', 'argentina'],
}

/**
 * 各国内 TOP2 推荐城市。**只标识在国家/城市卡片右上的 TOP1/TOP2 小角标。**
 * 优先级：用户没选时按热门度；用户选了后按 matchScore 实时算。
 */
export const TOP_CITIES_BY_COUNTRY: Record<string, string[]> = {
  china: ['beijing', 'shanghai'],
  japan: ['tokyo', 'kyoto'],
  thailand: ['bangkok', 'chiangmai'],
  korea: ['tokyo', 'seoul'],
  // 注：seoul 城市未在 cities.ts 中时，角标会跳过它
  singapore: ['singapore', 'sentosa'],
  malaysia: ['kualalumpur', 'langkawi'],
  vietnam: ['hanoi', 'ho_chi_minh'],
  india: ['delhi', 'mumbai'],
  uae: ['dubai', 'abu_dhabi'],
  turkey: ['istanbul', 'cappadocia'],
  indonesia: ['bali', 'jakarta'],
  philippines: ['manila', 'boracay'],
  france: ['paris', 'versailles'],
  italy: ['rome', 'florence'],
  spain: ['barcelona', 'madrid'],
  germany: ['berlin', 'munich'],
  uk: ['london', 'edinburgh'],
  greece: ['athens', 'santorini'],
  netherlands: ['amsterdam', 'rotterdam'],
  switzerland: ['zurich', 'geneva'],
  usa: ['new_york', 'los_angeles'],
  canada: ['toronto', 'vancouver'],
  mexico: ['mexico_city', 'cancun'],
  australia: ['sydney', 'melbourne'],
  new_zealand: ['auckland', 'queenstown'],
  egypt: ['cairo', 'luxor'],
  morocco: ['marrakech', 'casablanca'],
  south_africa: ['cape_town', 'johannesburg'],
  brazil: ['rio_de_janeiro', 'sao_paulo'],
  argentina: ['buenos_aires', 'patagonia'],
  peru: ['lima', 'cusco'],
}

/** 各洲 TOP2 推荐国家（按热门度） */
export const COUNTRY_RANK: Record<string, number> = (() => {
  const r: Record<string, number> = {}
  Object.entries(TOP_COUNTRIES_BY_CONTINENT).forEach(([_, ids]) => {
    ids.forEach((id, i) => (r[id] = i + 1))
  })
  return r
})()

/** 各国内 TOP2 推荐城市（按热门度） */
export const CITY_RANK: Record<string, number> = (() => {
  const r: Record<string, number> = {}
  Object.entries(TOP_CITIES_BY_COUNTRY).forEach(([, ids]) => {
    ids.forEach((id, i) => (r[id] = i + 1))
  })
  return r
})()

/** TOP1/TOP2 角标小标（CSS 友好） */
export const TOP_BADGE = (rank: number): string => (rank >= 1 && rank <= 2 ? `TOP${rank}` : '')
