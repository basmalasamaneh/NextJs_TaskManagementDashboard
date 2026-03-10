'use client'

import { Loader2, Save, RefreshCw, Trash2 } from 'lucide-react'
import { ActionState } from '@/hooks/useTasks'

const CONFIG: Record<Exclude<ActionState, 'idle'>, { icon: React.ReactNode; label: string; color: string }> = {
  saving: {
    icon: <Save className="w-5 h-5 text-green-600" />,
    label: 'Saving task…',
    color: 'text-green-700',
  },
  updating: {
    icon: <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />,
    label: 'Updating task…',
    color: 'text-blue-700',
  },
  deleting: {
    icon: <Trash2 className="w-5 h-5 text-red-500" />,
    label: 'Deleting task…',
    color: 'text-red-700',
  },
  completing: {
    icon: <Loader2 className="w-5 h-5 text-green-600 animate-spin" />,
    label: 'Marking complete…',
    color: 'text-green-700',
  },
}

export function ActionOverlay({ state }: { state: ActionState }) {
  if (state === 'idle') return null
  const cfg = CONFIG[state]

  return (
    <div className="fixed inset-0 z-[60] bg-white/30 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4 pointer-events-none">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-3 pointer-events-auto mb-20 sm:mb-0">
        {cfg.icon}
        <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        <div className="flex gap-1 ml-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                state === 'deleting' ? 'bg-red-400' : state === 'updating' ? 'bg-blue-400' : 'bg-green-400'
              } animate-bounce`}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
