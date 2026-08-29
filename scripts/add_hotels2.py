"""Add 3-tier hotel candidates for cities that don't have a -hotel id yet
(cd / hz / ky / mk). Insert before the city-ending 'station' line."""
import re, sys

p = 'src/data/cities.ts'
s = open(p, 'r', encoding='utf-8').read()

inserts = [
    # (poi_prefix, city_id, items)
    ('cd', 'chengdu', [
        ('cd-hotel', '成都春熙路亚朵酒店', 30.658, 104.082, 4.6, '亚朵中端品牌，竹居阅读空间。', 'comfort'),
        ('cd-hotel2', '熊猫驿站国际青旅', 30.665, 104.072, 4.4, '青旅氛围浓厚，公共区可看熊猫纪录片。', 'economy'),
        ('cd-hotel3', '成都钓鱼台精品酒店', 30.652, 104.075, 4.8, '宽窄巷子旁顶级中式府邸酒店。', 'luxury'),
    ]),
    ('hz', 'hangzhou', [
        ('hz-hotel', '亚朵酒店·西湖店', 30.25, 120.16, 4.6, '步行 8 分钟到断桥。', 'comfort'),
        ('hz-hotel2', '杭州西湖青年旅舍', 30.243, 120.15, 4.3, '灵隐路上的背包客大本营。', 'economy'),
        ('hz-hotel3', '西子湖四季酒店', 30.245, 120.143, 4.9, '直面西湖，金沙龙沙海滩。', 'luxury'),
    ]),
    ('ky', 'kyoto', [
        ('ky-hotel', '祇园町家民宿', 35.003, 135.77, 4.6, '百年町家改造，榻榻米配庭院枯山水。', 'comfort'),
        ('ky-hotel2', 'Piece Hostel Sanjo', 35.008, 135.768, 4.5, '京都河原町现代青旅，4500 日元起。', 'economy'),
        ('ky-hotel3', '京都丽思卡尔顿', 35.012, 135.78, 4.9, '鸭川河畔奢华酒店。', 'luxury'),
    ]),
    ('mk', 'malacca', [
        ('mk-hotel', '河畔精品酒店', 2.1925, 102.248, 4.5, '临河泳池酒店，步行可达鸡场街。', 'comfort'),
        ('mk-hotel2', 'OYO Rooms Malacca', 2.193, 102.249, 4.2, '鸡场街附近经济型。', 'economy'),
        ('mk-hotel3', '马六甲玛丽娜度假村', 2.19, 102.255, 4.8, '海峡清真寺附近奢华度假村。', 'luxury'),
    ]),
]

inserted = 0
for prefix, city_id, items in inserts:
    for hid, name, lat, lng, rating, desc, tier in items:
        if f"id: '{hid}'," in s:
            continue
        # find the city object (id: 'chengdu' or whatever)
        city_pat = re.compile(
            r"(id:\s*'" + re.escape(city_id) + r"',\s*countryId:[^}]*?pois:\s*\[)(.*?)(\n\s*\],\s*\n\s*\},)",
            re.DOTALL,
        )
        m = city_pat.search(s)
        if not m:
            print('NOT FOUND city obj for', city_id, file=sys.stderr)
            continue
        body = m.group(2)
        st_pat = re.compile(
            r"\n\s*\{\s*id:\s*'" + re.escape(prefix) + r"-station'[^}]*\},", re.DOTALL
        )
        st = st_pat.search(body)
        if not st:
            print('NO STATION in', city_id, file=sys.stderr)
            continue
        new_line = (
            "\n      { id: '" + hid + "', name: '" + name + "', type: 'hotel', "
            "location: [" + str(lat) + ", " + str(lng) + "], rating: " + str(rating) +
            ", description: '" + desc + "' },"
        )
        new_body = body[:st.start()] + new_line + body[st.start():]
        s = s[:m.start(2)] + new_body + s[m.end(2):]
        inserted += 1

open(p, 'w', encoding='utf-8').write(s)
print('inserted=' + str(inserted))
