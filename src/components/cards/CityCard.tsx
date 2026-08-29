import { motion } from 'framer-motion'
import { Check, MapPin } from 'lucide-react'
import { CITY_TAG_LABELS } from '../../data/cities'
import { CITY_RANK } from '../../data/countries'
import { SELECTABLE_POI_TYPES } from '../../types'
import type { City } from '../../types'

interface CityCardProps {
  city: City
  selected: boolean
  match: number
  onToggle: () => void
  onHover: () => void
}

export default function CityCard({ city, selected, match, onToggle, onHover }: CityCardProps) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      onMouseEnter={onHover}
      className={`relative flex w-full gap-4 rounded-2xl border p-3 text-left transition-colors ${
        selected
          ? 'border-moss bg-moss-pale/60 shadow-sm'
          : 'border-line bg-white hover:border-moss/40 hover:shadow-sm'
      }`}
    >
      <div
        className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-4xl ${city.gradient}`}
      >
        {city.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-serif-sc text-lg leading-snug">{city.name}</h3>
          <span className="rounded-full border border-line bg-white px-1.5 py-0.5 text-xs text-ink-soft">
            {city.province}
          </span>
          {CITY_RANK[city.id] > 0 && (
            <span
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-extrabold leading-none"
              style={{
                background: CITY_RANK[city.id] === 1
                  ? 'linear-gradient(135deg, #f5a623, #f5cf67)'
                  : 'linear-gradient(135deg, #a4c9a0, #cfe1cb)',
                color: CITY_RANK[city.id] === 1 ? '#5a3b00' : '#1d3a26',
              }}
            >
              TOP{CITY_RANK[city.id]}
            </span>
          )}
          {selected && (
            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss text-white">
              <Check size={12} />
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-sm text-ink-soft">{city.tagline}</p>

        <div className="mt-2 flex flex-wrap gap-1">
          {city.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-apricot-pale px-2 py-0.5 text-xs text-[#b07a4a]"
            >
              {CITY_TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-ink-soft">
          {match > 0 && (
            <span className="font-medium text-moss">匹配度 {match}%</span>
          )}
          <span className="flex items-center gap-0.5">
            <MapPin size={12} />
            {city.pois.filter((p) => SELECTABLE_POI_TYPES.includes(p.type)).length} 个推荐点
          </span>
        </div>
      </div>
    </motion.button>
  )
}
