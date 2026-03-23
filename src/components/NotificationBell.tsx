'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Clock3 } from 'lucide-react'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { useNotifications } from '@/hooks/useNotifications'
import { AppNotification } from '@/types'

function parseRelatedDetails(text: string): { creator: string; assignedAs: string } {
  const creatorPrefix = 'Creator: '
  const assignedPrefix = 'Assigned as: '
  const separator = ' | '

  const creatorStart = text.indexOf(creatorPrefix)
  const assignedStart = text.indexOf(assignedPrefix)

  if (creatorStart === -1 || assignedStart === -1) {
    return { creator: 'Unknown', assignedAs: text || 'Unknown' }
  }

  const creator = text
    .slice(creatorStart + creatorPrefix.length, text.indexOf(separator, creatorStart) === -1 ? text.length : text.indexOf(separator, creatorStart))
    .trim()

  const assignedAs = text.slice(assignedStart + assignedPrefix.length).trim()

  return {
    creator: creator || 'Unknown',
    assignedAs: assignedAs || 'Unknown',
  }
}

function getTypeLabel(type: AppNotification['type']) {
  if (type === 'task_assigned') return 'Assigned'
  if (type === 'task_status_updated') return 'Status'
  if (type === 'task_updated') return 'Updated'
  if (type === 'task_deleted') return 'Deleted'
  return 'Task'
}

function getTypeClasses(type: AppNotification['type']) {
  if (type === 'task_assigned') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (type === 'task_status_updated') return 'bg-sky-100 text-sky-700 border-sky-200'
  if (type === 'task_updated') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (type === 'task_deleted') return 'bg-rose-100 text-rose-700 border-rose-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, error, markAllRead } = useNotifications(12)

  const hasUnread = unreadCount > 0

  const headerLabel = useMemo(() => {
    if (loading) return 'Loading notifications...'
    if (notifications.length === 0) return 'No notifications yet'
    return `${notifications.length} recent notification${notifications.length === 1 ? '' : 's'}`
  }, [loading, notifications.length])

  const unreadNotifications = notifications.filter(item => !item.isRead)
  const readNotifications = notifications.filter(item => item.isRead)

  const handleOpen = async () => {
    const next = !open
    setOpen(next)
    if (next && hasUnread) {
      await markAllRead()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-green-700 transition-colors"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-[10px] text-green-950 font-bold flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[23rem] max-w-[94vw] bg-white rounded-2xl border border-gray-100 shadow-xl z-30 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800 tracking-tight">Notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">{headerLabel}</p>
                </div>
                {hasUnread && (
                  <button
                    onClick={markAllRead}
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 px-2 py-1 rounded-md hover:bg-green-100 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[24rem] overflow-y-auto p-2.5">
              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs font-semibold text-red-700">Failed to load notifications</p>
                  <p className="text-[11px] text-red-600 mt-0.5">{error}</p>
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-gray-500">
                  You are all caught up.
                </div>
              )}

              {unreadNotifications.length > 0 && (
                <div className="mb-2">
                  <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-green-700">
                    New
                  </p>
                  <div className="space-y-2">
                    {unreadNotifications.map((item, index) => {
                      const details = parseRelatedDetails(item.relatedUser)
                      return (
                        <Link
                          key={item.id}
                          href={item.taskId ? `/dashboard/tasks/${item.taskId}` : '/dashboard/tasks'}
                          onClick={() => setOpen(false)}
                          className="block rounded-xl p-3 border bg-green-50 border-green-100 hover:bg-green-100/70 transition-colors"
                          style={{ animation: `notif-enter 260ms ease ${index * 45}ms both` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 leading-5">{item.message}</p>
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${getTypeClasses(item.type)}`}>
                              {getTypeLabel(item.type)}
                            </span>
                          </div>

                          <div className="mt-2 rounded-lg bg-white/80 border border-green-100 px-2.5 py-2 space-y-1">
                            <p className="text-[11px] text-gray-600">
                              Creator: <span className="font-semibold text-gray-700">{details.creator}</span>
                            </p>
                            <p className="text-[11px] text-gray-600">
                              Assigned as: <span className="font-semibold text-gray-700">{details.assignedAs}</span>
                            </p>
                          </div>

                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                            <Clock3 className="w-3 h-3" />
                            {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true })}
                            <span className="text-gray-400">·</span>
                            {format(parseISO(item.timestamp), 'PPp')}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {readNotifications.length > 0 && (
                <div>
                  <p className="px-1 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Earlier
                  </p>
                  <div className="space-y-2">
                    {readNotifications.map((item, index) => {
                      const details = parseRelatedDetails(item.relatedUser)
                      const delay = (unreadNotifications.length * 45) + (index * 45)
                      return (
                        <Link
                          key={item.id}
                          href={item.taskId ? `/dashboard/tasks/${item.taskId}` : '/dashboard/tasks'}
                          onClick={() => setOpen(false)}
                          className="block rounded-xl p-3 border bg-white border-gray-100 hover:bg-gray-50 transition-colors"
                          style={{ animation: `notif-enter 260ms ease ${delay}ms both` }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 leading-5">{item.message}</p>
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap ${getTypeClasses(item.type)}`}>
                              {getTypeLabel(item.type)}
                            </span>
                          </div>

                          <div className="mt-2 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2 space-y-1">
                            <p className="text-[11px] text-gray-600">
                              Creator: <span className="font-semibold text-gray-700">{details.creator}</span>
                            </p>
                            <p className="text-[11px] text-gray-600">
                              Assigned as: <span className="font-semibold text-gray-700">{details.assignedAs}</span>
                            </p>
                          </div>

                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                            <Clock3 className="w-3 h-3" />
                            {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true })}
                            <span className="text-gray-400">·</span>
                            {format(parseISO(item.timestamp), 'PPp')}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes notif-enter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
