import { useEffect, useState } from 'react'
import type { Poi } from '../../types'
import { POI_META } from '../../types'
import { useAppStore } from '../../store/useAppStore'

/** 景点配图组件：
 *  - 优先显示本地真实图（public/images/poi/{id}.jpg）
 *  - 本地图不存在 → 走 SVG FallbackArt，并叠加"未能找到相应图片"水印
 *  - 用户可手动配 poi.image 覆盖默认
 */
export function PoiImage({
  poi,
  className = '',
  rounded = 'rounded-xl',
}: {
  poi: Poi
  className?: string
  rounded?: string
}) {
  // 优先级：poi.image > 本地 /images/poi/{id}.jpg > SVG FallbackArt + 缺图水印
  const [localOk, setLocalOk] = useState<boolean | null>(null) // null=检测中, true=有, false=无
  const [userImgOk, setUserImgOk] = useState<boolean>(false)
  const setImagePreviewPoi = useAppStore((s) => s.setImagePreviewPoi)

  // 探测本地图是否存在
  useEffect(() => {
    if (poi.image) return // 用户配了图就不用探测
    let cancelled = false
    const img = new Image()
    img.onload = () => { if (!cancelled) setLocalOk(true) }
    img.onerror = () => { if (!cancelled) setLocalOk(false) }
    // 路径规则：public/images/poi/{cityId}/{poiId}.jpg
    const cityId = poi.id.split('-')[0]
    img.src = `/images/poi/${cityId}/${poi.id}.jpg`
    return () => { cancelled = true }
  }, [poi.id, poi.image])

  // 用户配置的图探测
  useEffect(() => {
    if (!poi.image) return
    const img = new Image()
    img.onload = () => setUserImgOk(true)
    img.onerror = () => setUserImgOk(false)
    img.src = poi.image
  }, [poi.image])

  const useRealImg = poi.image ? userImgOk : (localOk === true)

  return (
    <div
      className={`relative ${rounded} ${className} overflow-hidden`}
      title={poi.name}
      onMouseEnter={() => setImagePreviewPoi(poi)}
      onMouseLeave={() => setImagePreviewPoi(null)}
    >
      {useRealImg ? (
        <img
          src={poi.image ?? `/images/poi/${poi.id.split('-')[0]}/${poi.id}.jpg`}
          alt={poi.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <FallbackArt poi={poi} showMissingWatermark={localOk === false} />
      )}
    </div>
  )
}

/** 离线景点风格图：每张都用 POI 自身信息生成（颜色 + emoji + 名称首字），
 * 看起来像一张"手绘旅行贴纸"，永远不会空白。
 *  - showMissingWatermark=true 时叠加"未能找到相应图片"水印
 */
function FallbackArt({ poi, showMissingWatermark }: { poi: Poi; showMissingWatermark: boolean }) {
  const meta = POI_META[poi.type]
  // 每张图用 POI id 哈希得到一个稳定的角度与图样
  let h = 0
  for (let i = 0; i < poi.id.length; i++) h = (h * 31 + poi.id.charCodeAt(i)) >>> 0
  const angle = h % 360
  const variant = (h >> 8) % 6
  const color1 = meta.color
  const color2 = shiftHue(meta.color, angle)
  const bigChar = (() => {
    const m = poi.name.match(/[\u4e00-\u9fa5]/)
    if (m) return m[0]
    return poi.name.slice(0, 1).toUpperCase()
  })()
  return (
    <div
      className="relative h-full w-full"
      style={{
        background: `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`,
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`g-${poi.id}`} cx="20%" cy="20%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#g-${poi.id})`} />
        {variant === 0 && (
          <>
            <circle cx={20 + (h % 50)} cy="30" r="14" fill="rgba(255,255,255,0.18)" />
            <circle cx="75" cy={30 + ((h >> 4) % 30)} r="9" fill="rgba(255,255,255,0.12)" />
            <path d="M 0 78 L 18 60 L 32 72 L 48 55 L 66 70 L 82 58 L 100 70 L 100 100 L 0 100 Z" fill="rgba(0,0,0,0.12)" />
          </>
        )}
        {variant === 1 && (
          <>
            <path d="M 0 80 Q 25 60 50 75 T 100 70 L 100 100 L 0 100 Z" fill="rgba(0,0,0,0.12)" />
            <circle cx="30" cy="30" r="10" fill="rgba(255,255,255,0.18)" />
            <circle cx="65" cy="40" r="6" fill="rgba(255,255,255,0.18)" />
          </>
        )}
        {variant === 2 && (
          <>
            <rect x="20" y="55" width="14" height="35" fill="rgba(255,255,255,0.18)" />
            <rect x="40" y="45" width="14" height="45" fill="rgba(255,255,255,0.18)" />
            <rect x="60" y="60" width="14" height="30" fill="rgba(255,255,255,0.18)" />
            <path d="M 0 90 L 100 90 L 100 100 L 0 100 Z" fill="rgba(0,0,0,0.12)" />
          </>
        )}
        {variant === 3 && (
          <>
            <path d="M 10 70 L 30 50 L 50 60 L 70 45 L 90 55 L 100 65" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" />
            <circle cx="20" cy="30" r="12" fill="rgba(255,255,255,0.18)" />
          </>
        )}
        {variant === 4 && (
          <>
            <path d="M 0 60 Q 50 50 100 65 L 100 100 L 0 100 Z" fill="rgba(0,0,0,0.10)" />
            <path d="M 0 75 Q 50 70 100 80" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" fill="none" />
            <circle cx="80" cy="20" r="8" fill="rgba(255,255,255,0.25)" />
          </>
        )}
        {variant === 5 && (
          <>
            <rect x="10" y="20" width="80" height="2" fill="rgba(255,255,255,0.3)" />
            <rect x="10" y="35" width="60" height="2" fill="rgba(255,255,255,0.25)" />
            <rect x="10" y="50" width="70" height="2" fill="rgba(255,255,255,0.3)" />
            <rect x="10" y="65" width="50" height="2" fill="rgba(255,255,255,0.25)" />
            <circle cx="50" cy="85" r="10" fill="rgba(255,255,255,0.18)" />
          </>
        )}
      </svg>
      {/* 中央：emoji + 名称首字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl drop-shadow-sm">{meta.emoji}</span>
        <span className="mt-0.5 text-2xl font-serif-sc font-bold text-white/95 drop-shadow">
          {bigChar}
        </span>
        <span className="mt-1 line-clamp-1 max-w-[90%] px-1 text-center text-[10px] font-medium text-white/90 drop-shadow">
          {poi.name}
        </span>
      </div>
      {/* 缺图水印：当本地图探测失败时显示"未能找到相应图片" */}
      {showMissingWatermark && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/40 px-2 py-0.5 backdrop-blur-sm">
          <span className="text-[9px] font-medium text-white/85">📷 未能找到相应图片</span>
        </div>
      )}
      {/* 底部小标：城市 + 类型（仅当没缺图水印时显示） */}
      {!showMissingWatermark && (
        <div className="absolute inset-x-0 bottom-0.5 flex items-center justify-center gap-1 text-[8px] font-medium text-white/75 drop-shadow">
          <span>★{poi.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{meta.label}</span>
        </div>
      )}
    </div>
  )
}

/** 简单色相偏移 */
function shiftHue(hex: string, deg: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const k = deg / 360
  const dr = Math.round(r * (1 - k * 0.3) + 255 * (k * 0.3))
  const dg = Math.round(g * (1 - k * 0.3) + 200 * (k * 0.3))
  const db = Math.round(b * (1 - k * 0.3) + 200 * (k * 0.3))
  return `#${[dr, dg, db].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
