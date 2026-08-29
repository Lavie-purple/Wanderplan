"""为热门景点批量插入 ticket 门票字段（按 id 匹配，插在 rating 之后）。
用 write_bytes 避免 Windows 换行翻译破坏 CRLF。"""
import re
from pathlib import Path

TICKETS = {
    # 北京
    'bj-gugong': '旺季¥60 / 淡季¥40（需提前7天预约）',
    'bj-tiantan': '旺季¥15（联票¥34）',
    'bj-jingshan': '¥2',
    'bj-guobo': '免费（需预约）',
    'bj-meishuguan': '免费（需预约）',
    'bj-qianmen': '免费',
    'bj-wangfujing': '免费',
    'bj-sanlitun': '免费',
    'bj-shichahai': '免费',
    'bj-nanluogu': '免费',
    'bj-laoshe': '茶位费 ¥60 起',
    # 西安
    'xa-bingmayong': '¥120（含兵马俑+丽山园）',
    'xa-dayan': '¥40（登塔另收¥30）',
    'xa-zhonglou': '¥30',
    'xa-huiminjie': '免费',
    'xa-shuyuanmen': '免费',
    # 成都
    'cd-panda': '¥55',
    'cd-jinli': '免费',
    'cd-kuanzhai': '免费',
    'cd-renmin': '免费',
    'cd-ifs': '免费（熊猫爬墙外墙）',
    'cd-taikoo': '免费',
    # 杭州
    'hz-xihu': '免费（雷峰塔¥40另收）',
    'hz-lingyin': '飞来峰¥45（灵隐寺香花券¥30）',
    'hz-longjing': '免费',
    'hz-hefang': '免费',
    'hz-grandcanal': '免费（游船另收）',
    # 重庆
    'cq-hongyadong': '免费（需预约）',
    'cq-ciqikou': '免费',
    'cq-jiefangbei': '免费',
    'cq-eling': '免费',
    # 大理
    'dl-erhai': '免费',
    'dl-cangshan': '索道¥100起',
    'dl-gucheng': '免费',
    'dl-xizhou': '免费（严家大院另收）',
    # 青岛
    'qd-zhanqiao': '回澜阁 ¥4',
    'qd-badaguan': '免费（花石楼¥8.5另收）',
    'qd-laoshan': '旺季¥90（含观光车）',
    'qd-beer': '¥60（含品酒）',
    # 上海
    'sh-bund': '免费',
    'sh-yuyuan': '旺季¥40',
    'sh-tianzifang': '免费',
    'sh-xintiandi': '免费',
    'sh-disney': '¥475 起',
    'sh-lujiazui': '上海中心观景台 ¥199',
    # 广州/其他中国
    'xm-gulangyu': '船票¥35 起（核心景点联票¥90）',
    'xm-nanputuo': '免费',
    'sz-zhuozheng': '旺季¥80',
    'sz-hanxishan': '¥20',
    'dh-mogao': '旺季¥238（A类票需预约）',
    'dh-mingsha': '¥110',
    'zjjs-tianmen': '¥278（含索道）',
    'zjjs-zhangjiajie': '¥224（四日票）',
    'ls-potala': '旺季¥200（需预约）',
    'ls-jokhang': '¥85',
    'sy-yalong': '免费（部分湾区另收）',
    'sy-tianya': '¥81',
    'sy-nanshan': '¥108',
    'py-pingyao': '通票¥125（三日有效）',
    'wy-huangcun': '¥145（含索道）',
    'fh-fenghuang': '免费（九景联票¥128）',
    # 日本
    'tk-sensoji': '免费',
    'tk-shibuya': '免费',
    'tk-meiji': '免费',
    'tk-tsukiji': '免费',
    'tk-ginza': '免费',
    'tk-akihabara': '免费',
    'ky-fushimi': '免费',
    'ky-kinkakuji': '¥500',
    'ky-arashiyama': '免费（竹林）',
    'ky-gion': '免费',
    'ky-nijo': '¥800（二之丸御殿）',
    'ky-kiyomizu': '¥400',
    # 泰国
    'bk-palace': '฿500',
    'bk-watrun': '฿200',
    'bk-watpho': '฿300',
    'bk-khaosan': '免费',
    'cm-doisuthep': '฿30',
    'cm-chedi': '฿40',
    'cm-thapae': '免费',
    # 新加坡
    'sg-marina': '免费（外观）',
    'sg-merlion': '免费',
    'sg-gardens': '园区免费（温室联票¥32新）',
    # 欧洲
    'pa-eiffel': '顶层电梯 €29',
    'pa-louvre': '€22（需预约）',
    'pa-notredame': '免费（需预约）',
    'pa-montmartre': '免费',
    'pa-versailles': '€21（ passports €32）',
    'pa-orsay': '€16',
    'rm-colosseum': '€18（需预约）',
    'rm-vatican': '€20（需预约）',
    'rm-trevi': '免费',
    'rm-pantheon': '€5',
    'rm-navona': '免费',
    'rm-spagna': '免费',
    'gr-acropolis': '旺季€20',
    'gr-plaka': '免费',
    'uk-big-ben': '外观免费（登塔需英国居民）',
    'uk-buckingham': '国事厅夏季 £30',
    'uk-britain': '免费（需预约）',
    # 大洋洲
    'au-opera': '外观免费（内部导览 A$43）',
    'au-bondi': '免费',
    # 美洲
    'us-times-square': '免费',
    'us-central-park': '免费',
    'us-statue': '渡轮+基座 ¥24 起',
    'ca-cn-tower': '观景台 A$43 起',
    'mx-teotihuacan': 'MX$85',
    'eg-pyramid': 'E£700（大金字塔内部另收）',
    'eg-sphinx': '含在金字塔景区通票',
    'ma-medina': '免费',
    'za-table': '缆车 R400 往返',
    'br-christ': 'R$98（含接驳火车）',
    'ar-recoleta': '免费',
    'pe-machu-picchu': 'US$45 起（需预约线路）',
}

INSERT = " ticket: '{}',"

for fname in ['src/data/cities.ts', 'src/data/extraPois.ts']:
    p = Path(fname)
    s = p.read_text(encoding='utf-8')
    added = 0
    for pid, ticket in TICKETS.items():
        # 找到该 POI 块（在 id 后第一个 rating: X 后插入，跳过已有 ticket）
        pat = re.compile(
            r"(id:\s*'" + re.escape(pid) + r"',(?:[^}\n]*?)rating:\s*[0-9.]+)(,)",
        )
        m = pat.search(s)
        if not m:
            continue
        # 已有 ticket 则跳过
        tail = s[m.end():m.end() + 60]
        if 'ticket:' in tail:
            continue
        ins = INSERT.format(ticket)
        s = s[:m.end()] + ins + s[m.end():]
        added += 1
    p.write_bytes(s.encode('utf-8'))
    print(f'{fname}: +{added} 条门票')
