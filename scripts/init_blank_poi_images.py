"""
为所有城市的所有 POI 在 public/images/poi/{cityId}/ 下生成空白占位 JPG。
规则：
  - 目录：public/images/poi/{cityId}/（如 public/images/poi/beijing/）
  - 文件：{poiId}.jpg（如 bj-gugong.jpg）
  - 内容：1×1 纯白 JPG（让 PoiImage 的 Image.onerror 失败逻辑不触发，
          但因这是真实 JPG 会被加载显示为白色；用户后续替换文件即可）
  - 跳过：已经有本地图的 POI（不覆盖）
"""
import re
from pathlib import Path

ROOT = Path('src/data/cities.ts')
OUT = Path('public/images/poi')

# 1×1 纯白 JPG 的字节（最小的有效 JPEG）
WHITE_JPG_1X1 = bytes.fromhex(
    'FFD8FFE000104A46494600010100000100010000FFDB004300080606070605080707'
    '07090908'
    '0A0C140D0C0B0B0C1912130F141D1A1F1E1D1A1C1C20242E2720222C231C1C2837292C30313434341F27393D38323C2E333432FFC2000B080001020101031101FFC4001F0000010501010101010100000000000000000102030405060708090A0BFFC400B5100002010303020403050504040000017D01020300041105122131410612516171427181328191A1082342B1C11552D1F02433627282090A161718191A25262728292A3435363738393A434445464748494A535455565758595A636465666768696A737475767778797A838485868788898A92939495969798999AA2A3A4A5A6A7A8A9AAB2B3B4B5B6B7B8B9BAC2C3C4C5C6C7C8C9CAD2D3D4D5D6D7D8D9DAE1E2E3E4E5E6E7E8E9EAF1F2F3F4F5F6F7F8F9FAFFDA0008010100003F00FB0000'
)

# 解析 cities.ts 拿 (cityId, [poiId, ...])
src = ROOT.read_text(encoding='utf-8')
# 把每个 city 块按 "id: 'xxx',\n    countryId:" 切分
city_blocks = re.split(r"\n  \{\n    id:\s*'([a-z]+)',\s*\n    countryId:\s*'([a-z_]+)'", src)
# 切完后: [head, id1, country1, body1, id2, country2, body2, ...]
total_created = 0
total_skipped = 0
for i in range(1, len(city_blocks), 3):
    city_id = city_blocks[i]
    body = city_blocks[i + 2]
    # 找所有 POI id (形如 'xx-...')
    poi_ids = re.findall(r"\{\s*id:\s*'((?:[a-z]+-)[a-z0-9-]+)'", body)
    if not poi_ids:
        continue
    city_dir = OUT / city_id
    city_dir.mkdir(parents=True, exist_ok=True)
    for pid in poi_ids:
        dest = city_dir / f'{pid}.jpg'
        if dest.exists() and dest.stat().st_size > 0:
            total_skipped += 1
            continue
        dest.write_bytes(WHITE_JPG_1X1)
        total_created += 1

print(f'创建 {total_created} 张空白占位 JPG')
print(f'跳过已存在 {total_skipped} 张')
print(f'输出目录: {OUT.resolve()}')
