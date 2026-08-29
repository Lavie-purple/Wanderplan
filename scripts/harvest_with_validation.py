"""
抓取并验证 POI 真实图：
1. 抓 1 张
2. 计算 md5
3. 与"已知错图库"对比（之前 Bing 抓错的 7+ 张通用祈年殿图都是同一 md5）
4. 如果 md5 在错图库 → 重抓/放弃
5. 否则保存
"""
import sys
import re
import time
import hashlib
sys.path.insert(0, '.')
from harvest_poi_images import search_bing, fetch_to
from pathlib import Path

OUT = Path('public/images/poi')

# 已知错图 md5 库（之前 Bing 返回的"通用图"，比如祈年殿 7 张共用一张）
# 第一次跑先收集黑名单
def get_hash(p):
    return hashlib.md5(p.read_bytes()).hexdigest() if p.exists() else None

# 候选：每个 POI 1-3 个备选关键词（如果第一个失败换第二个）
TARGETS = {
    # 北京
    'bj-gugong': 'Forbidden City Beijing red wall',
    'bj-tiantan': 'Temple of Heaven Hall prayer Beijing',
    'bj-yonghegong': 'Yonghe Temple Beijing',
    'bj-zhijinhua': 'Beijing Summer Palace',
    'bj-fragrant': 'Fragrant Hills Beijing',
    'bj-birdnest': 'Beijing Bird Nest stadium',
    'bj-watercube': 'Beijing Water Cube',
    'bj-zoo': 'Beijing Zoo panda',
    'bj-lama': 'Lama Temple Beijing',
    'bj-wangfujing': 'Wangfujing Street Beijing night',
    'bj-sanlitun': 'Sanlitun Beijing Taikoo Li night',
    # 上海
    'sh-bund': 'The Bund Shanghai night',
    'sh-yuyuan': 'Yuyuan Garden Shanghai',
    'sh-tianzifang': 'Tianzifang Shanghai Shikumen',
    'sh-xintiandi': 'Xintiandi Shanghai',
    'sh-disney': 'Shanghai Disney Resort castle',
    'sh-jingantemple': 'Jing An Temple Shanghai',
    'sh-wukang': 'Wukang Mansion Shanghai',
    'sh-nanjing': 'Nanjing Road Shanghai',
    'sh-lujiazui': 'Lujiazui Shanghai Tower',
    'sh-fabundaxue': 'Fuxing Park Shanghai French',
    # 西安
    'xa-bingmayong': 'Terracotta Army Xi An',
    'xa-dayan': 'Big Wild Goose Pagoda',
    'xa-zhonglou': 'Bell Tower Xi An',
    'xa-huiminjie': 'Muslim Quarter Xi An',
    'xa-citywall': 'Xi An City Wall bike',
    'xa-shuyuanmen': 'Beilin Museum Xi An',
    # 成都
    'cd-panda': 'Chengdu Panda Base',
    'cd-jinli': 'Jinli Street Chengdu lantern',
    'cd-kuanzhai': 'Kuanzhai Alley Chengdu',
    'cd-ifs': 'Chengdu IFS panda sculpture night',
    'cd-taikoo': 'Chengdu Taikoo Li',
    'cd-renmin': 'People Park Chengdu Heming',
    # 杭州
    'hz-xihu': 'West Lake Hangzhou',
    'hz-lingyin': 'Lingyin Temple Hangzhou',
    'hz-longjing': 'Longjing Tea Plantation',
    'hz-hefang': 'Hefang Street Hangzhou',
    'hz-grandcanal': 'Grand Canal Hangzhou',
    # 重庆
    'cq-hongyadong': 'Hongya Cave Chongqing night',
    'cq-ciqikou': 'Ciqikou Ancient Town Chongqing',
    'cq-jiefangbei': 'Jiefangbei Pedestrian Chongqing',
    'cq-eling': 'Eling Park Chongqing',
    'cq-yangtze': 'Yangtze River Cableway Chongqing',
    # 大理
    'dl-erhai': 'Erhai Lake Dali',
    'dl-cangshan': 'Cangshan Mountain Dali',
    'dl-gucheng': 'Dali Old Town',
    'dl-xizhou': 'Xizhou Village Dali',
    # 青岛
    'qd-zhanqiao': 'Zhanqiao Pier Qingdao',
    'qd-badaguan': 'Badaguan Scenic Area',
    'qd-laoshan': 'Laoshan Mountain Qingdao',
    'qd-beer': 'Tsingtao Beer Festival',
    # 厦门
    'xm-gulangyu': 'Gulangyu Island Xiamen',
    'xm-nanputuo': 'Nanputuo Temple Xiamen',
    'xm-zhongshan': 'Zhongshan Road Xiamen',
    # 苏州
    'sz-zhuozheng': 'Humble Administrator Garden Suzhou',
    'sz-hanxishan': 'Hanshan Temple Suzhou',
    'sz-pingjiang': 'Pingjiang Road Suzhou',
    # 哈尔滨
    'heb-zhaolin': 'Zhaolin Park Harbin ice',
    'heb-zhongyang': 'Central Street Harbin',
    'heb-saint': 'Saint Sophia Cathedral Harbin',
    # 拉萨
    'ls-potala': 'Potala Palace Lhasa',
    'ls-jokhang': 'Jokhang Temple Lhasa',
    # 三亚
    'sy-yalong': 'Yalong Bay Sanya',
    'sy-tianya': 'Tianya Haijiao Sanya',
    'sy-nanshan': 'Nanshan Temple Sanya',
    # 平遥
    'py-pingyao': 'Pingyao Ancient City',
    'py-riying': 'Rishengchang Pingyao',
    # 婺源
    'wy-huangcun': 'Huangling Wuyuan rapeseed',
    # 凤凰
    'fh-fenghuang': 'Fenghuang Ancient Town',
    # 东京
    'tk-sensoji': 'Sensō-ji Asakusa Tokyo',
    'tk-shibuya': 'Shibuya Crossing Tokyo night',
    'tk-meiji': 'Meiji Jingu Shrine Tokyo',
    'tk-tsukiji': 'Tsukiji Outer Market Tokyo',
    'tk-ginza': 'Ginza Tokyo shopping',
    'tk-station': 'Tokyo Station red brick',
    'tk-akihabara': 'Akihabara Tokyo electric',
    # 京都
    'ky-fushimi': 'Fushimi Inari torii Kyoto',
    'ky-kinkaku': 'Kinkaku-ji Golden Pavilion',
    'ky-arashiyama': 'Arashiyama bamboo grove Kyoto',
    'ky-gion': 'Gion District Kyoto',
    'ky-nishiki': 'Nishiki Market Kyoto',
    'ky-station': 'Kyoto Station architecture',
    # 曼谷
    'bk-palace': 'Grand Palace Bangkok',
    'bk-watrun': 'Wat Arun Bangkok',
    'bk-khaosan': 'Khao San Road Bangkok',
    'bk-asiatique': 'Asiatique The Riverfront Bangkok',
    'bk-iconsiam': 'ICONSIAM Bangkok',
    'bk-siam': 'Siam Paragon Bangkok',
    'bk-watpho': 'Wat Pho Bangkok',
    # 清迈
    'cm-doisuthep': 'Doi Suthep Temple Chiang Mai',
    'cm-chedi': 'Chedi Luang Chiang Mai',
    'cm-thapae': 'Tha Phae Gate Chiang Mai',
    'cm-sunday': 'Sunday Walking Street Chiang Mai',
    'cm-nimman': 'Nimmanhaemin Road Chiang Mai',
    # 新加坡
    'sg-marina': 'Marina Bay Sands Singapore',
    'sg-merlion': 'Merlion Park Singapore',
    'sg-gardens': 'Gardens by the Bay Singapore',
    'sg-lau': 'Lau Pa Sat Singapore',
    # 巴黎
    'pa-eiffel': 'Eiffel Tower Paris night',
    'pa-louvre': 'Louvre Museum Paris',
    'pa-notredame': 'Notre Dame Cathedral Paris',
    'pa-montmartre': 'Montmartre Sacre Coeur',
    'pa-versailles': 'Palace of Versailles',
    'pa-orsay': 'Musee Orsay Paris',
    # 罗马
    'rm-colosseum': 'Colosseum Rome night',
    'rm-vatican': 'St Peter Basilica Vatican',
    'rm-trevi': 'Trevi Fountain Rome',
    'rm-pantheon': 'Pantheon Rome',
    'rm-navona': 'Piazza Navona Rome',
    'rm-spagna': 'Spanish Steps Rome',
    # 雅典
    'gr-acropolis': 'Acropolis Parthenon Athens',
    'gr-plaka': 'Plaka Athens old town',
    'gr-acropolis-museum': 'Acropolis Museum Athens',
    # 伦敦
    'uk-big-ben': 'Big Ben London',
    'uk-buckingham': 'Buckingham Palace London',
    'uk-britain': 'British Museum London',
    # 悉尼
    'au-opera': 'Sydney Opera House',
    'au-bondi': 'Bondi Beach Sydney',
}

