import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { QuizOption } from '../../data/quizOptions'

interface PreferenceCardProps {
  option: QuizOption
  selected: boolean
  index: number
  onSelect: () => void
}

export default function PreferenceCard({ option, selected, index, onSelect }: PreferenceCardProps) {
  const Icon = option.icon

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? 'border-moss bg-moss-pale'
          : 'border-line bg-white hover:border-moss/50 hover:shadow-sm'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
          selected ? 'bg-moss text-white' : 'bg-moss-pale text-moss'
        }`}
      >
        <Icon size={22} />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block font-medium">{option.label}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{option.desc}</span>
      </span>
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-moss text-white shadow"
        >
          <Check size={14} />
        </motion.span>
      )}
    </motion.button>
  )
}
