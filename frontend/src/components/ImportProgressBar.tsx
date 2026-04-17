// frontend/src/components/ImportProgressBar.tsx
import { ImportState } from '../types/github'
import { Loader2, FileCode, Brain, CheckCircle } from 'lucide-react'

interface Props {
  state: ImportState
}

const STEPS = [
  { key: 'cloning', label: '克隆仓库', icon: Loader2 },
  { key: 'parsing', label: '解析代码', icon: FileCode },
  { key: 'indexing', label: '生成向量', icon: Brain },
  { key: 'completed', label: '完成', icon: CheckCircle },
] as const

export default function ImportProgressBar({ state }: Props) {
  const currentStepIndex = state.status === 'completed'
    ? STEPS.length - 1
    : STEPS.findIndex(s => s.key === state.currentStep)

  return (
    <div className="mt-6 space-y-4">
      {/* Step Indicators */}
      <div className="flex items-center justify-between text-sm">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isActive = index <= currentStepIndex
          const isCurrent = index === currentStepIndex

          return (
            <div
              key={step.key}
              className={`flex items-center space-x-2 transition-colors ${
                isActive ? 'text-primary-400' : 'text-gray-600'
              }`}
            >
              <StepIcon className={`h-4 w-4 ${isCurrent ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <p className="text-sm text-gray-400 text-center">
        {state.progress}% 完成
      </p>
    </div>
  )
}
