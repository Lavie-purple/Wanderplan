import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MoveDown, Navigation, Settings } from 'lucide-react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import { cities } from '../../data/cities'
import { countries as COUNTRIES_DATA, CITY_RANK } from '../../data/countries'
import { POI_META, POI_TYPE_ORDER, SELECTABLE_POI_TYPES } from '../../types'
import type { City, Poi } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { haversineKm, isInChina, toGcj02, toWgs84 } from '../../utils/coord'
import { fetchFallbackPlaces, fetchRealPlaces } from '../../utils/places'
import LabelLayout from './LabelLayout'
import { PoiImage } from '../poi/PoiImage'
import { resolveEndPoint, resolveRouteOrder } from '../../utils/route'
import { geocodeCityName } from '../../utils/geocode'

/** 附近推荐半径（km） */
const NEARBY_RADIUS_KM = 3

/**
 * 瓦片源智能切换：
 * - 境内：高德（中文标注、国内直连）
 * - 境外 + 已配置天地图 Key：天地图（全球中文标注，Key 免费申请）
 * - 境外 + 未配置：CARTO Voyager（全球覆盖，标注为当地语言）
 */
function SmartTileLayer() {
  const map = useMap()
  const [inChina, setInChina] = useState(true)
  const ttKey = useAppStore((s) => s.tiandituKey)
  const ttEnabled = useAppStore((s) => s.tiandituEnabled)

  useMapEvents({
    moveend: () => {
      const c = map.getCenter()
      setInChina(isInChina(c.lat, c.lng))
    },
  })

  if (inChina) {
    return (
      <TileLayer
        key="amap"
        attribution='&copy; <a href="https://www.amap.com/">高德地图</a>'
        url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
        subdomains={['1', '2', '3', '4']}
      />
    )
  }
  if (ttKey && ttEnabled) {
    // 天地图：矢量底图 + 中文注记 两层叠加
    return (
      <>
        <TileLayer
          key="tdt-vec"
          attribution='&copy; <a href="https://www.tianditu.gov.cn/">天地图</a>'
          url={`https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${ttKey}`}
          subdomains={['0', '1', '2', '3', '4', '5', '6', '7']}
        />
        <TileLayer
          key="tdt-cva"
          url={`https://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${ttKey}`}
          subdomains={['0', '1', '2', '3', '4', '5', '6', '7']}
        />
      </>
    )
  }
  return (
    <TileLayer
      key="carto"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      subdomains={['a', 'b', 'c', 'd']}
    />
  )
}

/** 监听 store 的 fly 目标，驱动地图飞行（坐标转 GCJ-02 对齐高德瓦片） */
function MapController() {
  const fly = useAppStore((s) => s.fly)
  const map = useMap()
  const selectedCityIds = useAppStore((s) => s.selectedCityIds)
  const originCityId = useAppStore((s) => s.originCityId)
  const originCustom = useAppStore((s) => s.originCustom)
  const returnCityId = useAppStore((s) => s.returnCityId)
  const returnCustom = useAppStore((s) => s.returnCustom)
  const arrivalCityId = useAppStore((s) => s.arrivalCityId)
  const arrivalCustom = useAppStore((s) => s.arrivalCustom)
  const departureCityId = useAppStore((s) => s.departureCityId)
  const departureCustom = useAppStore((s) => s.departureCustom)

  useEffect(() => {
    if (fly.key === 0) return
    map.flyTo(toGcj02(fly.center), fly.zoom, { duration: 1.1 })
  }, [fly, map])

  // 当端点/选择变化时，自动 fitBounds 让所有相关端点 + 城市都在视口内
  const lastFitKey = useRef('')
  useEffect(() => {
    const allPts: [number, number][] = []
    const collect = (id: string | null, _custom: string | null) => {
      if (id) {
        const c = cities.find((x) => x.id === id)
        if (c) allPts.push(toGcj02(c.location))
      }
    }
    collect(originCityId, originCustom)
    collect(returnCityId, returnCustom)
    collect(arrivalCityId, arrivalCustom)
    collect(departureCityId, departureCustom)
    for (const id of selectedCityIds) {
      const c = cities.find((x) => x.id === id)
      if (c) allPts.push(toGcj02(c.location))
    }
    if (allPts.length === 0) return
    const key = JSON.stringify(allPts)
    if (key === lastFitKey.current) return
    lastFitKey.current = key
    if (allPts.length === 1) {
      map.flyTo(allPts[0], 11, { duration: 0.6 })
    } else {
      const bounds = L.latLngBounds(allPts.map((p) => L.latLng(p[0], p[1])))
      map.flyToBounds(bounds, { padding: [60, 60], duration: 0.8, maxZoom: 10 })
    }
  }, [originCityId, originCustom, returnCityId, returnCustom, arrivalCityId, arrivalCustom, departureCityId, departureCustom, selectedCityIds, map])

  return null
}

function cityIcon(
  active: boolean,
  selected: boolean,
  pickingNumber = 0,
  orderBadge = 0,
): L.DivIcon {
  const size = active ? 34 : 24
  const bg = selected ? '#5b8c5a' : active ? '#e8a87c' : '#ffffff'
  const border = selected ? '#5b8c5a' : '#d9d5cc'
  const showPin = selected || active
  const inner = pickingNumber > 0 ? String(pickingNumber) : showPin ? '📍' : ''
  const badge =
    pickingNumber > 0 || orderBadge <= 0
      ? ''
      : `<span style="position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;background:#5b8c5a;border:2px solid #fff;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.25)">${orderBadge}</span>`
  return L.divIcon({
    className: 'wanderplan-city-dot',
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid ${border};box-shadow:0 2px 8px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;font-size:${active ? 15 : 11}px;font-weight:700;color:#5b8c5a">${inner}${badge}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],  // 圆心 = marker 位置
  })
}

/** 耗时徽标：🔴 深度耗时（≥3h）/ 🟢 轻松路过（≤1.5h）/ 无 = 中等 */
function durationDot(poi: Poi): string {
  const d = poi.duration ?? 2.0
  if (d >= 3) return '<span style="position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#e5484d;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>'
  if (d <= 1.5) return '<span style="position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#46a758;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>'
  return ''
}

