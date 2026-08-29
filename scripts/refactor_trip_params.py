"""把 TripParams 的 8 张平铺卡片整合为 3 个极简折叠卡片。"""
from pathlib import Path

P = Path('src/components/steps/TripParams.tsx')
s = P.read_text(encoding='utf-8')

# ---------- 1. 提取各段 ----------
def cut(start_marker, end_marker):
    i = s.index(start_marker)
    j = s.index(end_marker, i)
    return s[i:j]

seg_date = cut('          {/* 出发日期 */}', '          {/* 天数 */}')
seg_days = cut('          {/* 天数 */}', '          {/* 天气参考（按所选路线的时间轴展示） */}')
seg_weather = cut('          {/* 天气参考（按所选路线的时间轴展示） */}', '          {/* 行程起点与终点 */}')
seg_endpoints = cut('          {/* 行程起点与终点 */}', '          {/* 游览方向与顺序 + 城际交通（多城时显示） */}')

# 路线+城际交通 的条件块
ROUTE_C = '          {/* 游览方向与顺序 + 城际交通（多城时显示） */}'
PEOPLE_C = '          {/* 出行人数与构成 */}'
seg_route_all = cut(ROUTE_C, PEOPLE_C)

# 在该条件块里拆出 route 卡与 城际交通 卡
transit_p = '<p className="text-sm font-medium">城际交通方式</p>'
tp = seg_route_all.index(transit_p)
tdiv = seg_route_all.rindex('<div className="rounded-2xl border border-line bg-white p-4">', 0, tp)
route_div = seg_route_all[seg_route_all.index('<div className="rounded-2xl border border-line bg-white p-4">'):tdiv].rstrip()
transit_tail = seg_route_all[tdiv:]
close_i = transit_tail.index('            </>')
transit_div = transit_tail[:close_i].rstrip()

cond_open = '{selectedCities.length >= 2 && (\n'
route_block = '          ' + cond_open + '            ' + route_div + '\n          )}\n'
transit_block = '          ' + cond_open + '            ' + transit_div + '\n          )}\n'

seg_people = cut('          {/* 出行人数与构成 */}', '          {/* 住宿偏好 */}')
seg_stay = cut('          {/* 住宿偏好 */}', '          {/* 市内交通偏好 */}')
seg_citytrans = cut('          {/* 市内交通偏好 */}', '          {/* 预算 */}')
seg_budget = cut('          {/* 预算 */}', '          {/* 已选城市回顾 */}')
seg_tail = s[s.index('          {/* 已选城市回顾 */}'):]

# ---------- 2. FoldCard 组件 ----------
foldcard = '''
/** 极简折叠卡片：标题 + 一行当前状态摘要 + 展开内容 */
function FoldCard({
  emoji,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  emoji: string
  title: string
  summary?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3.5 text-left"
      >
        <span className="text-lg">{emoji}</span>
        <span className="shrink-0 text-sm font-medium">{title}</span>
        {summary && (
          <span className="ml-1 truncate text-xs text-ink-soft">{summary}</span>
        )}
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-ink-soft transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="space-y-4 border-t border-dashed border-line p-4">{children}</div>}
    </div>
  )
}

'''

# ---------- 3. 组装新中间段 ----------
head = s[:s.index('          {/* 出发日期 */}')]
head = head.replace('        <div className="mt-6 space-y-5">\n',
                    '        <div className="mt-6 space-y-3">\n', 1)

summary1 = "{`${tripParams.startDate.slice(5)} 出发 · ${tripParams.days} 天 · ${selectedCities.length} 城`}"
summary2 = "{`${TRANSPORT_META[interCityTransport].label} · ${tripParams.cityTransport === 'transit' ? '公交优先' : '打车优先'}`}"
summary3 = "{`${tripParams.travelers} 人 · ${{ economy: '经济', comfort: '舒适', luxury: '豪华' }[tripParams.budget]}`}"

card1 = (
    '          <FoldCard emoji="🧭" title="行程骨架" summary={' + summary1 + '} defaultOpen>\n'
    + seg_date + seg_days + seg_weather + seg_endpoints + route_block
    + '          </FoldCard>\n\n'
)
card2 = (
    '          <FoldCard emoji="🚄" title="交通与节奏" summary={' + summary2 + '}>\n'
    + transit_block + seg_citytrans
    + '          </FoldCard>\n\n'
)
card3 = (
    '          <FoldCard emoji="👥" title="人群与舒适度" summary={' + summary3 + '}>\n'
    + seg_people + seg_stay + seg_budget
    + '          </FoldCard>\n\n'
)

new = head + card1 + card2 + card3 + seg_tail
# 注入 FoldCard 组件定义（放在 export default 之前）
anchor = 'export default function TripParams()'
new = new.replace(anchor, foldcard + anchor, 1)
# 内层小卡片在折叠卡里改用浅底色，减少嵌套感
for seg in (seg_date, seg_days, seg_weather, seg_endpoints, seg_people, seg_stay, seg_citytrans, seg_budget):
    pass  # 类名已在组装文本里，做全局定向替换更安全：
new = new.replace('<div className="space-y-5 rounded-2xl border border-line bg-white p-4">',
                  '<div className="space-y-5">')
P.write_text(new, encoding='utf-8')
print('refactored. inner-card borders stripped for endpoints wrapper only')
