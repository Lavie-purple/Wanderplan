# 图片 Harvest 一次性脚本

把"通用图"换成"真实景点图"。

## 用法

```bash
# 1. 主表（cities.ts）：全量抓，跳过已存在
python scripts/harvest_poi_images.py

# 2. 增量重抓（只抓失败/缺失的 POI）
python scripts/harvest_remaining.py

# 3. 额外库（extraPois.ts）：长沙/哈尔滨/厦门/苏州/敦煌/张家界/拉萨/三亚/平遥/婺源/凤凰/泉州/巴黎/京都 等
python scripts/harvest_extra.py
```

## 行为

- `harvest_poi_images.py` 读 `cities.ts` 解析所有 POI（4 直辖市 / 27 省会 / 19 城市的 ~200 个 POI）
- `harvest_remaining.py` 重抓上次的失败 ID 列表（用多关键词 fallback 提升成功率）
- `harvest_extra.py` 抓 `extraPois.ts` 里的 POI（长沙文和友、莫高窟、张家界、布达拉宫、亚龙湾 等 ~30 个）
- Bing 公开搜索（无 key），抓 murl 直链
- 跳过本地已存在 > 4KB 的图（**增量**）
- 多关键词 fallback：第一次失败换更短的关键词再试
- 仅接受 jpg/png/gif/webp
- 失败时打日志但继续，最终列出失败 ID

## 关键词策略

- 国内 POI： `{name} 真实风景` → `{name}` → `{name} 风景`
- 海外 POI： `{name} {country} landmark` → `{name} landmark` → `{name}`

## 实际产出

- 主表：~210 张（POI 大小 4-500KB，覆盖 200+ 真实景点）
- 增量：~35 张（多关键词 fallback 后）
- 额外：~29 张（extraPois）
- **合计 261 张 / 78MB**（截至最新一次运行）

## 限制

- Bing 在墙内偶发 503/限流：脚本自动 sleep 0.4s/次
- 部分图片可能因为版权/CDN 403 失败（如 gamerSky、cricketbaaji）
- **版权警告**：抓取来源是互联网公网，**商用前请人工审核**：
  - 优先来源：故宫/博物馆官方、Wikipedia、Unsplash、Pexels（明确可商用）
  - 高风险来源：699pic、zhimg、gamersky（OTA/UGC，需授权）
- 长期策略：定期重跑脚本保持图源新鲜

## 失败 ID 重试

```bash
rm -f public/images/poi/{bj-hotel2,sh-tianzifang,...}.jpg
python scripts/harvest_remaining.py
```

## PoiImage 优先级

1. `poi.image` （POI 上显式指定的 URL）
2. 本地 `public/images/poi/{poiId}.jpg`（harvest 抓的）
3. Pexels 远程（`POI_IMAGES` 表）
4. hotel/transport 类型通用图
5. 本地 SVG 占位（永不空白）

**所有失败的图都不会让用户看到空白**：第 5 步保证。
