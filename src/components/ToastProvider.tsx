'use client'

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type AddToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastContextValue = {
  addToast: (input: AddToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function iconForVariant(variant: ToastVariant) {
  if (variant === 'success') return <CheckCircle2 className="w-4 h-4 text-green-600" />
  if (variant === 'error') return <AlertCircle className="w-4 h-4 text-red-600" />
  return <Info className="w-4 h-4 text-blue-600" />
}

function classesForVariant(variant: ToastVariant) {
  if (variant === 'success') return 'border-green-200 bg-green-50'
  if (variant === 'error') return 'border-red-200 bg-red-50'
  return 'border-blue-200 bg-blue-50'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const addToast = useCallback(({ title, description, variant = 'info' }: AddToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const next: ToastItem = { id, title, description, variant }

    setItems(prev => [next, ...prev].slice(0, 4))

    window.setTimeout(() => {
      removeToast(id)
    }, 3200)
  }, [removeToast])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-20 z-[70] w-[calc(100vw-2rem)] max-w-sm space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2.5 shadow-md backdrop-blur-sm transition-all duration-300 ${classesForVariant(item.variant)}`}
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5">{iconForVariant(item.variant)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-5">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-gray-600 mt-0.5 leading-4">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(item.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return ctx
}
