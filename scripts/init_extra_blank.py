"""为 extraPois.ts 里的 POI 也生成空白占位 JPG。"""
import re
from pathlib import Path
import sys
sys.path.insert(0, '.')
from init_blank_poi_images import WHITE_JPG_1X1

src = Path('src/data/extraPois.ts').read_text(encoding='utf-8')
out = Path('public/images/poi')

# 解析 (poiId, [lat, lng]) 拿 cityId
created = 0
for m in re.finditer(r"id:\s*'((?:cs|heb|xm|sz|dh|zjjs|ls|sy|py|wy|fh|qz|pa|rm|gr|uk|au)[a-z0-9-]+)'", src):
    pid = m.group(1)
    city_id = pid.split('-')[0]
    dest = out / city_id / f'{pid}.jpg'
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        continue
    dest.write_bytes(WHITE_JPG_1X1)
    created += 1

print(f'为 extraPois 创建 {created} 张')
print(f'总目录数: {len(list(out.iterdir()))}')
print(f'总文件数: {len(list(out.glob("**/*.jpg")))}')
