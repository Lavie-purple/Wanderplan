/**
 * WGS-84 → GCJ-02（火星坐标）转换。
 * 高德地图瓦片使用 GCJ-02 投影，POI 坐标为 WGS-84，
 * 显示前需转换以保证标记与街道对齐。境外坐标不偏移，原样返回。
 */
const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x: number, y: number): number {
  let ret =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

export function wgs84togcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat]
  let dlat = transformLat(lng - 105.0, lat - 35.0)
  let dlng = transformLng(lng - 105.0, lat - 35.0)
  const radlat = (lat / 180.0) * PI
  let magic = Math.sin(radlat)
  magic = 1 - EE * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  dlat = (dlat * 180.0) / (((A * (1 - EE)) / (magic * sqrtmagic)) * PI)
  dlng = (dlng * 180.0) / ((A / sqrtmagic) * Math.cos(radlat) * PI)
  return [lng + dlng, lat + dlat]
}

/** 批量转换 [lat, lng] 数组（Leaflet 顺序） */
export function toGcj02(position: [number, number]): [number, number] {
  const [lng, lat] = wgs84togcj02(position[1], position[0])
  return [lat, lng]
}

/** GCJ-02 → WGS-84 近似逆变换（数值迭代两次，误差 <1m），Leaflet 视口坐标转真实坐标用 */
export function toWgs84(position: [number, number]): [number, number] {
  let w: [number, number] = [position[0], position[1]]
  for (let i = 0; i < 2; i++) {
    const [glat, glng] = toGcj02(w)
    w = [w[0] - (glat - position[0]), w[1] - (glng - position[1])]
  }
  return w
}

/** 两点球面距离（km），输入 [lat, lng]（WGS-84） */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[0] - a[0]) * PI) / 180
  const dLng = ((b[1] - a[1]) * PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * PI) / 180) * Math.cos((b[0] * PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** 中国大陆粗略轮廓（[lng, lat] 顶点），用于判断地图中心是否在境内以选择瓦片源 */
const CHINA_POLYGON: [number, number][] = [
  [73.5, 39.5], [74.8, 37.0], [78.0, 35.5], [79.0, 32.0], [85.5, 28.3],
  [92.0, 27.8], [97.5, 28.2], [98.7, 24.5], [97.5, 23.9], [101.7, 21.1],
  [104.5, 22.8], [108.0, 21.5], [109.5, 20.3], [110.5, 21.2], [113.0, 22.0],
  [117.0, 23.5], [120.0, 26.0], [121.5, 28.0], [122.0, 30.5], [120.5, 32.5],
  [119.5, 35.0], [122.5, 37.0], [121.5, 39.0], [124.0, 39.8], [126.5, 41.5],
  [128.0, 42.0], [130.5, 42.5], [134.3, 48.3], [132.0, 50.5], [126.0, 52.5],
  [120.0, 53.5], [117.5, 49.6], [111.0, 45.0], [105.0, 41.8], [97.0, 42.7],
  [90.8, 45.2], [85.5, 47.0], [83.0, 47.2], [82.5, 45.2], [80.2, 43.0],
  [76.0, 40.5],
]

/** 地图中心是否在中国境内（GCJ-02 坐标下偏差可忽略），用于境内/境外瓦片源切换 */
export function isInChina(lat: number, lng: number): boolean {
  let inside = false
  for (let i = 0, j = CHINA_POLYGON.length - 1; i < CHINA_POLYGON.length; j = i++) {
    const [xi, yi] = CHINA_POLYGON[i]
    const [xj, yj] = CHINA_POLYGON[j]
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}
