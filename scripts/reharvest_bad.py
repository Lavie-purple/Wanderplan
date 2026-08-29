"""重新抓取 Bing 抓错的图（用更精确的关键词）"""
import sys
sys.path.insert(0, '.')
from harvest_poi_images import search_bing, fetch_to
from pathlib import Path
import time

OUT = Path('public/images/poi')

# POI id  →  更精确的搜索关键词（让 Bing 找到真实图）
FIX = {
    'cd-ifs': '成都 IFS 国金中心 大熊猫雕塑',
    'cd-kuanzhai': '成都宽窄巷子 老街',
    'cd-renmin': '成都人民公园 鹤鸣茶社',
    'cd-heming': '成都人民公园 鹤鸣茶社',
    'cd-jinli': '成都锦里古街 灯笼',
    'cd-boshe': '成都 博物馆',
    'cd-kuixing': '成都 魁星楼街',
    'cd-taikoo': '成都 太古里',
    'cd-jianshe': '成都 建设路',
    'cd-panda': '成都大熊猫繁育研究基地 月亮产房',
    'bj-meishuguan': '北京 中国美术馆 建筑',
    'sh-tianzifang': '上海田子坊 石库门',
    'cq-huoguo': '重庆火锅 地道',
    'cq-bayi': '重庆八一好吃街',
    'cq-erchang': '重庆鹅岭二厂 文创',
    'cq-eling': '重庆鹅岭瞰江楼',
    'sh-sihang': '上海四行仓库 抗战纪念馆',
    'sh-dahuchun': '上海 大壶春 生煎',
    'cd-taikoo': '成都远洋太古里',
    'sh-fabundaxue': '上海法租界 武康路',
    'sh-xintiandi': '上海新天地 石库门',
    'hz-hefang': '杭州河坊街',
    'xa-huiminjie': '西安回民街 美食',
}

hits = 0
miss = []
for pid, query in FIX.items():
    dest = OUT / f"{pid}.jpg"
    print(f"{pid} '{query}' ... ", end='', flush=True)
    url = search_bing(query)
    if url and fetch_to(url, dest):
        print(f"✓ ({dest.stat().st_size//1024}KB)")
        hits += 1
    else:
        print("✗")
        miss.append(pid)
    time.sleep(0.4)

print(f"\n补抓 {hits}, 失败 {len(miss)}: {miss}")
