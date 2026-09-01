import { ClipboardList, MapPin, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const STEPS = [
  { step: 1 as const, label: '偏好测评', icon: ClipboardList },
  { step: 2 as const, label: '选择目的地', icon: MapPin },
  { step: 3 as const, label: '旅行参数', icon: SlidersHorizontal },
  { step: 4 as const, label: 'AI 行程', icon: Sparkles },
]

export default function StepIndicator() {
  const currentStep = useAppStore((s) => s.currentStep)
  const quizDone = useAppStore((s) => s.preferences.travelStyle != null)
  const hasCity = useAppStore((s) => s.selectedCityIds.length > 0)
  const hasItinerary = useAppStore((s) => s.itinerary.length > 0)
  const historyEnabled = useAppStore((s) => s.historyEnabled)
  const setStep = useAppStore((s) => s.setStep)

  // 无历史行程时严格按流程锁定
  // 有历史行程时所有步骤都可自由跳转
  const locked = (step: number) => {
    if (historyEnabled) return false
    return (step === 2 && !quizDone) || (step === 3 && !hasCity) || (step === 4 && !hasItinerary)
  }

  return (
    <nav aria-label="规划步骤" className="flex items-center gap-1 rounded-full border border-line bg-cream p-1">
      {STEPS.map(({ step, label, icon: Icon }) => {
        const active = currentStep === step
        const isLocked = locked(step)
        return (
          <button
            key={step}
            type="button"
            disabled={isLocked}
            onClick={() => setStep(step)}
            title={
              isLocked
                ? historyEnabled
                  ? ''
                  : step === 2
                    ? '请先完成偏好测评'
                    : step === 3
                      ? '请先选择目的地'
                      : '请先生成 AI 行程'
                : label
            }
            className={`flex h-8 w-8 items-center justify-center rounded-full p-0 transition-colors sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5 ${
              active
                ? 'bg-moss text-white shadow-sm'
                : isLocked
                  ? 'cursor-not-allowed text-ink-soft/50'
                  : 'text-ink-soft hover:bg-white'
            }`}
          >
            <Icon size={15} />
            <span className="hidden md:inline">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
