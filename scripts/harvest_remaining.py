"""只重抓上次失败的 POI。"""
import sys
sys.path.insert(0, '.')
from harvest_poi_images import parse_pois_v2, search_bing, fetch_to
from pathlib import Path
import time

OUT = Path('public/images/poi')
# 上次失败的 38 个
FAILED = ['bj-hotel2', 'sh-tianzifang', 'sh-sihang', 'sh-dahuchun', 'cd-renmin', 'cd-jinli',
          'cd-chunxi', 'hz-hotel', 'xa-beilin', 'xa-kaiyuan', 'xa-hotel2', 'dl-renmin',
          'cq-huoguo', 'cq-wfc', 'ky-nishiki', 'ky-hotel', 'ky-hotel2', 'ky-station',
          'bk-watrun', 'bk-khaosan', 'bk-asiatique', 'bk-hotel3', 'bk-hotel2', 'cm-doisuthep',
          'cm-hotel', 'kl-hotel3', 'pg-hotel3', 'lk-kuahnight', 'lk-orkid', 'lk-hotel3',
          'ml-hotel', 'klg-hotel', 'pa-versailles', 'pa-cafeflore', 'rm-trevi', 'rm-gelato',
          'rm-spagna', 'tk-ueno']

pois = parse_pois_v2()
all_map = {pid: (n, p, c) for (pid, n, p, c) in pois}
hits = 0
misses = []
for pid in FAILED:
    if pid not in all_map:
        continue
    name, ptype, country = all_map[pid]
    dest = OUT / f"{pid}.jpg"
    # 删除已存在的小文件
    if dest.exists() and dest.stat().st_size < 4000:
        dest.unlink()
    if country == 'china':
        queries = [f"{name} 真实风景", f"{name}", f"{name} 风景", f"{name} 城市"]
    else:
        queries = [f"{name} {country} landmark", f"{name} landmark", f"{name}"]
    success = False
    for q in queries:
        print(f"{pid} '{q}' ... ", end='', flush=True)
        url = search_bing(q)
        if url and fetch_to(url, dest):
            print(f"✓ ({dest.stat().st_size//1024}KB)")
            hits += 1
            success = True
            break
        print("miss", flush=True)
        time.sleep(0.2)
    if not success:
        misses.append(pid)
    time.sleep(0.4)

print(f"\n完成：补抓 {hits}，仍失败 {len(misses)}")
print(f"失败：{misses}")
