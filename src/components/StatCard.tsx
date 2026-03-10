import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: 'green' | 'blue' | 'amber' | 'red'
  subtitle?: string
}

const colorMap = {
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    border: 'border-green-100',
    value: 'text-green-700',
  },
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    border: 'border-blue-100',
    value: 'text-blue-700',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    border: 'border-amber-100',
    value: 'text-amber-700',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    border: 'border-red-100',
    value: 'text-red-700',
  },
}

export function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className={`card p-5 flex items-start gap-4 border ${c.border} ${c.bg}`}>
      <div className={`flex-shrink-0 w-12 h-12 ${c.iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${c.iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${c.value}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
