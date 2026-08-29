/**
 * 离线扩展 POI 库：补充 cities.ts 中没有覆盖的知名景点，方便用户搜索。
 * 字段结构与 Poi 保持一致，可直接被"手动添加"流程注入。
 */
import type { Poi } from '../types'

export const EXTRA_POIS: Poi[] = [
  // —— 长沙 ——
  { id: 'cs-wenheyou', name: '超级文和友', type: 'food', location: [28.1937, 112.9784], rating: 4.6, description: '复刻 80 年代长沙街景的网红美食集合体，排号动辄两小时。', duration: 2.0, hiddenTags: ['moderate'] },
  { id: 'cs-yuelu', name: '岳麓书院', type: 'culture', location: [28.1859, 112.9431], rating: 4.7, description: '千年学府，自卑亭到爱晚亭一路书香。', duration: 2.0, hiddenTags: ['moderate'] },
  { id: 'cs-jiefangxi', name: '解放西路酒吧街', type: 'food', location: [28.228, 112.967], rating: 4.4, description: '夜生活地标，凌晨两点的长沙。', duration: 1.0, hiddenTags: ['casual', 'passby'] },
  { id: 'cs-mawangdui', name: '湖南省博物馆·马王堆', type: 'culture', location: [28.222, 113.012], rating: 4.8, description: '辛追夫人 T 形帛画必看，免费预约。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 哈尔滨 ——
  { id: 'heb-zhaolin', name: '兆麟公园冰灯', type: 'attraction', location: [45.772, 126.628], rating: 4.7, description: '冬季限定冰雕大观，1 月最盛。', duration: 1.0, hiddenTags: ['casual', 'passby'] },
  { id: 'heb-zhongyang', name: '中央大街', type: 'attraction', location: [45.768, 126.62], rating: 4.7, description: '百年面包石路与马迭尔冰棍。', duration: 1.0, hiddenTags: ['casual', 'passby'] },
  { id: 'heb-saint', name: '圣索菲亚教堂', type: 'attraction', location: [45.768, 126.625], rating: 4.6, description: '拜占庭式红砖老教堂，城市地标。', duration: 2.0, hiddenTags: ['moderate'] },

  // —— 厦门 ——
  { id: 'xm-gulangyu', name: '鼓浪屿', type: 'attraction', location: [24.448, 118.067], rating: 4.7, ticket: '船票¥35 起（核心景点联票¥90）', description: '万国建筑与海钢琴声，需提前预约船票。', duration: 2.0, hiddenTags: ['moderate'] },
  { id: 'xm-nanputuo', name: '南普陀寺', type: 'culture', location: [24.443, 118.097], rating: 4.6, ticket: '免费', description: '千年古寺，背靠五老峰面朝大海。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'xm-zhongshan', name: '中山路步行街', type: 'shopping', location: [24.456, 118.082], rating: 4.4, description: '骑楼老街，海蛎煎和沙茶面。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 苏州 ——
  { id: 'sz-zhuozheng', name: '拙政园', type: 'attraction', location: [31.326, 120.629], rating: 4.7, ticket: '旺季¥80', description: '中国园林典范，4-6 月最美。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'sz-hanxishan', name: '寒山寺', type: 'culture', location: [31.327, 120.554], rating: 4.5, ticket: '¥20', description: '姑苏城外寒山寺，夜半钟声到客船。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'sz-pingjiang', name: '平江路历史街区', type: 'food', location: [31.323, 120.629], rating: 4.6, description: '水巷小桥的江南老街，评弹声声。', duration: 1.0, hiddenTags: ['casual', 'passby'] },

  // —— 敦煌（远途专线） ——
  { id: 'dh-mogao', name: '莫高窟', type: 'culture', location: [40.046, 94.665], rating: 4.9, ticket: '旺季¥238（A类票需预约）', description: '千年壁画圣殿，需 A/B/C 类票提前预约。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'dh-mingsha', name: '鸣沙山·月牙泉', type: 'attraction', location: [40.082, 94.661], rating: 4.8, ticket: '¥110', description: '沙山中的清泉，日落骑骆驼最赞。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 张家界 ——
  { id: 'zjjs-tianmen', name: '天门山', type: 'attraction', location: [29.058, 110.473], rating: 4.7, ticket: '¥278（含索道）', description: '999 级天梯与玻璃栈道，索道 30 分钟上山。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'zjjs-zhangjiajie', name: '张家界国家森林公园', type: 'attraction', location: [29.32, 110.475], rating: 4.8, ticket: '¥224（四日票）', description: '阿凡达取景地，迷魂台看石柱林。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 拉萨 ——
  { id: 'ls-potala', name: '布达拉宫', type: 'culture', location: [29.657, 91.117], rating: 4.9, ticket: '旺季¥200（需预约）', description: '世界屋脊明珠，门票 1 天限量需预约。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'ls-jokhang', name: '大昭寺', type: 'culture', location: [29.653, 91.132], rating: 4.8, ticket: '¥85', description: '藏传佛教信徒朝拜中心。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 三亚 ——
  { id: 'sy-yalong', name: '亚龙湾', type: 'attraction', location: [18.205, 109.665], rating: 4.8, ticket: '免费（部分湾区另收）', description: '国内最美海湾之一，沙细水清。', duration: 1.0, hiddenTags: ['casual', 'passby'] },
  { id: 'sy-tianya', name: '天涯海角', type: 'attraction', location: [18.301, 109.434], rating: 4.5, ticket: '¥81', description: '标志石刻景区，海景壮观。', duration: 2.0, hiddenTags: ['moderate'] },
  { id: 'sy-nanshan', name: '南山文化旅游区', type: 'culture', location: [18.31, 109.21], rating: 4.7, ticket: '¥108', description: '108 米海上观音。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 平遥 ——
  { id: 'py-pingyao', name: '平遥古城', type: 'culture', location: [37.205, 112.174], rating: 4.7, ticket: '通票¥125（三日有效）', description: '明清县城活化石，住一晚古院最值。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'py-riying', name: '日昇昌票号', type: 'culture', location: [37.205, 112.176], rating: 4.5, description: '中国第一家票号，看晋商金融史。', duration: 2.0, hiddenTags: ['moderate'] },

  // —— 婺源 ——
  { id: 'wy-huangcun', name: '篁岭晒秋', type: 'attraction', location: [29.36, 117.86], rating: 4.6, ticket: '¥145（含索道）', description: '挂在山崖上的徽派村落，秋日最美。', duration: 2.0, hiddenTags: ['moderate'] },

  // —— 凤凰 ——
  { id: 'fh-fenghuang', name: '凤凰古城', type: 'attraction', location: [27.948, 109.598], rating: 4.6, ticket: '免费（九景联票¥128）', description: '沱江畔吊脚楼群，夜色灯笼醉人。', duration: 3.5, hiddenTags: ['deep', 'timed'] },

  // —— 厦门/泉州：补充美食 ——
  { id: 'qz-zaoan', name: '蟳埔簪花围', type: 'culture', location: [24.852, 118.685], rating: 4.5, description: '蟳埔女头饰文化，拍照超出片。', duration: 2.0, hiddenTags: ['moderate'] },

  // —— 国外追加 ——
  { id: 'pa-versailles', name: '凡尔赛宫', type: 'culture', location: [48.8049, 2.1204], rating: 4.8, ticket: '€21（ passports €32）', description: '从巴黎 RER C 40 分钟，半天足够。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'rm-trevi', name: '特莱维喷泉', type: 'attraction', location: [41.9009, 12.4833], rating: 4.7, ticket: '免费', description: '许愿池，背对投币重回罗马。', duration: 2.0, hiddenTags: ['moderate'] },
  { id: 'rm-colosseum', name: '罗马斗兽场', type: 'attraction', location: [41.8902, 12.4922], rating: 4.8, ticket: '€18（需预约）', description: '两千年的竞技场，联票含帕拉蒂尼山。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
  { id: 'tk-ueno', name: '上野公园', type: 'attraction', location: [35.714, 139.774], rating: 4.6, description: '春季樱花隧道，博物馆群集中。', duration: 1.0, hiddenTags: ['casual', 'passby'] },
  { id: 'ky-arashiyama', name: '岚山竹林', type: 'attraction', location: [35.017, 135.671], rating: 4.7, ticket: '免费（竹林）', description: '光影竹海，嵯峨野小火车沿途最美。', duration: 3.5, hiddenTags: ['deep', 'timed'] },
]
