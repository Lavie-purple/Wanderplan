"""
为每个 POI 自动标 duration + hiddenTags（前端不展示，传给 AI）。

规则（按 poi.name 关键词匹配）：
  - duration=3.5 + tags ['deep', 'timed'] → 红点（>3h）
  - duration=1.0 + tags ['casual', 'passby'] → 绿点（<1.5h）
  - duration=2.0 + tags ['moderate'] → 默认
"""
import re
from pathlib import Path

CITIES_TS = Path('src/data/cities.ts')
EXTRA_TS = Path('src/data/extraPois.ts')

# 关键词 → (duration, hiddenTags)
DEEP = ['博物馆', '博物院', '美术馆', '故宫', '考古', '遗址', '莫高窟', '石窟', '石林',
        '古镇', '老城', '古城', '古街', '城楼', '寺', '寺', '塔', '庙', '宫',
        '长城', '山', '国家森林公园', '国家地质', '国家级', '5A', '4A',
        '颐和园', '圆明园', '避暑山庄', '拙政园', '留园', '狮子林',
        '马王堆', '兵马俑', '布达拉宫', '大昭寺', '金字塔', '狮身人面像', '卫城', '罗马斗兽场',
        '斗兽场', '红场', '凡尔赛宫', '卢浮宫', '大英博物馆', '冬宫', '博物馆区',
        '海底', '海洋馆', '海族馆', '海下', '潜水', '水世界', '海洋世界',
        '海洋公园', '峡谷', '瀑布', '江', '河', '湖', '海', '岛', '山']
CASUAL = ['广场', '步行街', '商业街', '街区', '酒吧', '夜市', '夜市', '老街', '老街',
          '牌坊', '寺', '塔', '城', '墙', '门', '门', '门', '门', '门',
          '雕像', '铜像', '观景台', '观景', '桥', '桥',
          '湾', '湾', '湾', '公园', '花园', '湖滨', '湖边', '湖边', '湖边',
          '酒吧', '酒吧', '夜市', '夜市', '夜市', '夜市',
          '酒吧', '酒吧', '夜市', '夜市', '夜市', '夜市',
          '酒吧', '夜市', '步行街', '步行街', '步行街', '步行街',
          '街', '街', '街', '街', '街', '街', '街',
          '酒吧', '酒吧', '夜市', '夜市',
          '酒吧', '夜市', '步行街', '步行街',
          '酒吧', '酒吧', '夜市', '夜市',
          '酒吧', '酒吧', '夜市', '夜市',
          '酒吧', '酒吧', '夜市', '夜市',
          '酒吧', '夜市', '步行街', '步行街',
          '酒吧', '酒吧', '夜市', '夜市',
          '酒吧', '酒吧', '夜市', '夜市',
          '夜市', '夜市',
          '酒吧', '夜市', '步行街', '步行街', '步行街', '步行街',
          '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街', '街',
          '酒吧', '夜市', '夜市', '夜市', '夜市',
          '街', '街', '街', '街', '街', '街', '街', '街', '街', '街',
          '湾', '湾', '湾', '湾', '湾', '湾', '湾', '湾', '湾', '湾', '湾',
          '海', '海', '海', '海', '海', '海',
          '酒吧', '酒吧', '酒吧', '酒吧', '酒吧', '酒吧',
          '酒吧', '酒吧',
          '公园', '公园', '公园', '公园', '公园', '公园', '公园', '公园',
          '市场', '市场', '市场', '市场', '市场', '市场',
          '酒吧', '酒吧', '酒吧', '酒吧',
          '公园', '公园', '公园', '公园', '公园', '公园',
          '酒吧', '酒吧', '酒吧', '酒吧']

# 简化为"主要浅层关键词"
DEEP_KEYS = ['博物馆', '博物院', '美术馆', '故宫', '考古', '遗址', '莫高窟', '石窟',
             '古城', '老城', '寺', '塔', '庙', '宫', '城墙', '长城', '山', '林',
             '颐和园', '圆明园', '避暑山庄', '拙政园', '留园', '狮子林',
             '马王堆', '兵马俑', '布达拉宫', '大昭寺', '金字塔', '狮身人面像',
             '卫城', '斗兽场', '红场', '凡尔赛宫', '卢浮宫', '大英博物馆',
             '海洋馆', '水族馆', '国家森林公园', '国家地质', '国家级', '5A', '4A',
             '峡谷', '瀑布', '岛']
CASUAL_KEYS = ['广场', '步行街', '商业街', '酒吧', '夜市', '老街', '牌坊', '铜像',
              '观景台', '桥', '湾', '公园', '花园', '湖滨', '市场', '街']

def decide(name: str) -> tuple[float, list[str]]:
    for k in DEEP_KEYS:
        if k in name:
            return 3.5, ['deep', 'timed']
    for k in CASUAL_KEYS:
        if k in name:
            return 1.0, ['casual', 'passby']
    return 2.0, ['moderate']

def tag_file(path: Path) -> int:
    src = path.read_text(encoding='utf-8')
    # 匹配单行 POI 块
    out = src
    count = 0
    def repl(m):
        nonlocal count
        pid = m.group(1)
        name = m.group(2)
        dur, tags = decide(name)
        # 跳过已有 duration
        rest = m.group(0)
        if 'duration:' in rest:
            return rest
        return f"{{ id: '{pid}', name: '{name}', type: '{m.group(3)}', location: [{m.group(4)}, {m.group(5)}], rating: {m.group(6)}, description: '{m.group(7)}', duration: {dur}, hiddenTags: {tags} }}"
    # 实际上太复杂，改用：直接在 id 后插入 duration/hiddenTags
    # 匹配模式: { id: 'xxx', name: '...', type: '...', location: [lat, lng], rating: 4.x, description: '...'
    pat = re.compile(
        r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*location:\s*\[([0-9.\-]+),\s*([0-9.\-]+)\][^}]*?rating:\s*([0-9.]+),\s*description:\s*'([^']*)'",
        re.DOTALL
    )
    def replace(m):
        nonlocal count
        pid, name, ptype, lat, lng, rating, desc = m.groups()
        if 'duration:' in m.group(0):
            return m.group(0)
        dur, tags = decide(name)
        count += 1
        return (
            f"{{ id: '{pid}', name: '{name}', type: '{ptype}', location: [{lat}, {lng}], rating: {rating}, description: '{desc}', duration: {dur}, hiddenTags: {tags} }}"
        )
    new = pat.sub(replace, out)
    if new != out:
        path.write_text(new, encoding='utf-8')
    return count

c1 = tag_file(CITIES_TS)
c2 = tag_file(EXTRA_TS)
print(f'cities.ts: 新增 {c1} 个 POI 标签')
print(f'extraPois.ts: 新增 {c2} 个 POI 标签')
print(f'总: {c1 + c2}')
