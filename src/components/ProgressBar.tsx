interface ProgressBarProps {
  value: number 
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({ value, label, showLabel = true, size = 'md' }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  const heightClass = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'

  const color =
    clampedValue >= 80
      ? 'bg-green-500'
      : clampedValue >= 50
      ? 'bg-blue-500'
      : clampedValue >= 25
      ? 'bg-amber-500'
      : 'bg-red-500'

  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showLabel && (
            <span className="text-sm font-bold text-gray-700">{clampedValue}%</span>
          )}
        </div>
      )}
      <div className={`w-full ${heightClass} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${heightClass} ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
