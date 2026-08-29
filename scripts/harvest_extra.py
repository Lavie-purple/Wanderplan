"""抓 extraPois.ts 中的 POI 图（Bing + 备用关键词）"""
import sys
sys.path.insert(0, '.')
from harvest_poi_images import search_bing, fetch_to
from pathlib import Path
import re
import time

OUT = Path('public/images/poi')
# 读 extraPois.ts 解析 (id, name, type, country 不确定) - 用更宽容的搜索
EXTRA = []
src = Path('src/data/extraPois.ts').read_text(encoding='utf-8')
for m in re.finditer(r"id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)'", src):
    EXTRA.append((m.group(1), m.group(2), m.group(3)))

# country 推测：城市 POI id 前缀映射
COUNTRY = {
    'cs': 'china', 'heb': 'china', 'xm': 'china', 'sz': 'china',
    'dh': 'china', 'zjjs': 'china', 'ls': 'china', 'sy': 'china',
    'py': 'china', 'wy': 'china', 'fh': 'china', 'qz': 'china',
    'pa-': 'france', 'rm-': 'italy', 'tk-': 'japan', 'ky-': 'japan',
}

def guess_country(pid):
    for k, c in COUNTRY.items():
        if pid.startswith(k): return c
    return 'china'

hits = 0
for pid, name, ptype in EXTRA:
    dest = OUT / f"{pid}.jpg"
    if dest.exists() and dest.stat().st_size > 4000:
        continue
    country = guess_country(pid)
    if country == 'china':
        queries = [f"{name} 真实风景", f"{name}", f"{name} 风景"]
    else:
        queries = [f"{name} {country} landmark", f"{name} landmark", f"{name}"]
    success = False
    for q in queries:
        url = search_bing(q)
        if url and fetch_to(url, dest):
            print(f"✓ {pid} '{q}' ({dest.stat().st_size//1024}KB)")
            hits += 1
            success = True
            break
        time.sleep(0.2)
    if not success:
        print(f"✗ {pid}")
    time.sleep(0.4)

print(f"\n补抓 {hits} 张")
