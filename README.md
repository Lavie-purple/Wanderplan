# 漫游记 WanderPlan

> AI 陪你一步步规划旅行 —— 左侧分步规划、右侧地图实时联动，一键生成含交通/住宿/门票/预算的专属行程。

![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38bdf8) ![Tests](https://img.shields.io/badge/tests-32%20passed-brightgreen)

**在线体验**：https://lavie-purple.github.io/wanderplan/

## ✨ 功能总览

### 四步规划流程
| 步骤 | 说明 |
|---|---|
| 🧋 偏好测评 | 旅行风格 / 活动偏好 / 节奏 / **出行季节** 四道题，生成旅行人格 |
| 📍 选择目的地 | 6 大洲 · 30+ 国家 · 50+ 城市，TOP1/TOP2 热门角标，按城市勾选想去的景点 |
| 🎚 旅行参数 | 三个极简折叠卡片：行程骨架 / 交通与节奏 / 人群与舒适度（全部状态持久化） |
| 🪄 AI 行程 | 自动编排每日行程，支持拖拽微调、锁定、多方案对比与一键导出 |

### 地图联动（Leaflet + 智能瓦片）
- **境内高德 / 境外 CARTO** 自动切换，境外可开启天地图中文标注（Key 仅存本地）
- 城市间**贝塞尔流动弧线**（出发/归途段自动降低亮度），缩放到城市级自动隐藏
- 自适应 LOD：全球视野看国家标注 → 中国视野看重点城市 → 街道级看 POI
- 城市标注**自动避让 + 引线**（leader line），密集区域不再互相遮挡
- 自由探索模式：缩放到街道级，实时查询视野内真实的公园/餐厅/车站（Overpass API，带本地兜底）

### AI 行程亮点
- 🚶 **每日预估数据栏**：步行步数 / 移动耗时（含出站步行系数）/ 强度等级，偏高自动变红提示
- 🥢 **餐饮候补时段**：午/晚餐自动留白并推荐觅食区域，不指定餐厅、保留自由度
- 🚇 **交通方式升级**：`地铁八号线（天坛公园 → 故宫博物院）· 24 分钟 · 含换乘步行 7 分钟`
- 🔒 **手动调整自动锁定**：拖拽/删除/替换过的项目自动打锁，重新生成时弹窗确认保留
- ⏱ **时间轴视图**：早/中/午/晚四段格子，每个 POI 带预估时长标签，横滑吸附
- 🏨 每城 3-4 家备选酒店（经济/舒适/豪华三档），含价格区间，点击在地图上看与当天景点的距离
- 🎫 105 个热门景点门票价格；💰 预算汇总条（住宿 + 城际班次实时估算）
- 🗺 路线优化 A/B/C/**D（TSP 最短路程）**；50+ 条真实城际班次（车次/航班号、耗时、票价）
- 🌧 天气接入（Open-Meteo）：雨天自动优先室内人文点，当天动线按天气染色
- 📋 多方案保存（A/B/C…）/ Markdown 导入导出（含封面图与门票）/ 历史行程开关
- 🌙 暗色模式（暗绿苔藓主题）/ 移动端自适应 / Service Worker 图片缓存

## 🛠 技术栈

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · Zustand 5 · Leaflet · Framer Motion · Vitest（32 个单元测试）

## 🚀 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
npm test         # 运行单元测试
```

## 📷 景点图片

景点配图按以下规则读取（优先级从高到低）：

1. POI 数据里的显式 `image` 字段
2. 本地图：`public/images/poi/{cityId}/{poiId}.jpg`（如 `beijing/bj-gugong.jpg`，建议 480×360）
3. 本地 SVG 占位（含「未能找到相应图片」水印，永不空白）

想补充真实照片？把图片按上面的命名规则放进对应城市文件夹即可，无需改代码。

## 🔑 天地图 Key（可选）

用于境外地图的中文标注。**本仓库不含任何密钥**——部署后打开右上角 `⋯` → 配置，粘贴你的 [天地图 Key](https://console.tianditu.gov.cn/api/key)（仅保存在你自己浏览器的 localStorage）。未配置时境外自动使用英文 CARTO 底图，境内高德不受影响。

## ☁️ 部署

推送到 `main` 分支后，GitHub Actions 自动构建并发布到 Pages（见 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)）。首次使用需在仓库 **Settings → Pages → Source 选 "GitHub Actions"**。

## 📄 License

MIT