function poiIcon(poi: Poi, active: boolean, nearby: boolean, wanted: boolean): L.DivIcon {
  const meta = POI_META[poi.type]
  if (nearby && !active && !wanted) {
    // 附近推荐：白底彩环小圆点
    const size = 24
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;width:${size}px;height:${size}px"><div style="width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:2.5px solid ${meta.color};box-shadow:0 0 0 4px ${meta.color}33,0 2px 6px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;font-size:11px">${meta.emoji}</div>${durationDot(poi)}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }
  if (wanted && !active) {
    // 用户勾选「想去」：绿色描边圆点 + 小对勾
    const size = 28
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;width:${size}px;height:${size}px"><div style="width:${size}px;height:${size}px;border-radius:50%;background:${meta.color};border:2.5px solid #5b8c5a;box-shadow:0 0 0 4px #5b8c5a33,0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:12px">${meta.emoji}</div><span style="position:absolute;top:-5px;right:-5px;width:13px;height:13px;border-radius:50%;background:#5b8c5a;border:1.5px solid #fff;color:#fff;font-size:8px;line-height:11px;text-align:center">✓</span>${durationDot(poi)}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }
  const size = active ? 32 : 26
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px"><div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${meta.color};box-shadow:0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:13px">${meta.emoji}</span></div>${durationDot(poi)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

function poiPopup(poi: Poi) {
  const meta = POI_META[poi.type]
  return (
    <div className="min-w-[180px]">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <span>{meta.emoji}</span>
        {poi.name}
      </div>
      <div className="mt-1 text-xs text-gray-500">
        <span style={{ color: meta.color }}>{meta.label}</span> · ⭐ {poi.rating.toFixed(1)}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{poi.description}</p>
    </div>
  )
}

/** 距离格式化：<1km 显示米，否则 km */
function formatDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

/** 附近/探索标注：类型实色底 + 白字名称（可选距离徽标 + 想去✓），醒目不融于地图；real=地图实时点位（虚线边） */
function nearbyLabelIcon(poi: Poi, distanceKm?: number, wanted = false, real = false): L.DivIcon {
  const meta = POI_META[poi.type]
  const distText = distanceKm != null ? formatDist(distanceKm) : null
  const nameText = poi.name + (wanted ? ' ✓' : '')
  const w = Math.round(52 + nameText.length * 12.5 + (distText ? distText.length * 6.5 : 0))
  const h = 26
  const border = real ? `2px dashed #fff` : `2px solid #fff`
  return L.divIcon({
    className: '',
    html: `<div style="display:inline-flex;align-items:center;gap:5px;background:${meta.color};border:${border};border-radius:999px;padding:3px 9px 3px 4px;box-shadow:0 3px 10px rgba(0,0,0,.35);white-space:nowrap;${real ? 'opacity:.95;' : ''}"><span style="width:19px;height:19px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0">${meta.emoji}</span><span style="font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.2)">${nameText}</span>${distText ? `<span style="font-size:10.5px;font-weight:600;color:rgba(255,255,255,.95);background:rgba(0,0,0,.22);border-radius:999px;padding:1px 6px">${distText}</span>` : ''}</div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  })
}

/** 附近推荐标注：默认显示名称与距离，悬停弹出详情，点击切换聚焦 */
function NearbyMarker({ poi, distanceKm }: { poi: Poi; distanceKm: number }) {
  const focusPoi = useAppStore((s) => s.focusPoi)
  const ref = useRef<L.Marker>(null)

  return (
    <Marker
      ref={ref}
      position={toGcj02(poi.location)}
      icon={nearbyLabelIcon(poi, distanceKm, wantedPoiIdsHas(poi.id))}
      zIndexOffset={500}
      eventHandlers={{
        mouseover: () => ref.current?.openPopup(),
        mouseout: () => ref.current?.closePopup(),
        click: () => focusPoi(poi),
      }}
    >
      <Popup>{poiPopup(poi)}</Popup>
    </Marker>
  )
}

/** 自由探索标注：悬停/点击弹出详情，不切换聚焦（保持浏览状态） */
function ExploreMarker({ poi, real = false }: { poi: Poi; real?: boolean }) {
  const ref = useRef<L.Marker>(null)

  return (
    <Marker
      ref={ref}
      position={toGcj02(poi.location)}
      icon={nearbyLabelIcon(poi, undefined, wantedPoiIdsHas(poi.id), real)}
      zIndexOffset={real ? 350 : 400}
      eventHandlers={{
        mouseover: () => ref.current?.openPopup(),
        mouseout: () => ref.current?.closePopup(),
        click: () => ref.current?.openPopup(),
      }}
    >
      <Popup>{poiPopup(poi)}</Popup>
    </Marker>
  )
}

/** 读取「想去」集合的辅助（模块级，避免每处订阅 store） */
const wantedPoiIdsHas = (id: string) => useAppStore.getState().wantedPoiIds.includes(id)

/** 弧线段：城市间贝塞尔曲线（航班图风格），相邻段交替弯曲方向 */
function curvedLeg(a: [number, number], b: [number, number], bend: number): [number, number][] {
  const pts: [number, number][] = []
  const mx = (a[1] + b[1]) / 2
  const my = (a[0] + b[0]) / 2
  const dx = b[1] - a[1]
  const dy = b[0] - a[0]
  const len = Math.hypot(dx, dy) || 1
  const cx = mx + (-dy / len) * len * bend
  const cy = my + (dx / len) * len * bend
  const N = 28
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const lng = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cx + u * u * b[1]
    const lat = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cy + u * u * b[0]
    pts.push([lat, lng])
  }
  return pts
}

/** 路线方向指引：深青弧线 + 白色描边 + 金色光点流动；光点大小与流速按城市间距离自适应 */
function AnimatedRoute({ points, dimSegments = new Set<number>() }: { points: [number, number][]; dimSegments?: Set<number> }) {
  const flowRefs = useRef<(L.Polyline | null)[]>([])

  // 每段：弧线点 + 距离自适应参数（光点大小/流速钳制在合理显眼的范围内）
  const legs = useMemo(() => {
    return points.slice(1).map((b, i) => {
      const a = points[i]
      const km = haversineKm(a, b)
      // 距离因子：150km≈0.9，500km≈1.3，1000km+ 封顶 1.7
      const f = Math.min(1.7, Math.max(0.85, 0.75 + km / 800))
      const bend = i % 2 === 0 ? 0.22 : -0.22
      return {
        pts: curvedLeg(a, b, bend),
        f,
        // 距离越远流动越快（循环周期越短），0.9s~2.4s
        dur: Math.min(2.4, Math.max(0.9, 2.6 / f)),
        dim: dimSegments.has(i),
      }
    })
  }, [points, dimSegments])

  // 按段设置流动速度与无缝循环偏移
  useEffect(() => {
    legs.forEach((leg, i) => {
      const el = flowRefs.current[i]?.getElement() as HTMLElement | null
      if (el) {
        el.style.animationDuration = `${(leg.dur * (leg.dim ? 1.4 : 1)).toFixed(2)}s`
        el.style.setProperty('--flow-offset', `${(-16.5 * leg.f).toFixed(1)}`)
      }
    })
  }, [legs])

  return (
    <>
      {legs.map((leg, i) => {
        const dim = leg.dim
        const casingOpacity = dim ? 0.3 : 0.5
        const mainOpacity = dim ? 0.5 : 0.85
        const flowOpacity = dim ? 0.6 : 0.95
        const casingColor = dim ? '#d6d4cf' : '#ffffff'
        const mainColor = dim ? '#8aa4a0' : '#16655c'
        const flowColor = dim ? '#e6c887' : '#ffd166'
        const flowWeight = dim
          ? Math.min(3.5, Math.max(2.2, 2.0 * leg.f))
          : Math.min(4.5, Math.max(2.8, 2.6 * leg.f))
        return (
          <Fragment key={i}>
            {/* 白色描边（提升复杂底图上的对比度） */}
            <Polyline positions={leg.pts} pathOptions={{ color: casingColor, weight: dim ? 4 : 6, opacity: casingOpacity }} />
            {/* 主线：深青 */}
            <Polyline positions={leg.pts} pathOptions={{ color: mainColor, weight: dim ? 2 : 3, opacity: mainOpacity }} />
            {/* 流动光点：金色虚线沿弧线流动（大小随距离自适应） */}
            <Polyline
              ref={(m) => {
                flowRefs.current[i] = m
              }}
              positions={leg.pts}
              pathOptions={{
                color: flowColor,
                weight: flowWeight,
                opacity: flowOpacity,
                dashArray: `${(2.5 * leg.f).toFixed(1)} ${(14 * leg.f).toFixed(1)}`,
                lineCap: 'round',
                className: 'route-flow-anim',
              }}
            />
          </Fragment>
        )
      })}
    </>
  )
}

/** 当天 POI 动线：虚线折线 + 顺序点（区别于城际贝塞尔） */
function DayArcLayer({ items, rainy = false }: { items: Poi[]; rainy?: boolean }) {
  const pts: [number, number][] = items.map((p) => toGcj02(p.location))
  // 雨天动线染蓝色，晴朗用暖橙
  const color = rainy ? '#5b9bd5' : '#e8a87c'
  return (
    <>
      <Polyline
        positions={pts}
        pathOptions={{ color, weight: 4, opacity: 0.9, dashArray: '6 8' }}
      />
      {items.map((p, i) => (
        <Marker
          key={`${p.id}-order`}
          position={toGcj02(p.location)}
          icon={L.divIcon({
            className: '',
            html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800">${i + 1}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
          interactive={false}
        />
      ))}
    </>
  )
}

/** 监听缩放/拖动，回报当前视口（用于自由探索模式） */
function ViewportTracker({ onChange }: { onChange: (v: { zoom: number; bounds: L.LatLngBounds }) => void }) {
  const map = useMap()
  useMapEvents({
    zoomend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds() }),
    moveend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds() }),
  })

  useEffect(() => {
    onChange({ zoom: map.getZoom(), bounds: map.getBounds() })
    // 仅初始化时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}

/**
 * 在地图上画若干 leader line（从城市真实坐标到避让后的标注位置）。
 * 每个 path = [latlng, latlng, latlng]，折线形式引出。
 */
export function LabelLeaders({ paths }: { paths: { id: string; pts: [number, number][]; color?: string }[] }) {
  if (paths.length === 0) return null
  return (
    <>
      {paths.map((p) => (
        <Polyline
          key={p.id}
          positions={p.pts.map((pt) => L.latLng(pt[0], pt[1]))}
          pathOptions={{
            color: p.color ?? '#5b8c5a',
            weight: 1.5,
            opacity: 0.7,
            dashArray: '4 3',
          }}
        />
      ))}
    </>
  )
}
/** 点选/大视野城市标注：序号徽章（白底黑字，仅已排号时）+ 城市 emoji + 城市名，醒目易点 */
function cityPickIcon(city: City, index: number): L.DivIcon {
  const picked = index > 0
  const label = city.name
  const w = Math.round(53 + label.length * 12.5 + (picked ? 36 : 0)) + 8
  const h = 50
  // 注意：iconAnchor 设到 div 底部中心 = (w/2, h)，让 div 整体浮在 marker 上方
  // 不再用 iconAnchor 偏移——避让由 marker.position 决定
  return L.divIcon({
    className: 'wanderplan-city-label',
    html: `<div style="display:inline-flex;align-items:center;gap:6px;background:${picked ? '#5b8c5a' : '#ffffff'};border:2.5px solid #5b8c5a;border-radius:999px;padding:5px 12px 5px 5px;box-shadow:0 4px 12px rgba(0,0,0,0.28);white-space:nowrap;width:${w - 8}px">${picked ? `<span style="width:30px;height:30px;border-radius:50%;background:#fff;color:#1f2937;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${index}</span>` : ''}<span style="width:30px;height:30px;border-radius:50%;background:#edf3ec;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${city.emoji}</span><span style="font-size:13px;font-weight:700;color:${picked ? '#ffffff' : '#16655c'}">${label}</span></div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 4],  // div 底部中心
  })
}

/** 端点标注（落地/离开转场城市）：白底虚线胶囊，与旅游城市区分 */
function endpointLabelIcon(name: string, emoji: string, badge: string): L.DivIcon {
  const w = Math.round(52 + name.length * 13 + badge.length * 10) + 8
  const h = 32
  return L.divIcon({
    className: 'wanderplan-endpoint-label',
    html: `<div style="display:inline-flex;align-items:center;gap:6px;background:#fff;border:2px dashed #5b8c5a;border-radius:999px;padding:4px 10px 4px 4px;box-shadow:0 3px 10px rgba(0,0,0,0.22);white-space:nowrap"><span style="width:24px;height:24px;border-radius:50%;background:#edf3ec;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${emoji}</span><span style="font-size:12.5px;font-weight:700;color:#16655c">${name}</span><span style="font-size:10px;font-weight:600;color:#5b8c5a;background:#edf3ec;border-radius:999px;padding:1px 6px">${badge}</span></div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 4],  // 底部中心
  })
}

/** 国家标注：大视野（zoom<4）时显示，淡灰底色 + 国旗 + 国名 */
function countryLabelIcon(name: string, emoji: string): L.DivIcon {
  const w = 50 + name.length * 12 + 12
  const h = 28
  return L.divIcon({
    className: 'wanderplan-country-label',
    html: `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.85);border:1.5px solid #5b8c5a;border-radius:999px;padding:3px 9px 3px 3px;box-shadow:0 2px 8px rgba(0,0,0,0.18);white-space:nowrap;backdrop-filter:blur(2px)"><span style="width:18px;height:18px;border-radius:50%;background:#edf3ec;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">${emoji}</span><span style="font-size:12px;font-weight:600;color:#16655c">${name}</span></div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],  // 底部中心
  })
}

function CityMarker({
  city,
  selected,
  active,
  orderBadge = 0,
  cityView = true,
  position = null,
}: {
  city: City
  selected: boolean
  active: boolean
  orderBadge?: number
  cityView?: boolean
  /** 避让后位置（[lat, lng]），null = 用真实坐标 */
  position?: [number, number] | null
}) {
  const toggleCity = useAppStore((s) => s.toggleCity)
  const routePicking = useAppStore((s) => s.routePicking)
  const togglePickingCity = useAppStore((s) => s.togglePickingCity)
  const pickingIndex = useAppStore((s) => s.pickingOrder.indexOf(city.id) + 1)

  // 优先用避让后的位置（已是 GCJ 坐标，不再二次转换），否则用真实坐标
  const markerPos = position ?? toGcj02(city.location)

  return (
    <Marker
      position={markerPos}
      icon={
        routePicking
          ? cityPickIcon(city, pickingIndex)
          : cityView
            ? cityIcon(active, selected, 0, orderBadge)
            : cityPickIcon(city, orderBadge)
      }
      zIndexOffset={
        routePicking
          ? pickingIndex > 0
            ? 900
            : 500
          : orderBadge > 0
            ? 650
            : selected
              ? 600
              : 400
      }
      eventHandlers={{ click: () => (routePicking ? togglePickingCity(city.id) : toggleCity(city)) }}
    >
      <Tooltip
        direction="top"
        offset={[0, -26]}
        permanent={routePicking && pickingIndex > 0}
      >
        {routePicking
          ? pickingIndex > 0
            ? `${pickingIndex}. ${city.name}`
            : city.name
          : `${city.name} · ${city.tagline}`}
      </Tooltip>
    </Marker>
  )
}

function PoiMarker({ poi, nearby, wanted }: { poi: Poi; nearby: boolean; wanted: boolean }) {
  const activePoiId = useAppStore((s) => s.activePoiId)
  const focusPoi = useAppStore((s) => s.focusPoi)
  const ref = useRef<L.Marker>(null)
  const active = activePoiId === poi.id

  useEffect(() => {
    if (active) ref.current?.openPopup()
  }, [active])

  return (
    <Marker
      ref={ref}
      position={toGcj02(poi.location)}
      icon={poiIcon(poi, active, nearby, wanted)}
      zIndexOffset={active ? 800 : wanted ? 600 : nearby ? 500 : 300}
      eventHandlers={{ click: () => focusPoi(poi) }}
    >
      <Popup>{poiPopup(poi)}</Popup>
    </Marker>
  )
}

/** 附近内容筛选条：仅对选中景点后的附近标注生效；底部「中文标注」为境外中文标注开关 */
/** 地图瓦片加载骨架：首屏瓦片就绪后淡出 */
function MapLoadingVeil() {
  const map = useMap()
  const [gone, setGone] = useState(false)
  useEffect(() => {
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        window.setTimeout(() => setGone(true), 250)
      }
    }
    map.on('tileload', finish)
    // 兜底：3.5 秒后无论如何都淡出
    const t = window.setTimeout(finish, 3500)
    return () => {
      map.off('tileload', finish)
      window.clearTimeout(t)
    }
  }, [map])
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[900] flex items-center justify-center bg-cream transition-opacity duration-500 ${gone ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="animate-bounce text-3xl">🧭</span>
        <span className="text-xs text-ink-soft">正在铺开地图…</span>
      </div>
    </div>
  )
}

function TypeFilterBar() {
  const visiblePoiTypes = useAppStore((s) => s.visiblePoiTypes)
  const togglePoiType = useAppStore((s) => s.togglePoiType)
  const tiandituEnabled = useAppStore((s) => s.tiandituEnabled)
  const setTiandituEnabled = useAppStore((s) => s.setTiandituEnabled)
  // 手机屏幕小：默认收起筛选条（点 🎯 展开），避免和缩放按钮重叠
  const [filterOpen, setFilterOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640,
  )

  return (
    <div className="absolute right-3 top-3 z-[1000] flex w-9 flex-col items-center gap-1">
      {/* 展开/收起开关 */}
      <button
        type="button"
        onClick={() => setFilterOpen((v) => !v)}
        title={filterOpen ? '收起附近筛选' : '展开附近筛选'}
        className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm shadow-sm backdrop-blur transition ${
          filterOpen
            ? 'border-moss/50 bg-moss text-white'
            : 'border-line bg-white/95 text-ink'
        }`}
      >
        🎯
      </button>
      {!filterOpen && null}
      {filterOpen && POI_TYPE_ORDER.map((type) => {
        const meta = POI_META[type]
        const on = visiblePoiTypes[type]
        const label = type === 'hotel' ? '附近酒店' : `附近${meta.label}`
        return (
          <button
            key={type}
            type="button"
            onClick={() => togglePoiType(type)}
            title={`${label}（点击显示/隐藏）`}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm shadow-sm backdrop-blur transition sm:h-9 sm:w-9 ${
              on
                ? 'border-moss/40 bg-white/95 text-ink'
                : 'border-line bg-white/60 text-ink-soft/50'
            }`}
          >
            <span className={on ? '' : 'opacity-40 grayscale'}>{meta.emoji}</span>
          </button>
        )
      })}

      {/* 境外中文标注开关（更换 Key 请在顶部「配置」中） */}
      {filterOpen && (
      <button
        type="button"
        onClick={() => setTiandituEnabled(!tiandituEnabled)}
        title={
          tiandituEnabled
            ? '境外中文标注：已开启（点击关闭；更换 Key 请在顶部「配置」中）'
            : '境外中文标注：已关闭（点击开启；更换 Key 请在顶部「配置」中）'
        }
        className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm backdrop-blur transition sm:h-9 sm:w-9 ${
          tiandituEnabled
            ? 'border-moss/50 bg-moss text-white'
            : 'border-line bg-white/60 text-ink-soft/60'
        }`}
      >
        <span className={tiandituEnabled ? '' : 'opacity-40 grayscale'}>
          <Settings size={14} />
        </span>
      </button>
      )}

      </div>
  )
}

export default function MapPanel() {
  const [labelOffsets, setLabelOffsets] = useState<Record<string, { offsetLatLng: [number, number] | null }>>({})
  const [leaderPaths, setLeaderPaths] = useState<{ id: string; pts: [number, number][] }[]>([])

  const selectedCityIds = useAppStore((s) => s.selectedCityIds)
  const activeCityId = useAppStore((s) => s.activeCityId)
  const activePoiId = useAppStore((s) => s.activePoiId)
  const visiblePoiTypes = useAppStore((s) => s.visiblePoiTypes)
  const wantedPoiIds = useAppStore((s) => s.wantedPoiIds)
  const currentStep = useAppStore((s) => s.currentStep)
  const resetFocus = useAppStore((s) => s.resetFocus)
  const arrivalCityId = useAppStore((s) => s.arrivalCityId)
  const arrivalCustom = useAppStore((s) => s.arrivalCustom)
  const departureSameAsArrival = useAppStore((s) => s.departureSameAsArrival)
  const departureCityId = useAppStore((s) => s.departureCityId)
  const departureCustom = useAppStore((s) => s.departureCustom)
  const originCityId = useAppStore((s) => s.originCityId)
  const originCustom = useAppStore((s) => s.originCustom)
  const returnCityId = useAppStore((s) => s.returnCityId)
  const returnCustom = useAppStore((s) => s.returnCustom)
  const routeChoice = useAppStore((s) => s.routeChoice)
  const manualOrder = useAppStore((s) => s.manualOrder)

  // 已选中或正在预览的城市，展示其 POI
  const poiCities = useMemo(
    () => cities.filter((c) => selectedCityIds.includes(c.id) || c.id === activeCityId),
    [selectedCityIds, activeCityId],
  )

  // 当前激活的 POI 及其所属城市
  const activePoiInfo = useMemo(() => {
    for (const c of cities) {
      const p = c.pois.find((x) => x.id === activePoiId)
      if (p) return { city: c, poi: p }
    }
    return null
  }, [activePoiId])

  // 附近推荐：同城市内半径内的其它点位（记录距离用于标签展示）
  const nearbyDist = useMemo(() => {
    if (!activePoiInfo) return new Map<string, number>()
    const { poi } = activePoiInfo
    const entries = activePoiInfo.city.pois
      .filter((p) => p.id !== poi.id)
      .map((p) => [p.id, haversineKm(poi.location, p.location)] as const)
      .filter(([, d]) => d <= NEARBY_RADIUS_KM)
    return new Map(entries)
  }, [activePoiInfo])

  // 用户勾选「想去」的点位集合
  const wantedSet = useMemo(() => new Set(wantedPoiIds), [wantedPoiIds])

  // 自由探索：视口跟踪（缩放/拖动后更新）
  const [viewport, setViewport] = useState<{ zoom: number; bounds: L.LatLngBounds } | null>(null)

  /** 城市维度视图：≥12 级才显示景点点位；大视野只显示城市标注 */
  const cityView = (viewport?.zoom ?? 0) >= 12

  /** 自适应 LOD：缩放越小，标注越少
   *  zoom ≥ 6 ：显示所有城市标注
   *  zoom 4-6：只显示 TOP1/TOP2 城市 + 已选城市
   *  zoom < 4：完全不显示城市，改显示国家标注
   */
  const showAllCities = (viewport?.zoom ?? 0) >= 6
  const showImportantCitiesOnly = (viewport?.zoom ?? 0) >= 4 && !showAllCities
  const showCountryLabels = (viewport?.zoom ?? 0) < 4

  /** 探索模式：未选中景点 + 街道级缩放（≥12 级）+ 总开关打开，任意区域实时查询真实点位 */
  const exploreEnabled = useAppStore((s) => s.exploreEnabled)
  const setExploreEnabled = useAppStore((s) => s.setExploreEnabled)
  const exploreMode = activePoiInfo == null && cityView && exploreEnabled

  // 激活的 POI 被移出视野后自动取消，恢复自由探索
  const clearActivePoi = useAppStore((s) => s.clearActivePoi)
  useEffect(() => {
    if (!activePoiInfo || !viewport) return
    if (!viewport.bounds.contains(toGcj02(activePoiInfo.poi.location))) clearActivePoi()
  }, [activePoiInfo, viewport, clearActivePoi])

  const explorePois = useMemo(() => {
    if (!exploreMode || !viewport) return []
    const bounds = viewport.bounds.pad(0.15)
    return poiCities
      .flatMap((city) => city.pois)
      .filter((poi) => visiblePoiTypes[poi.type] && bounds.contains(toGcj02(poi.location)))
  }, [exploreMode, viewport, poiCities, visiblePoiTypes])

  // 自由探索：Overpass 实时点位（公园/餐厅/车站等区域内容，随视口刷新）
  const [realPlaces, setRealPlaces] = useState<Poi[]>([])
  const [realState, setRealState] = useState<'idle' | 'loading' | 'ok' | 'empty' | 'error'>('idle')
  const fetchKeyRef = useRef('')

  useEffect(() => {
    if (!exploreMode || !viewport) return
    const b = viewport.bounds
    // viewport 拿到的是 GCJ-02（瓦片坐标系），送 Overpass 之前反向变换为 WGS-84
    const sw = toWgs84([b.getSouth(), b.getWest()])
    const ne = toWgs84([b.getNorth(), b.getEast()])
    // 用更细颗粒度的 key（3 位小数 ≈ 110m）减少误命中与误跳过
    const key = [sw[0].toFixed(3), sw[1].toFixed(3), ne[0].toFixed(3), ne[1].toFixed(3)].join(',')
    if (key === fetchKeyRef.current) return
    fetchKeyRef.current = key
    let cancelled = false
    setRealState('loading')
    // 加大请求容差：视野较小时也至少覆盖一个合理区域，Overpass 对小 bbox 经常返回 0 结果
    const padLat = Math.max(0.02, (ne[0] - sw[0]) * 0.2)
    const padLng = Math.max(0.02, (ne[1] - sw[1]) * 0.2)
    fetchRealPlaces({
      south: sw[0] - padLat,
      west: sw[1] - padLng,
      north: ne[0] + padLat,
      east: ne[1] + padLng,
    })
      .then((ps) => {
        if (cancelled) return
        setRealPlaces(ps)
        setRealState(ps.length > 0 ? 'ok' : 'empty')
      })
      .catch((err) => {
        if (cancelled) return
        // eslint-disable-next-line no-console
        console.warn('[overpass] failed, use local fallback', err?.message ?? err)
        // 国内网络常无法访问境外 Overpass；用内置城市 POI 库做兜底，至少看到附近的已知地点
        const fb = fetchFallbackPlaces(
          { south: sw[0] - padLat, west: sw[1] - padLng, north: ne[0] + padLat, east: ne[1] + padLng },
          cities,
        )
        if (fb.length > 0) {
          setRealPlaces(fb)
          setRealState('ok')
        } else {
          setRealPlaces([])
          setRealState('error')
        }
        // 失败后允许下次重试
        fetchKeyRef.current = ''
      })
    return () => {
      cancelled = true
    }
  }, [exploreMode, viewport])

  const realInView = useMemo(() => {
    if (!viewport) return []
    const bounds = viewport.bounds.pad(0.15)
    return realPlaces.filter(
      (p) => visiblePoiTypes[p.type] && bounds.contains(toGcj02(p.location)),
    )
  }, [realPlaces, viewport, visiblePoiTypes])

  // 路线点选模式
  const routePicking = useAppStore((s) => s.routePicking)
  const pickingOrder = useAppStore((s) => s.pickingOrder)
  const setRoutePicking = useAppStore((s) => s.setRoutePicking)
  const finishPicking = useAppStore((s) => s.finishPicking)

  // 点选模式涉及的城市集合：已选目的地 + 落地 + 离开
  const pickingCitySet = useMemo(() => {
    const ids = new Set<string>(selectedCityIds)
    if (arrivalCityId) ids.add(arrivalCityId)
    if (!departureSameAsArrival && departureCityId) ids.add(departureCityId)
    return ids
  }, [routePicking, selectedCityIds, arrivalCityId, departureCityId, departureSameAsArrival])

  // 路线方向箭头：仅串联旅游城市（按顺序）；落地/离开端点只作标注
  const tourismChain = useMemo(() => {
    const list = selectedCityIds
      .map((id) => cities.find((c) => c.id === id))
      .filter((c): c is City => c != null)
    const arrivalInTourism = arrivalCityId != null && list.some((c) => c.id === arrivalCityId)
    return resolveRouteOrder(list, arrivalInTourism ? arrivalCityId : null, routeChoice, manualOrder)
  }, [selectedCityIds, arrivalCityId, routeChoice, manualOrder])
  const chainPositions = useMemo(
    () => tourismChain.map((c) => toGcj02(c.location)),
    [tourismChain],
  )
  const showRouteFlow = (currentStep === 3 || currentStep === 4) && !routePicking

  // 鼠标悬停的某天行程：用于地图端高亮当天动线
  const hoveredDay = useAppStore((s) => s.hoveredDay)
  const pinnedDay = useAppStore((s) => s.pinnedDay)
  const arcDay = hoveredDay ?? pinnedDay
  const hoveredDayPlan = useAppStore((s) => (arcDay == null ? null : s.itinerary[arcDay] ?? null))
  const weatherByDate = useAppStore((s) => s.weatherByDate)
  const tripParams = useAppStore((s) => s.tripParams)
  // 悬停那天的天气简报
  const hoveredDayRainy = useMemo(() => {
    if (arcDay == null) return false
    const d = new Date(tripParams.startDate)
    d.setDate(d.getDate() + arcDay)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return weatherByDate[key]?.rainy ?? false
  }, [arcDay, weatherByDate, tripParams.startDate])

  // 行程顺序徽标：自定义顺序（点选/微调）完成后，城市图标上显示序号
  const orderMap = useMemo(() => {
    if (manualOrder == null) return new Map<string, number>()
    const map = new Map<string, number>()
    tourismChain.forEach((c, i) => map.set(c.id, i + 1))
    return map
  }, [manualOrder, tourismChain])

  // 落地/离开端点解析与标注（非旅游城市时显示位置标签）
  const arrivalEp = useMemo(
    () => resolveEndPoint(arrivalCityId, arrivalCustom, cities),
    [arrivalCityId, arrivalCustom],
  )
  const arrivalSeparate =
    arrivalEp != null && !(arrivalCityId != null && selectedCityIds.includes(arrivalCityId))
  const depId = departureSameAsArrival ? arrivalCityId : departureCityId
  const depEp = useMemo(
    () => resolveEndPoint(depId, departureSameAsArrival ? arrivalCustom : departureCustom, cities),
    [depId, departureSameAsArrival, arrivalCustom, departureCustom],
  )
  const depSeparate =
    depEp != null &&
    (departureSameAsArrival
      ? arrivalSeparate
      : !(departureCityId != null && selectedCityIds.includes(departureCityId)))

  // 自定义端点城市：地理编码获取坐标（天地图 Key / Nominatim）
  const tiandituKey = useAppStore((s) => s.tiandituKey)
  const [endpointPos, setEndpointPos] = useState<{
    arrival: [number, number] | null
    departure: [number, number] | null
    origin: [number, number] | null
    returnHome: [number, number] | null
  }>({ arrival: null, departure: null, origin: null, returnHome: null })

  // 出发/归途城市端点（家）
  const originEp = useMemo(
    () => resolveEndPoint(originCityId, originCustom, cities),
    [originCityId, originCustom],
  )
  const returnEp = useMemo(
    () => resolveEndPoint(returnCityId, returnCustom, cities),
    [returnCityId, returnCustom],
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      let arrival: [number, number] | null = null
      let departure: [number, number] | null = null
      let origin: [number, number] | null = null
      let returnHome: [number, number] | null = null
      if (arrivalSeparate && arrivalEp && !arrivalEp.city) {
        arrival = await geocodeCityName(arrivalEp.name, tiandituKey)
      }
      if (depSeparate && depEp && !depEp.city) {
        departure = await geocodeCityName(depEp.name, tiandituKey)
      }
      if (originEp && !originEp.city) {
        origin = await geocodeCityName(originEp.name, tiandituKey)
      }
      if (returnEp && !returnEp.city) {
        returnHome = await geocodeCityName(returnEp.name, tiandituKey)
      }
      if (!cancelled) setEndpointPos({ arrival, departure, origin, returnHome })
    }
    run()
    return () => {
      cancelled = true
    }
  }, [arrivalSeparate, depSeparate, arrivalEp, depEp, originEp, returnEp, tiandituKey])

  // 端点位置（独立计算，供 LabelLayout 防遮挡用）
  const epPos = (
    ep: { name: string; city: City | null } | null,
    geocoded: [number, number] | null,
  ): [number, number] | null => {
    if (!ep) return null
    if (ep.city) return toGcj02(ep.city.location)
    if (geocoded) return toGcj02(geocoded)
    return null
  }
  const originPos = epPos(originEp, endpointPos.origin)
  const retPos = epPos(returnEp, endpointPos.returnHome)

  // 完整动线：出发城市 →（落地转场）→ 首个旅游城市 → … → 末个旅游城市 →（离开转场）→ 归途城市
  const fullFlowChain = (() => {
    const arrivalPos = epPos(arrivalEp, endpointPos.arrival)
    const depPos = epPos(depEp, endpointPos.departure)
    const pts: [number, number][] = []
    if (originPos) pts.push(originPos)
    if (arrivalSeparate && arrivalPos) pts.push(arrivalPos)
    pts.push(...chainPositions)
    if (depSeparate && depPos) pts.push(depPos)
    if (retPos) pts.push(retPos)
    // 落地/离开即旅游城市时与链首相重合，去掉相邻重复点
    return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1])
  })()

  // 哪几段属于"家→首城 / 末城→家"：降低亮度（首尾两端各 1 段）
  const dimSegments = (() => {
    const ids = new Set<number>()
    if (fullFlowChain.length < 2) return ids
    // 段索引 0 = pts[0]→pts[1]
    // 如果有 origin，那段 0 是 origin→arrival
    if (originEp) ids.add(0)
    // 末段
    if (returnEp) ids.add(fullFlowChain.length - 2)
    return ids
  })()

  // 避让输入必须 memo 化：内联数组每次渲染都是新引用，会让 LabelLayout 死循环重算
  const layoutLabels_input = useMemo(() => {
    if (cityView) return []
    return [
      ...(showAllCities
        ? cities.map((c) => ({
            id: c.id,
            pos: toGcj02(c.location),
            w: Math.round(53 + c.name.length * 12.5) + 60,
            h: 50,
          }))
        : showImportantCitiesOnly
          ? cities
              .filter((c) => CITY_RANK[c.id] > 0 || selectedCityIds.includes(c.id))
              .map((c) => ({
                id: c.id,
                pos: toGcj02(c.location),
                w: Math.round(53 + c.name.length * 12.5) + 60,
                h: 50,
              }))
          : []),
      ...(showCountryLabels
        ? COUNTRIES_DATA.slice(0, 18).map((c) => ({
            id: `country-${c.id}`,
            pos: toGcj02(c.view.center),
            w: 100,
            h: 28,
          }))
        : []),
      ...(originPos && !showCountryLabels ? [{ id: '__origin', pos: originPos, w: 110, h: 36 }] : []),
      ...(retPos && !showCountryLabels ? [{ id: '__return', pos: retPos, w: 110, h: 36 }] : []),
    ]
  }, [cityView, showAllCities, showImportantCitiesOnly, showCountryLabels, selectedCityIds, originPos, retPos])

  // 稳定的回调：内容无变化时不 setState，避免渲染循环
  const labelOffsetsRef = useRef('')
  const handleLayoutChange = useCallback(
    (result: Map<string, { offsetLatLng: [number, number] | null; leaderPath: [number, number][] }>) => {
      const off: Record<string, { offsetLatLng: [number, number] | null }> = {}
      const paths: { id: string; pts: [number, number][] }[] = []
      const keys: string[] = []
      for (const [id, v] of result) {
        off[id] = { offsetLatLng: v.offsetLatLng }
        keys.push(`${id}:${v.offsetLatLng?.[0].toFixed(4)},${v.offsetLatLng?.[1].toFixed(4)}`)
        if (v.leaderPath.length >= 2) {
          paths.push({ id, pts: v.leaderPath as [number, number][] })
        }
      }
      const sig = keys.join('|')
      if (sig === labelOffsetsRef.current) return // 无变化，跳出渲染循环
      labelOffsetsRef.current = sig
      setLabelOffsets(off)
      setLeaderPaths(paths)
    },
    [],
  )

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={toGcj02([35.5, 105])}
        zoom={4}
        minZoom={3}
        maxZoom={18}
        zoomControl={false}
        worldCopyJump
        className="h-full w-full"
      >
        {/* 瓦片源智能切换：境内高德 / 境外 CARTO */}
        <MapLoadingVeil />
        <SmartTileLayer />
        <ZoomControl position="bottomright" />
        <MapController />
        <ViewportTracker onChange={setViewport} />

        {/* 标注防遮挡：计算偏移 + leader line */}
        {!cityView && (
          <LabelLayout
            labels={layoutLabels_input}
            onLayoutChange={handleLayoutChange}
          />
        )}

        {/* leader line：Polyline 折线，连接真实坐标 → 标注位置 */}
        {!cityView && leaderPaths.map((lp) => (
          <Polyline
            key={`leader-${lp.id}`}
            positions={lp.pts.map((p) => L.latLng(p[0], p[1]))}
            pathOptions={{ color: '#5b8c5a', weight: 1.5, opacity: 0.7, dashArray: '4 3' }}
          />
        ))}

        {/* 大视野（zoom<4）：显示国家标注，代替城市标注 */}
        {showCountryLabels && COUNTRIES_DATA.map((c) => {
          const off = labelOffsets[`country-${c.id}`]?.offsetLatLng ?? null
          return (
            <Marker
              key={`country-${c.id}`}
              position={off ?? toGcj02(c.view.center)}
              icon={countryLabelIcon(c.name, c.emoji)}
              zIndexOffset={300}
              interactive={false}
            />
          )
        })}

        {/* 大视野：城市标注胶囊（点选模式同款样式，含顺序号）；城市维度：普通圆形图标 */}
        {(routePicking
          ? cities.filter((c) => pickingCitySet.has(c.id))
          : cities
        ).map((city) => {
          // LOD：大视野不显示 / 中视野只显示重要城市
          if (!showAllCities && !showImportantCitiesOnly) return null
          if (showImportantCitiesOnly) {
            const isImportant = CITY_RANK[city.id] > 0 || selectedCityIds.includes(city.id)
            if (!isImportant) return null
          }
          const off = labelOffsets[city.id]?.offsetLatLng ?? null
          return (
            <CityMarker
              key={city.id}
              city={city}
              selected={selectedCityIds.includes(city.id)}
              active={activeCityId === city.id}
              position={off}
              cityView={cityView}
              orderBadge={orderMap.get(city.id) ?? 0}
            />
          )
        })}

        {poiCities.flatMap((city) =>
          city.pois
            // 城市级常驻展示可挑选的点位（不受附近筛选影响）；酒店/交通仅在选择景点后作为附近标注出现
            .filter((poi) => SELECTABLE_POI_TYPES.includes(poi.type))
            // 附近点位改用带名称的标签标注单独渲染，避免重复
            .filter((poi) => !nearbyDist.has(poi.id))
            // 自由探索模式下全部改用带名称的标签标注
            .filter(() => !exploreMode)
            // 路线点选模式下隐藏全部 POI 标记，只留城市图标
            .filter(() => !routePicking)
            // 大视野（非城市维度）下隐藏景点点位，只留城市标注
            .filter(() => cityView)
            .map((poi) => (
              <PoiMarker
                key={poi.id}
                poi={poi}
                nearby={false}
                wanted={wantedSet.has(poi.id)}
              />
            )),
        )}

        {/* 附近推荐标注：图标 + 名称 + 距离，悬停显示详情（点选模式下隐藏） */}
        {activePoiInfo != null &&
          !routePicking &&
          activePoiInfo.city.pois
            .filter((poi) => nearbyDist.has(poi.id) && visiblePoiTypes[poi.type])
            .map((poi) => <NearbyMarker key={poi.id} poi={poi} distanceKm={nearbyDist.get(poi.id) ?? 0} />)}

        {/* 自由探索标注：精选点位（实线） */}
        {exploreMode &&
          !routePicking &&
          explorePois.map((poi) => <ExploreMarker key={poi.id} poi={poi} />)}

        {/* 自由探索标注：地图实时点位（虚线，区域内容） */}
        {exploreMode &&
          !routePicking &&
          realInView.map((poi) => <ExploreMarker key={poi.id} poi={poi} real />)}

        {/* 落地/离开端点标注（非旅游城市时显示位置） */}
        {(() => {
          // 端点位置解析（已知城市 / 自定义地理编码）
          const epPos = (
            ep: { name: string; city: City | null } | null,
            geocoded: [number, number] | null,
          ): [number, number] | null => {
            if (!ep) return null
            if (ep.city) return toGcj02(ep.city.location)
            if (geocoded) return toGcj02(geocoded)
            return null
          }
          const originPos = epPos(originEp, endpointPos.origin)
          const retPos = epPos(returnEp, endpointPos.returnHome)
          const originPosLaid = labelOffsets['__origin']?.offsetLatLng
          const retPosLaid = labelOffsets['__return']?.offsetLatLng

          return (
            <>
              {/* 出发城市标注 - 仅当不在国家级 LOD 时显示 */}
              {originEp && originPos && !showCountryLabels && (
                <Marker
                  position={originPosLaid ?? originPos}
                  icon={endpointLabelIcon(originEp.name, '✈️', '出发')}
                  zIndexOffset={640}
                >
                  <Popup>
                    <div className="text-xs leading-relaxed">
                      <b>✈️ {originEp.name}</b>
                      <br />
                      旅程起点 · 从这里出发前往落地城市
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* 归途城市标注 - 仅当不在国家级 LOD 时显示 */}
              {returnEp && retPos && !showCountryLabels && (
                <Marker
                  position={retPosLaid ?? retPos}
                  icon={endpointLabelIcon(returnEp.name, '🏠', '归途')}
                  zIndexOffset={640}
                >
                  <Popup>
                    <div className="text-xs leading-relaxed">
                      <b>🏠 {returnEp.name}</b>
                      <br />
                      旅程终点 · 最后从这里回家
                    </div>
                  </Popup>
                </Marker>
              )}
            </>
          )
        })()}

        {/* 落地/离开端点标注（非旅游城市时显示位置） */}
        {arrivalSeparate && arrivalEp && (() => {
          const pos = arrivalEp.city
            ? toGcj02(arrivalEp.city.location)
            : endpointPos.arrival
              ? toGcj02(endpointPos.arrival)
              : null
          if (!pos) return null
          if (showCountryLabels) return null
          return (
            <Marker
              position={pos}
              icon={endpointLabelIcon(arrivalEp.name, '🛬', '落地转场')}
              zIndexOffset={650}
            >
              <Popup>
                <div className="text-xs leading-relaxed">
                  <b>🛬 {arrivalEp.name}</b>
                  <br />
                  行程起点 · 落地转场日：当天抵达并前往首城
                </div>
              </Popup>
            </Marker>
          )
        })()}
        {depSeparate && depEp && (() => {
          const pos = depEp.city
            ? toGcj02(depEp.city.location)
            : endpointPos.departure
              ? toGcj02(endpointPos.departure)
              : null
          if (!pos) return null
          if (showCountryLabels) return null
          return (
            <Marker
              position={pos}
              icon={endpointLabelIcon(depEp.name, '🛫', '离开转场')}
              zIndexOffset={650}
            >
              <Popup>
                <div className="text-xs leading-relaxed">
                  <b>🛫 {depEp.name}</b>
                  <br />
                  行程终点 · 离开转场日：当天返程离开
                </div>
              </Popup>
            </Marker>
          )
        })()}

        {/* 路线方向流动弧线（Step 3/4）：城市级缩放（≥12）时隐藏，避免与城市内动线混淆 */}
        {showRouteFlow && !cityView && fullFlowChain.length > 1 && <AnimatedRoute points={fullFlowChain} dimSegments={dimSegments} />}

        {/* 每日动线：悬停某天时高亮当天 POI 连线（实线 + 序号点，区别于城际贝塞尔） */}
        {showRouteFlow && arcDay != null && hoveredDayPlan && hoveredDayPlan.items.length > 1 && (
          <DayArcLayer items={hoveredDayPlan.items} rainy={hoveredDayRainy} />
        )}
      </MapContainer>

      <TypeFilterBar />

      {/* 左侧悬浮 POI 卡 → 地图中央放大展示 */}
      <ImagePreviewOverlay />

      {activePoiInfo != null && (
        <div className="absolute bottom-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-moss/90 px-3 py-1.5 text-xs text-white shadow backdrop-blur">
          <span>📍 已显示「{activePoiInfo.poi.name}」周边 {NEARBY_RADIUS_KM}km 内的推荐 · 悬停标注查看详情</span>
          <button
            type="button"
            onClick={clearActivePoi}
            title="关闭，进入自由探索"
            className="pointer-events-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/40"
          >
            ×
          </button>
        </div>
      )}

      {cityView && (
        <div className="absolute bottom-3 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-moss/90 px-3 py-1.5 text-xs text-white shadow backdrop-blur">
          <span>
            🔍 自由探索
            {exploreMode ? (
              <>
                ：精选 {explorePois.length} 个 · 地图实时{' '}
                {realState === 'loading'
                  ? '加载中…'
                  : realState === 'error'
                    ? '获取失败（稍后重试）'
                    : realState === 'empty'
                      ? '此区域暂无公开点位'
                      : `${realInView.length} 个点位`}{' '}
                · 悬停标注查看详情
              </>
            ) : (
              <>：未开启</>
            )}
          </span>
          <button
            type="button"
            onClick={() => setExploreEnabled(!exploreEnabled)}
            className={[
              'pointer-events-auto relative h-5 w-9 shrink-0 rounded-full transition',
              exploreEnabled ? 'bg-white/30' : 'bg-white/10',
            ].join(' ')}
            title={exploreEnabled ? '关闭自由探索' : '开启自由探索'}
          >
            <span
              className={[
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition',
                exploreEnabled ? 'left-4' : 'left-0.5',
              ].join(' ')}
            />
          </button>
        </div>
      )}

      {/* 路线点选模式 */}
      {routePicking && (
        <div className="absolute left-1/2 top-3 z-[1100] flex -translate-x-1/2 flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 rounded-full bg-ink/90 px-4 py-2 text-xs text-white shadow-lg backdrop-blur">
            <span>🗺️ 依次点击城市标记，确定游览顺序（已选 {pickingOrder.length} 座）</span>
            <button
              type="button"
              onClick={finishPicking}
              className="rounded-full bg-moss px-2.5 py-1 font-medium transition hover:bg-moss-light"
            >
              完成
            </button>
            <button
              type="button"
              onClick={() => setRoutePicking(false)}
              className="rounded-full bg-white/20 px-2.5 py-1 transition hover:bg-white/30"
            >
              取消
            </button>
          </div>
          {pickingOrder.length > 0 && (
            <div className="flex max-w-[90%] flex-wrap items-center justify-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs shadow backdrop-blur">
              {pickingOrder.map((id, i) => {
                const c = cities.find((x) => x.id === id)
                return (
                  <span key={id} className="flex items-center gap-0.5 font-medium text-ink">
                    {i > 0 && <MoveDown size={11} className="rotate-[-90deg] text-apricot" />}
                    {c ? `${c.emoji}${c.name}` : id}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {(selectedCityIds.length > 0 || activeCityId != null) && (
        <button
          type="button"
          onClick={resetFocus}
          className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs text-ink shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Navigation size={12} />
          回到全国
        </button>
      )}
    </div>
  )
}

/**
 * 左侧 POI 卡片悬浮时，地图中央显示该 POI 的放大图（带描述和名称）。
 * 鼠标离开时自动关闭。
 */
function ImagePreviewOverlay() {
  const poi = useAppStore((s) => s.imagePreviewPoi)
  const setImagePreviewPoi = useAppStore((s) => s.setImagePreviewPoi)
  if (!poi) return null
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-[1200] -translate-x-1/2 -translate-y-1/2"
      onMouseEnter={() => setImagePreviewPoi(poi)}
      onMouseLeave={() => setImagePreviewPoi(null)}
    >
      <div className="pointer-events-auto w-[min(420px,92vw)] overflow-hidden rounded-2xl border-2 border-moss bg-white shadow-2xl">
        <PoiImage poi={poi} className="h-56 w-full" rounded="rounded-none" />
        <div className="p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-ink">{poi.name}</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
              style={{ background: POI_META[poi.type].color }}
            >
              {POI_META[poi.type].label}
            </span>
            <span className="ml-auto text-xs text-ink-soft">★ {poi.rating.toFixed(1)}</span>
          </div>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-soft">{poi.description}</p>
        </div>
      </div>
    </div>
  )
}
