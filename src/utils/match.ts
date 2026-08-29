import { ALL_OPTION_TAGS, QUIZ_QUESTIONS } from '../data/quizOptions'
import type { City, Preferences } from '../types'

/** 汇总用户所有已选选项携带的标签 */
export function collectTags(prefs: Preferences): string[] {
  const set = new Set<string>()
  for (const q of QUIZ_QUESTIONS) {
    const id = prefs[q.key]
    const tags = id != null ? ALL_OPTION_TAGS[id] : undefined
    tags?.forEach((t) => set.add(t))
  }
  return [...set]
}

/** 城市与偏好的匹配度（0-98），未作答时返回 0 */
export function matchScore(city: City, prefs: Preferences): number {
  const tags = collectTags(prefs)
  if (tags.length === 0) return 0
  const hits = city.tags.filter((t) => tags.includes(t)).length
  return Math.min(98, 62 + hits * 9)
}
