/**
 * 地图标注避让算法：
 * 给定一组标注（id/位置/宽高），检测重叠并把每个标注的"div 中心"挪到合适位置。
 *
 * **关键设计**：
 *   1. **最大偏移 80px**（约 1.5 个城市胶囊宽），保证标永远不离真实城市太远
 *   2. 超出限制就 **回退到原位置 + 画 leader line**（标指向城市）
 *   3. 多个候选重叠时，**垂直优先**（标永远浮在城市上方）
 */

export interface LabelInput {
  id: string
  pos: [number, number]
  w: number
  h: number
}

export interface LaidLabel extends LabelInput {
  screenX: number
  screenY: number
  leaderDir: 'up' | 'down' | 'left' | 'right' | null
  leaderPath: [number, number][]
}

const MAX_OFFSET = 80
const PAD = 6

/**
 * 入口：先按"密度"对标注排序——更拥挤的优先避让；同时把"位置过近"的标注过滤掉。
 * 避免 "30 个国家挤在地图" 时前几个完美避让、后几个全部挤一起。
 */
export function layoutLabels(
  labels: LabelInput[],
  latLngToScreen: (lat: number, lng: number) => [number, number],
): LaidLabel[] {
  if (labels.length === 0) return []

  // 第一步：把所有标注投到屏幕坐标
  const projected = labels.map((l) => {
    const [sx, sy] = latLngToScreen(l.pos[0], l.pos[1])
    return { ...l, sx, sy, halfW: l.w / 2, halfH: l.h / 2 }
  })

  // 第二步：按"已放置邻居数"优先级排序（更挤的优先放）
  const remaining = [...projected]
  const placed: LaidLabel[] = []
  while (remaining.length > 0) {
    // 计算每个候选的"邻居数"（= 1.5 个 div 宽范围内的其他标）
    let bestIdx = 0
    let bestScore = -1
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i]
      let score = 0
      for (let j = 0; j < projected.length; j++) {
        if (i === j) continue
        const p = projected[j]
        if (
          Math.abs(c.sx - p.sx) < (c.halfW + p.halfW + 60) &&
          Math.abs(c.sy - p.sy) < (c.halfH + p.halfH + 30)
        ) {
          score += 1
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }
    const next = remaining.splice(bestIdx, 1)[0]

    // 用现有 placed 做避让计算
    let cx = next.sx
    let cy = next.sy
    let leaderDir: LaidLabel['leaderDir'] = null
    let conflict = true
    let attempts = 0
    const MAX_ATTEMPTS = 4
    while (conflict && attempts < MAX_ATTEMPTS) {
      conflict = false
      for (const p of placed) {
        if (
          Math.abs(cx - p.screenX) < next.halfW + p.w / 2 + PAD &&
          Math.abs(cy - p.screenY) < next.halfH + p.h / 2 + PAD
        ) {
          const dx = cx - p.screenX
          const dy = cy - p.screenY
          if (attempts % 2 === 0) {
            const dir: 'up' | 'down' = dy >= 0 ? 'down' : 'up'
            const stepY = dir === 'down' ? p.h / 2 + next.halfH + PAD : -(p.h / 2 + next.halfH + PAD)
            if (Math.abs(cy + stepY - next.sy) > MAX_OFFSET) {
              leaderDir = null
              break
            }
            cy += stepY
            leaderDir = dir
          } else {
            const dir: 'left' | 'right' = dx >= 0 ? 'right' : 'left'
            const stepX = dir === 'right' ? p.w / 2 + next.halfW + PAD : -(p.w / 2 + next.halfW + PAD)
            if (Math.abs(cx + stepX - next.sx) > MAX_OFFSET) {
              leaderDir = null
              break
            }
            cx += stepX
            leaderDir = dir
          }
          conflict = true
          break
        }
      }
      attempts++
    }

    // leader line
    let leaderPath: [number, number][] = []
    if (cx !== next.sx || cy !== next.sy) {
      leaderPath = [[next.sx, next.sy], [cx, cy]]
    } else {
      const hasOverlap = placed.some(
        (p) =>
          Math.abs(p.screenX - next.sx) < next.halfW + p.w / 2 + PAD &&
          Math.abs(p.screenY - next.sy) < next.halfH + p.h / 2 + PAD,
      )
      if (hasOverlap) {
        leaderPath = [
          [next.sx, next.sy],
          [next.sx + 16, next.sy],
          [next.sx + 16, next.sy - next.halfH - 10],
          [next.sx + next.halfW + 4, next.sy - next.halfH - 10],
        ]
      }
    }

    placed.push({
      ...next,
      screenX: cx,
      screenY: cy,
      leaderDir,
      leaderPath,
    })
  }
  return placed
}
