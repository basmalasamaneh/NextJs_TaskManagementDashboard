'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Timer, LogOut, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'

const SESSION_MS  = 10 * 60 * 1000   // 10 min 
const WARN_AT_S   = 2 * 60            
const URGENT_AT_S = 60                

function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}` }

type ColorSet = { bar: string; text: string; bg: string; border: string; pill: string }

function getColor(s: number): ColorSet {
  if (s <= URGENT_AT_S) return {
    bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50',
    border: 'border-red-200', pill: 'bg-red-600 border-red-700 text-white',
  }
  if (s <= WARN_AT_S) return {
    bar: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50',
    border: 'border-amber-200', pill: 'bg-amber-500 border-amber-600 text-white',
  }
  return {
    bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50',
    border: 'border-green-200', pill: 'bg-white border-gray-200 text-gray-800',
  }
}

export function SessionTimer() {
  const { data: session, status } = useSession()
  const [seconds, setSeconds]     = useState<number | null>(null)
  const [expanded, setExpanded]   = useState(false)
  const rafRef = useRef<number | null>(null)

  const calcRemaining = useCallback((): number => {
    const loginTime = (session?.user as any)?.loginTime as number | undefined
    if (!loginTime) return SESSION_MS / 1000
    const elapsed = Date.now() - loginTime
    return Math.max(0, Math.floor((SESSION_MS - elapsed) / 1000))
  }, [session])

  useEffect(() => {
    if (status !== 'authenticated') return

    setSeconds(calcRemaining())

    const tick = () => {
      const rem = calcRemaining()
      setSeconds(rem)
      if (rem <= 0) {
        signOut({ callbackUrl: '/login' })
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [status, calcRemaining])

  if (status !== 'authenticated' || seconds === null) return null

  const pct = Math.max(0, (seconds / (SESSION_MS / 1000)) * 100)
  const c   = getColor(seconds)

  return (
    <>
      {/* Warning banner: appears when ≤ 2 min left */}
      {seconds <= WARN_AT_S && seconds > 0 && (
        <div className={`fixed top-16 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b ${c.bg} ${c.border} shadow-sm`}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${c.text} ${seconds <= URGENT_AT_S ? 'animate-bounce' : ''}`} />
            <span className={`text-sm font-medium ${c.text} truncate`}>
              {seconds <= URGENT_AT_S
                ? `Session expiring in ${fmt(seconds)} — you will be signed out automatically.`
                : `Session expires in ${fmt(seconds)}`}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${c.border} ${c.text} hover:opacity-80 transition-opacity whitespace-nowrap`}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* timer widget */}
      <div className="fixed bottom-5 right-4 z-50 flex flex-col items-end gap-2 select-none">

        {/* Expanded card */}
        {expanded && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-56 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Session
                </span>
                <span className={`text-2xl font-bold font-mono tabular-nums leading-none ${c.text}`}>
                  {fmt(seconds)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-2.5 rounded-full ${c.bar}`}
                  style={{ width: `${pct}%`, transition: 'none' }}
                />
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {seconds > 0
                  ? `${Math.ceil(seconds / 60)} min remaining · 10 min session`
                  : 'Session expired'}
              </p>
            </div>

            {/* Sign out button */}
            <div className="border-t border-gray-100 px-3 py-2.5">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Pill button */}
        <button
          onClick={() => setExpanded(v => !v)}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg transition-all duration-150 hover:scale-105 active:scale-95 ${c.pill} ${seconds <= URGENT_AT_S ? 'animate-pulse' : ''}`}
          title="Session timer"
        >
          <Timer className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-mono font-bold tabular-nums">{fmt(seconds)}</span>
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            : <ChevronUp   className="w-3.5 h-3.5 opacity-50" />}

          {seconds <= WARN_AT_S && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
      </div>
    </>
  )
}
