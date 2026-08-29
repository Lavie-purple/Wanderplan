"""
Harvest 真实景点图：
读 cities.ts 中所有 POI → Bing 图片搜索 → 抓第 1 张到 public/images/poi/{poiId}.jpg
PoiImage 优先读本地 → 失败回退到 Pexels 通用图 → 再失败走 SVG 占位

运行：python scripts/harvest_poi_images.py
跳过已存在的图片。失败时打日志但继续。
"""
import re
import urllib.request
import urllib.parse
import os
import sys
import time
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CITIES_TS = ROOT / "src" / "data" / "cities.ts"
OUT_DIR = ROOT / "public" / "images" / "poi"
OUT_DIR.mkdir(parents=True, exist_ok=True)

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'


def parse_pois():
    src = CITIES_TS.read_text(encoding='utf-8')
    out = []
    cur_country = None
    for line in src.split('\n'):
        m = re.search(r"id:\s*'([^']+)',\s*countryId:\s*'([^']+)'", line)
        if m:
            cur_country = m.group(2)
        m = re.search(r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)'", line)
        if m and cur_country:
            out.append((m.group(1), m.group(2), m.group(3), cur_country))
    return out


def parse_pois_v2():
    """直接扫所有 POI 行（POI 格式: { id: 'xx-name', name: ..., type: ..., ... }）
    同一个 city 块内的所有 POI 共享 countryId（用 'countryId:' 锚定）"""
    src = CITIES_TS.read_text(encoding='utf-8')
    out = []
    # 按 city 块切：每个 city 块以 "\n  {\n    id: '<xx>',\n    countryId:" 开头
    blocks = re.split(r'\n  \{\n    id:\s*\'[a-z]+\',\s*\n    countryId:', src)
    for i, blk in enumerate(blocks):
        if i == 0:
            continue  # 文件头部分
        m_country = re.match(r"\s*'([^']+)'", blk)
        if not m_country:
            continue
        country = m_country.group(1)
        # POI 行
        for m in re.finditer(r"id:\s*'([a-z]+-[a-z0-9-]+)',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)'", blk):
            out.append((m.group(1), m.group(2), m.group(3), country))
    return out


def search_bing(query, region='zh-CN'):
    """Bing 图片搜索，返回第一条 murl 链接"""
    url = 'https://www.bing.com/images/search?q=' + urllib.parse.quote(query) + '&form=HDRSC2&first=1&qft=+filterui:photo-photo'
    if region:
        url += '&mkt=' + region
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  Bing 搜索失败 ({query}): {e}", file=sys.stderr)
        return None
    # murl 字段：Bing 的实际图片直链
    urls = re.findall(r'"murl":"(https?://[^"]+?)"', html)
    if not urls:
        urls = re.findall(r'murl&quot;:&quot;(https?://[^&]+?)&quot;', html)
    if not urls:
        urls = re.findall(r"'(https?://[^\s']+\.(?:jpg|jpeg|png))", html)
    # 过滤太短或明显的占位
    for u in urls:
        if 'bing.net' in u or 'r.bing.com' in u:
            continue
        if len(u) > 30 and any(u.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
            return u
    return urls[0] if urls else None


def fetch_to(url, dest, referer='https://www.bing.com/'):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': UA,
            'Referer': referer,
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        })
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        if len(data) < 4000:
            return False
        # 仅接受图片
        if not data.startswith((b'\xff\xd8', b'\x89PNG', b'GIF8', b'RIFF', b'<?xml')):
            return False
        dest.write_bytes(data)
        return True
    except Exception as e:
        print(f"  下载失败 {url[:60]}: {e}", file=sys.stderr)
        return False


def main():
    pois = parse_pois_v2()
    print(f"找到 {len(pois)} 个 POI")
    hits = 0
    skips = 0
    misses = []
    for i, (pid, name, ptype, country) in enumerate(pois):
        dest = OUT_DIR / f"{pid}.jpg"
        if dest.exists() and dest.stat().st_size > 4000:
            skips += 1
            continue
        # 多种关键词 fallback：先全名+地标，再纯中文名，最后只中文 POI 名
        if country == 'china':
            queries = [f"{name} 真实风景", f"{name}", f"{name} 风景"]
        else:
            queries = [f"{name} {country} landmark photo", f"{name} landmark", f"{name}"]
        success = False
        for q in queries:
            url = search_bing(q)
            if url and fetch_to(url, dest):
                success = True
                break
            time.sleep(0.2)
        if success:
            hits += 1
            print(f"✓ ({dest.stat().st_size//1024}KB)")
        else:
            misses.append(pid)
            print("✗")
        time.sleep(0.4)  # 避免触发限流
    print(f"\n完成：新增 {hits}, 跳过已有 {skips}, 失败 {len(misses)}")
    print(f"失败列表：{misses[:30]}")


if __name__ == '__main__':
    main()
