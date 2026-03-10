import { TaskStatus, TaskPriority } from '@/types'

const statusConfig: Record<TaskStatus, { label: string; classes: string }> = {
  pending:     { label: 'Pending',     classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  'in-progress': { label: 'In Progress', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed:   { label: 'Completed',   classes: 'bg-green-100 text-green-700 border-green-200' },
  overdue:     { label: 'Overdue',     classes: 'bg-red-100 text-red-700 border-red-200' },
}

const priorityConfig: Record<TaskPriority, { label: string; classes: string }> = {
  low:    { label: 'Low',    classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Medium', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high:   { label: 'High',   classes: 'bg-orange-100 text-orange-700 border-orange-200' },
}

interface StatusBadgeProps {
  status: TaskStatus
  size?: 'sm' | 'md'
}

interface PriorityBadgeProps {
  priority: TaskPriority
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const cfg = statusConfig[status]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${cfg.classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {cfg.label}
    </span>
  )
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const cfg = priorityConfig[priority]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeClass} ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}