# 已知"通用错图"黑名单
BLACKLIST = set()  # 启动后填充

def is_blacklisted(p):
    return p.exists() and get_hash(p) in BLACKLIST

def harvest_one(pid, queries):
    """抓 1 个 POI；查询列表依次尝试；md5 命中黑名单则放弃"""
    for q in queries:
        # 多关键词 fallback
        for sub_q in [q, q.replace(' ', ' ').title(), f'{q} photo']:
            url = search_bing(sub_q)
            if url:
                tmp = OUT / f'{pid}.tmp.jpg'
                if fetch_to(url, tmp):
                    h = get_hash(tmp)
                    if h in BLACKLIST:
                        tmp.unlink()
                        continue
                    # 合法！保存
                    dest = OUT / f'{pid}.jpg'
                    if dest.exists(): dest.unlink()
                    tmp.rename(dest)
                    return get_hash(dest), dest.stat().st_size
                if tmp.exists(): tmp.unlink()
        time.sleep(0.3)
    return None, 0

# 1. 先扫现有 images，把所有"重复 md5 出现的"加到黑名单
hashes = {}
for f in OUT.glob('*.jpg'):
    h = get_hash(f)
    if h:
        hashes.setdefault(h, []).append(f.name)
for h, files in hashes.items():
    if len(files) > 1:
        BLACKLIST.add(h)
print(f'已加载 {len(BLACKLIST)} 个错图黑名单')

# 2. 抓所有目标
hits = 0
miss = []
for i, (pid, q) in enumerate(TARGETS.items()):
    if (OUT / f'{pid}.jpg').exists():
        hits += 1
        continue
    print(f'[{i+1}/{len(TARGETS)}] {pid} ...', end=' ', flush=True)
    queries = [q] if isinstance(q, str) else q
    h, sz = harvest_one(pid, queries)
    if h:
        print(f'✓ ({sz//1024}KB)')
        hits += 1
    else:
        print('✗')
        miss.append(pid)
    time.sleep(0.4)

print(f'\n完成: {hits}/{len(TARGETS)}, 失败 {len(miss)}')
print(f'失败: {miss[:30]}')
