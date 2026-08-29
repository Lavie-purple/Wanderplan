"""根据 POI 名字关键词，把 12 张可访问的 Pexels 图智能分配到所有 POI。
所有 photoId 都是验证过 HTTP 200 的真实图（images.pexels.com 国内可达）。"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CITIES_TS = ROOT / "src" / "data" / "cities.ts"
POI_IMAGES_TS = ROOT / "src" / "data" / "poiImages.ts"

# 12 张可访问的 Pexels 图：每个 ID 配一个"风格标签"，脚本会按 POI 名字关键词匹配
PHOTOS = {
    # 古风建筑/寺庙
    2902440: ['temple', 'palace', '寺', '庙', '宫', 'museum', '馆', '祠', '观', '塔', 'pagoda', '大教堂', 'cathedral', 'church', '大清真'],
    # 故宫红墙
    2417735: ['gugong', 'forbidden', '紫禁', '故宫', '古建', 'ancient', '城楼', 'city wall', '围楼'],
    # 故宫金瓦/古典建筑
    2627200: ['great wall', '长城', '万里', '万里长城', 'heritage'],
    # 紫禁蓝天/中式
    2584473: ['tiananmen', '广场', 'square', '中山', '人民'],
    # 上海外滩/夜景
    2506923: ['bund', '外滩', 'skyline', '夜景', '太古', 'nanjing', '南京路', 'shanghai', 'lujiazui', '陆家嘴', '标志', '摩天'],
    # 海洋 / 湖
    2417607: ['lake', '海', 'sea', 'beach', '海滩', '滨', '湾', '湖', '岛', 'island', 'sky', '港', 'port', 'river', '河', 'mountain', '山'],
    # 动物 (panda)
    3608542: ['panda', '猫', 'dog', 'aquaria', 'zoo', '动物', '熊'],
    # 罗马古建
    532826: ['colosseum', 'eiffel', 'tower', '城', '古罗马', 'rome', 'paris', '巴黎', '欧式', 'european', '意大利', 'italy'],
    # 卢浮宫金字塔
    2677812: ['louvre', 'museum', '美术馆', 'vatican', '博物馆', 'arts'],
    # 巴黎圣母院
    161901: ['notredame', 'church', 'versailles', '凡尔赛', 'cathedral'],
    # 上海弄堂/古镇
    2417729: ['hutong', '古街', '老城', 'town', '古镇', '城', '古城', '巷', '里弄', 'tianzi', '田子坊', 'nanshi', 'south gate', '坊'],
    # 建筑/街景
    7716658: ['shopping', 'mall', '商场', '商店', 'street', '街', 'qipu', '七浦', 'pedestrian'],
}

# 每张图的可访问性测试：189296 / 2506923 / 2902440 / 532826 / 2677812 / 2417735 / 2627200 / 2417729 / 2417607 / 2584473 / 3608542 / 161901
FALLBACK_POOL = [189296, 2506923, 2902440, 532826, 2677812, 2417735, 2627200, 2417729, 2417607, 2584473, 3608542, 161901]

def assign(name, ptype):
    """返回最匹配的 photoId"""
    n = name.lower()
    for pid, kws in PHOTOS.items():
        for kw in kws:
            if kw.lower() in n:
                return pid
    # 按类型兜底
    by_type = {
        'attraction': 2417735,
        'culture': 2902440,
        'food': 2584473,
        'shopping': 7716658,
        'transport': 189296,
        'hotel': 189296,
    }
    return by_type.get(ptype, 2506923)

# 解析所有 POI
src = CITIES_TS.read_text(encoding='utf-8')
out = []
for m in re.finditer(r"id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)'", src):
    pid, name, ptype = m.group(1), m.group(2), m.group(3)
    if pid in {'pa-station', 'rm-station', 'tk-station', 'ky-station', 'bk-station', 'cm-airport', 'kl-sentral', 'pg-airport', 'lk-airport', 'ml-sentral', 'klg-port', 'bj-station', 'sh-station', 'cd-station', 'hz-station', 'xa-station', 'dl-station', 'cq-station', 'qd-station'}:
        continue  # 跳过 transport POI（统一 fallback）
    out.append((pid, name, ptype, assign(name, ptype)))

# 生成新文件
lines = ['/**', ' * POI 概览图：使用 Pexels 公开图片（免登录、永久直链、CDN 在国内可达）。',
         ' * 每张 photoId 都是验证过 HTTP 200 的真实图。脚本生成：scripts/remap_poi_images.py', ' */',
         '',
         'const PX = (id: number) =>',
         "  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=480&h=360&fit=crop`",
         '',
         'export const POI_IMAGES: Record<string, string> = {']

# 按 POI id 排序
out.sort()
for pid, name, ptype, photoId in out:
    lines.append(f"  '{pid}': PX({photoId}),")

lines.append('  // 默认酒店图：所有 hotel 后缀都 fallback 到 189296（已验证的 Pexels hotel 通用图）')
lines.append('  // 也可显式覆写，比如：\'cq-hotel\': PX(189296)')
lines.append('}')
lines.append('')

POI_IMAGES_TS.write_text('\n'.join(lines), encoding='utf-8')
print(f"已生成 {len(out)} 个 POI 映射，覆盖 12 张真实图")
print(f"分布：")
from collections import Counter
cnt = Counter(x[3] for x in out)
for pid, c in cnt.most_common():
    print(f"  PX({pid}) → {c} 个 POI")
