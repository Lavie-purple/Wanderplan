import {
  BookOpen,
  Building2,
  Coffee,
  Footprints,
  Landmark,
  Mountain,
  Scale,
  ShoppingBag,
  Snowflake,
  Store,
  Sun,
  Trees,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PrefKey } from '../types'

export interface QuizOption {
  id: string
  label: string
  desc: string
  icon: LucideIcon
  tags: string[]
}

export interface QuizQuestion {
  key: PrefKey
  question: string
  hint: string
  options: QuizOption[]
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: 'travelStyle',
    question: '这次旅行，你最向往哪种风景？',
    hint: '跟着直觉选，没有标准答案',
    options: [
      { id: 'nature', label: '自然风光', desc: '山川湖海，云雾星空', icon: Mountain, tags: ['nature', 'outdoor'] },
      { id: 'culture', label: '人文历史', desc: '古城遗迹与旧时光', icon: Landmark, tags: ['culture', 'museum'] },
      { id: 'food', label: '美食寻味', desc: '为了一顿饭，奔赴一座城', icon: UtensilsCrossed, tags: ['food', 'local'] },
      { id: 'city', label: '城市漫步', desc: '街角咖啡、天际线与霓虹', icon: Building2, tags: ['city', 'shopping'] },
      { id: 'relax', label: '阳光度假', desc: '什么都不干，就是正经事', icon: Sun, tags: ['relax', 'nature'] },
    ],
  },
  {
    key: 'activity',
    question: '旅途中最让你兴奋的是？',
    hint: '选那个让你心跳加速的',
    options: [
      { id: 'outdoor', label: '徒步户外', desc: '用脚步丈量风景', icon: Footprints, tags: ['outdoor', 'nature'] },
      { id: 'museum', label: '逛博物馆', desc: '在文物面前发一会儿呆', icon: BookOpen, tags: ['museum', 'culture'] },
      { id: 'shopping', label: '逛街购物', desc: '把当地设计带回家', icon: ShoppingBag, tags: ['shopping', 'city'] },
      { id: 'local', label: '市井烟火', desc: '钻进菜市场和小巷子', icon: Store, tags: ['local', 'food'] },
    ],
  },
  {
    key: 'pace',
    question: '你理想的旅行节奏是？',
    hint: '这决定了每天安排几个点',
    options: [
      { id: 'fast', label: '紧凑打卡', desc: '特种兵式，一天当两天用', icon: Zap, tags: ['fast'] },
      { id: 'balanced', label: '张弛有度', desc: '上午暴走，下午躺平', icon: Scale, tags: ['balanced'] },
      { id: 'slow', label: '慢慢悠悠', desc: '睡到自然醒，一天一个主题', icon: Coffee, tags: ['slow'] },
    ],
  },
  {
    key: 'season',
    question: '你期望在什么季节出行？',
    hint: '不同季节看到的风景和体验完全不同',
    options: [
      { id: 'spring', label: '春', desc: '花季 / 樱花 / 江南烟雨', icon: Trees, tags: ['spring', 'nature'] },
      { id: 'summer', label: '夏', desc: '海岛 / 草原 / 避暑海岛', icon: Sun, tags: ['summer', 'beach'] },
      { id: 'autumn', label: '秋', desc: '红叶 / 收获 / 桂花', icon: Mountain, tags: ['autumn', 'nature'] },
      { id: 'winter', label: '冬', desc: '雪景 / 温泉 / 冰雪', icon: Snowflake, tags: ['winter', 'snow'] },
    ],
  },
]

export const PERSONALITIES: Record<string, { emoji: string; name: string; slogan: string }> = {
  nature: { emoji: '🌿', name: '自然系旅人', slogan: '山川湖海，是你的充电站' },
  culture: { emoji: '🏛️', name: '人文探索家', slogan: '在一砖一瓦里，读懂时间' },
  food: { emoji: '🍜', name: '街头寻味官', slogan: '胃到过的地方，才算去过' },
  city: { emoji: '🚶', name: '城市漫游者', slogan: '最好的风景，藏在街角' },
  relax: { emoji: '🏖️', name: '悠然度假家', slogan: '无所事事，心满意足' },
}

/** 选项 id -> 标签集合，用于城市匹配度计算 */
export const ALL_OPTION_TAGS: Record<string, string[]> = Object.fromEntries(
  QUIZ_QUESTIONS.flatMap((q) => q.options.map((o) => [o.id, o.tags] as const)),
)
