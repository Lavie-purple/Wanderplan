"""Add 3-tier (luxury / comfort / economy) hotel candidates to every city.
Idempotent: skips if the hotel id already exists."""
import re, sys

p = 'src/data/cities.ts'
s = open(p, 'r', encoding='utf-8').read()

# (city_key, [(new_id, name, lat, lng, rating, desc, tier)])
hotels = [
    ('sh', [
        ('sh-hotel2', '全季酒店·陆家嘴店', 31.236, 121.503, 4.5, '地铁 2 号线直达，性价比首选。', 'comfort'),
        ('sh-hotel3', '上海青年旅舍·外滩店', 31.232, 121.49, 4.3, '步行可达外滩，4 人间床位房 80 元/晚。', 'economy'),
        ('sh-hotel4', '上海外滩瑞吉酒店', 31.237, 121.49, 4.8, '黄浦江畔奢华江景房，外滩地标级。', 'luxury'),
    ]),
    ('cd', [
        ('cd-hotel2', '亚朵酒店·春熙路店', 30.658, 104.082, 4.6, '亚朵中端品牌，竹居阅读空间。', 'comfort'),
        ('cd-hotel3', '熊猫驿站国际青旅', 30.665, 104.072, 4.4, '青旅氛围浓厚，公共区可看熊猫纪录片。', 'economy'),
        ('cd-hotel4', '成都钓鱼台精品酒店', 30.652, 104.075, 4.8, '宽窄巷子旁顶级中式府邸酒店。', 'luxury'),
    ]),
    ('hz', [
        ('hz-hotel2', '亚朵酒店·西湖店', 30.25, 120.16, 4.6, '步行 8 分钟到断桥。', 'comfort'),
        ('hz-hotel3', '杭州西湖青年旅舍', 30.243, 120.15, 4.3, '灵隐路上的背包客大本营。', 'economy'),
        ('hz-hotel4', '西子湖四季酒店', 30.245, 120.143, 4.9, '直面西湖，金沙龙沙海滩。', 'luxury'),
    ]),
    ('xa', [
        ('xa-hotel2', '锦江都城·钟楼店', 34.265, 108.943, 4.5, '钟楼旁地铁 2 号线旁，方便夜游回民街。', 'comfort'),
        ('xa-hotel3', '西安书院门青年旅舍', 34.258, 108.94, 4.4, '老城里小院青旅，氛围满分。', 'economy'),
        ('xa-hotel4', '西安唐华华邑酒店', 34.225, 108.945, 4.8, '唐风建筑庭院酒店，临近大雁塔。', 'luxury'),
    ]),
    ('dl', [
        ('dl-hotel2', '喜林苑·喜洲店', 25.81, 100.135, 4.7, '喜洲白族老宅改造精品酒店。', 'comfort'),
        ('dl-hotel3', '大理古城国际青旅', 25.69, 100.155, 4.4, '屋顶天台可看苍山日落。', 'economy'),
        ('dl-hotel4', '大理海景度假酒店', 25.69, 100.165, 4.8, '洱海一线海景，私家阳台。', 'luxury'),
    ]),
    ('cq', [
        ('cq-hotel2', '亚朵酒店·解放碑店', 29.555, 106.578, 4.6, '步行 3 分钟到洪崖洞。', 'comfort'),
        ('cq-hotel3', '重庆磁器口青年旅舍', 29.581, 106.45, 4.4, '古镇老宅床位房，60 元/晚起。', 'economy'),
        ('cq-hotel4', '重庆解放碑威斯汀酒店', 29.557, 106.575, 4.8, '解放碑核心 5 星，江景房超震撼。', 'luxury'),
    ]),
    ('qd', [
        ('qd-hotel2', '青岛海尔洲际酒店', 36.07, 120.385, 4.8, '奥帆中心一线海景，国际奢华品牌。', 'luxury'),
        ('qd-hotel3', '青岛八大关国际青旅', 36.053, 120.349, 4.4, '老别墅床位房，去海滩步行 5 分钟。', 'economy'),
        ('qd-hotel4', '全季酒店·栈桥店', 36.064, 120.32, 4.5, '地铁 3 号线旁，性价比首选。', 'comfort'),
    ]),
    ('tk', [
        ('tk-hotel2', '东京柏悦酒店 Park Hyatt', 35.685, 139.69, 4.9, '《迷失东京》取景地，新宿公园上。', 'luxury'),
        ('tk-hotel3', 'Khaosan Tokyo Origami', 35.71, 139.79, 4.5, '浅草干净青旅，4 人间 4500 日元/晚。', 'economy'),
        ('tk-hotel4', '全季东京日本桥店', 35.685, 139.78, 4.5, 'JR 总武线旁，地铁 3 分钟。', 'comfort'),
    ]),
    ('ky', [
        ('ky-hotel2', '京都丽思卡尔顿', 35.012, 135.78, 4.9, '鸭川河畔奢华酒店。', 'luxury'),
        ('ky-hotel3', 'Piece Hostel Sanjo', 35.008, 135.768, 4.5, '京都河原町现代青旅，4500 日元起。', 'economy'),
        ('ky-hotel4', '京都蒙特利酒店', 35.005, 135.76, 4.6, 'JR 京都站步行 3 分钟。', 'comfort'),
    ]),
    ('bk', [
        ('bk-hotel2', '曼谷文华东方', 13.726, 100.514, 4.9, '湄南河畔作家酒店，海景套房。', 'luxury'),
        ('bk-hotel3', 'Mad Monkey Hostel Bangkok', 13.756, 100.502, 4.4, '考山路附近热门青旅，500 泰铢/晚。', 'economy'),
        ('bk-hotel4', '宜必思尚品·暹罗店', 13.745, 100.534, 4.5, 'BTS 暹罗站 5 分钟，国际连锁。', 'comfort'),
    ]),
    ('cm', [
        ('cm-hotel2', '清迈四季', 18.78, 98.97, 4.9, '湄登高级度假村，泳池别墅。', 'luxury'),
        ('cm-hotel3', 'Hostel by Bed', 18.79, 98.985, 4.4, '塔佩门步行 3 分钟，床位 250 泰铢。', 'economy'),
        ('cm-hotel4', '清迈易思廷宁曼店', 18.798, 98.97, 4.6, '宁曼路中心，咖啡馆密集。', 'comfort'),
    ]),
    ('kl', [
        ('kl-hotel2', '吉隆坡文华东方', 3.155, 101.711, 4.9, 'KLCC 双子塔旁，公园景房。', 'luxury'),
        ('kl-hotel3', 'Wanderlah Capsule Hotel', 3.142, 101.7, 4.3, '唐人街附近胶囊旅馆，60 RM/晚。', 'economy'),
        ('kl-hotel4', '吉隆坡希尔顿逸林', 3.157, 101.713, 4.6, '双子塔对面，国际连锁。', 'comfort'),
    ]),
    ('pg', [
        ('pg-hotel2', '槟城香格里拉', 5.421, 100.32, 4.8, '海滨度假酒店，泳池看海。', 'luxury'),
        ('pg-hotel3', 'Penang Hostel Cafe', 5.415, 100.337, 4.4, '壁画街附近咖啡主题青旅。', 'economy'),
        ('pg-hotel4', '槟城硬石酒店', 5.43, 100.32, 4.6, '新关仔角海边，摇滚主题。', 'comfort'),
    ]),
    ('lk', [
        ('lk-hotel2', '兰卡威四季度假酒店', 6.305, 99.84, 4.9, '私人沙滩度假村，蜜月首选。', 'luxury'),
        ('lk-hotel3', 'Lantern House Langkawi', 5.945, 99.682, 4.3, '珍南平价民宿，步行到海滩 3 分钟。', 'economy'),
        ('lk-hotel4', '兰卡威湾景酒店', 5.948, 99.685, 4.6, '珍南海滩中段，性价比舒适型。', 'comfort'),
    ]),
    ('mk', [
        ('mk-hotel2', '马六甲玛丽娜度假村', 2.19, 102.255, 4.8, '海峡清真寺附近奢华度假村。', 'luxury'),
        ('mk-hotel3', 'OYO Rooms Malacca', 2.193, 102.249, 4.2, '鸡场街附近经济型。', 'economy'),
        ('mk-hotel4', '马六甲假日酒店', 2.193, 102.255, 4.6, '皇冠广场旁，泳池+行政酒廊。', 'comfort'),
    ]),
    ('klg', [
        ('klg-hotel2', '巴生喜来登', 3.05, 101.46, 4.7, '雪兰莪商务出行首选。', 'luxury'),
        ('klg-hotel3', 'Klang Sentral Hostel', 3.04, 101.45, 4.2, '巴生车站旁经济青旅。', 'economy'),
        ('klg-hotel4', '巴生希尔顿欢朋', 3.045, 101.455, 4.5, '连锁舒适品牌。', 'comfort'),
    ]),
    ('pa', [
        ('pa-hotel2', '巴黎丽兹酒店 Ritz', 48.868, 2.329, 4.9, '旺多姆广场传奇奢华酒店。', 'luxury'),
        ('pa-hotel3', "St Christopher's Inn Gare du Nord", 48.881, 2.355, 4.3, '北站旁经济型青旅，床位 40 欧起。', 'economy'),
        ('pa-hotel4', '巴黎诺富特中央酒店', 48.876, 2.358, 4.5, '北站对面，国际连锁。', 'comfort'),
    ]),
    ('rm', [
        ('rm-hotel2', '罗马威斯汀 Excelsior', 41.905, 12.482, 4.8, '威尼斯广场旁奢华酒店。', 'luxury'),
        ('rm-hotel3', 'The RomeHello', 41.902, 12.5, 4.4, '特米尼车站附近口碑青旅，床位 35 欧。', 'economy'),
        ('rm-hotel4', '罗马巴尔贝里尼希尔顿', 41.904, 12.49, 4.6, '巴贝里尼广场旁，地铁直达。', 'comfort'),
    ]),
]

inserted = 0
skipped = 0
for city_key, items in hotels:
    for hid, name, lat, lng, rating, desc, tier in items:
        if f"id: '{hid}'," in s:
            skipped += 1
            continue
        # find the line for <city_key>-hotel
        pat = re.compile(
            r"(\{\s*id:\s*'" + re.escape(city_key) + r"-hotel'.*?\}\s*,)",
            re.DOTALL,
        )
        m = pat.search(s)
        if not m:
            print('NOT FOUND city', city_key, 'for', hid, file=sys.stderr)
            continue
        new_line = (
            f"\n      {{ id: '{hid}', name: '{name}', type: 'hotel', "
            f"location: [{lat}, {lng}], rating: {rating}, description: '{desc}' }},"
        )
        s = s[:m.end()] + new_line + s[m.end():]
        inserted += 1

open(p, 'w', encoding='utf-8').write(s)
print(f'inserted={inserted} skipped={skipped}')
