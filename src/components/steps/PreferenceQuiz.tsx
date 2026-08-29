import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, RotateCcw } from 'lucide-react'
import { PERSONALITIES, QUIZ_QUESTIONS } from '../../data/quizOptions'
import { useAppStore } from '../../store/useAppStore'
import PreferenceCard from '../cards/PreferenceCard'

export default function PreferenceQuiz() {
  const preferences = useAppStore((s) => s.preferences)
  const setPreference = useAppStore((s) => s.setPreference)
  const resetPreferences = useAppStore((s) => s.resetPreferences)
  const setStep = useAppStore((s) => s.setStep)

  // 测评已完成时（如从步骤条跳回），直接展示结果页
  // 注意：只检查已有的 3 题（旅行风格/活动/节奏）；season 是新增的可选题，不影响 quizComplete
  const quizComplete =
    preferences.travelStyle != null &&
    preferences.activity != null &&
    preferences.pace != null

  const total = QUIZ_QUESTIONS.length
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showResult, setShowResult] = useState(quizComplete)

  const question = QUIZ_QUESTIONS[index]
  const progress = showResult ? 1 : (index + 1) / total

  const handleSelect = (optionId: string) => {
    setPreference(question.key, optionId)
    const isLast = index === total - 1
    window.setTimeout(() => {
      if (isLast) {
        setShowResult(true)
      } else {
        setDirection(1)
        setIndex((i) => i + 1)
      }
    }, 300)
  }

  const goBack = () => {
    if (showResult) {
      setShowResult(false)
    } else if (index > 0) {
      setDirection(-1)
      setIndex((i) => i - 1)
    }
  }

  const restart = () => {
    resetPreferences()
    setShowResult(false)
    setDirection(-1)
    setIndex(0)
  }

  const personality = PERSONALITIES[preferences.travelStyle ?? 'city']
  const chosenLabels = QUIZ_QUESTIONS.map((q) => {
    const id = preferences[q.key]
    const option = q.options.find((o) => o.id === id)
    return option?.label ?? ''
  }).filter(Boolean)

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 py-6">
      {/* 顶部：步骤说明 + 进度 */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium tracking-wide text-moss">STEP 1 · 偏好测评</p>
          <p className="text-xs text-ink-soft">
            {showResult ? '完成' : `${index + 1} / ${total}`}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-moss"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {showResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="flex flex-1 flex-col items-center justify-center py-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-moss-pale text-5xl"
            >
              {personality.emoji}
            </motion.div>
            <p className="mt-4 text-sm text-ink-soft">你的旅行人格是</p>
            <h2 className="mt-1 font-serif-sc text-3xl">{personality.name}</h2>
            <p className="mt-2 text-ink-soft">{personality.slogan}</p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {chosenLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-line bg-white px-3 py-1 text-sm"
                >
                  {label}
                </span>
              ))}
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(2)}
              className="mt-8 flex items-center gap-2 rounded-full bg-moss px-6 py-3 font-medium text-white shadow-md transition hover:bg-moss-light"
            >
              去挑选目的地
              <ArrowRight size={18} />
            </motion.button>

            <button
              type="button"
              onClick={restart}
              className="mt-4 flex items-center gap-1 text-sm text-ink-soft transition hover:text-ink"
            >
              <RotateCcw size={14} />
              重新测评
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -48 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col"
          >
            <div className="mb-5">
              <h2 className="font-serif-sc text-2xl leading-snug">{question.question}</h2>
              <p className="mt-1.5 text-sm text-ink-soft">💡 {question.hint}</p>
            </div>

            <div className="grid flex-1 content-start gap-3 sm:grid-cols-2">
              {question.options.map((option, i) => (
                <PreferenceCard
                  key={option.id}
                  option={option}
                  index={i}
                  selected={preferences[question.key] === option.id}
                  onSelect={() => handleSelect(option.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部：返回上一题 */}
      {!showResult && index > 0 && (
        <button
          type="button"
          onClick={goBack}
          className="mt-6 flex w-fit items-center gap-1 text-sm text-ink-soft transition hover:text-ink"
        >
          <ChevronLeft size={16} />
          上一题
        </button>
      )}
    </div>
  )
}
