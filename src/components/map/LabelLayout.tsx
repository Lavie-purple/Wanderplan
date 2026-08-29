import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'
import { layoutLabels, type LaidLabel } from '../../utils/labelLayout'
import { useAppStore } from '../../store/useAppStore'

export interface LabelDef {
  id: string
  pos: [number, number]  // GCJ-02 坐标
  w: number
  h: number
  color?: string
}

interface Props {
  labels: LabelDef[]
  onLayoutChange: (result: Map<string, { offsetLatLng: [number, number] | null; leaderPath: [number, number][] }>) => void
}

/**
 * 标注防遮挡：计算每个 label 避让后的 latLng 位置。
 * **核心**：返回的不是屏幕像素偏移，而是 **避让后的 latLng 坐标**——
 * 直接传给 <Marker position={...}>，无需再用 iconAnchor 偏移。
 * 解决缩放时 marker 跟 label 错位的根本问题。
 */
export default function LabelLayout({ labels, onLayoutChange }: Props) {
  const map = useMap()
  const [tick, setTick] = useState(0)
  const setLeafletMap = useAppStore((s) => s.setLeafletMap)

  useEffect(() => {
    setLeafletMap(map)
    return () => setLeafletMap(null)
  }, [map, setLeafletMap])

  useEffect(() => {
    const update = () => setTick((t) => t + 1)
    map.on('move zoom resize zoomanim', update)
    return () => {
      map.off('move zoom resize zoomanim', update)
    }
  }, [map])

  const laid: LaidLabel[] = useMemo(() => {
    if (!map) return []
    const project: (lat: number, lng: number) => [number, number] = (lat, lng) => {
      const p = map.latLngToContainerPoint([lat, lng])
      return [p.x, p.y]
    }
    return layoutLabels(labels, project)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, map, tick])

  useEffect(() => {
    const result = new Map<string, { offsetLatLng: [number, number] | null; leaderPath: [number, number][] }>()
    for (const l of laid) {
      // 把"div 中心屏幕位置"反向转成 latLng
      const newLatLng = map.containerPointToLatLng(L.point(l.screenX, l.screenY))
      result.set(l.id, {
        offsetLatLng: [newLatLng.lat, newLatLng.lng],
        leaderPath: l.leaderPath,
      })
    }
    onLayoutChange(result)
  }, [laid, onLayoutChange, map])

  return null
}
