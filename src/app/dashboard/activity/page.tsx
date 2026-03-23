'use client'

import { useState, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { useActivityLogs } from '@/hooks/useActivityLogs'
import { ActivityLog } from '@/types'
import { useSession } from 'next-auth/react'
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Activity,
  PencilLine,
  CheckCircle2,
  Trash2,
  CalendarClock,
  User,
} from 'lucide-react'

const actionLabels: Record<string, string> = {
  task_created:  'Created task',
  task_updated:  'Updated task',
  task_deleted:  'Deleted task',
  status_changed: 'Changed task status',
}

const ITEMS_PER_PAGE = 10

const actionStyles: Record<string, { icon: any; chip: string; ring: string; iconBox: string }> = {
  task_created: {
    icon: Activity,
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    ring: 'border-emerald-100',
    iconBox: 'bg-emerald-100 text-emerald-700',
  },
  task_updated: {
    icon: PencilLine,
    chip: 'bg-blue-50 text-blue-700 border-blue-100',
    ring: 'border-blue-100',
    iconBox: 'bg-blue-100 text-blue-700',
  },
  status_changed: {
    icon: CheckCircle2,
    chip: 'bg-amber-50 text-amber-700 border-amber-100',
    ring: 'border-amber-100',
    iconBox: 'bg-amber-100 text-amber-700',
  },
  task_deleted: {
    icon: Trash2,
    chip: 'bg-rose-50 text-rose-700 border-rose-100',
    ring: 'border-rose-100',
    iconBox: 'bg-rose-100 text-rose-700',
  },
}

function ActivityFilters({
  filters,
  onFiltersChange,
  isAdmin
}: {
  filters: any
  onFiltersChange: (filters: any) => void
  isAdmin: boolean
}) {
  const [showFilters, setShowFilters] = useState(true)
  const activeCount = [
    !!filters.action,
    !!filters.user,
    !!filters.dateFrom,
    !!filters.dateTo,
  ].filter(Boolean).length

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide filters' : 'Show filters'}
        </button>
        <p className="text-xs text-gray-500">
          {activeCount > 0 ? `${activeCount} active filter${activeCount > 1 ? 's' : ''}` : 'No active filters'}
        </p>
      </div>

      {showFilters && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Action</label>
              <select
                value={filters.action || ''}
                onChange={(e) => onFiltersChange({ ...filters, action: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All actions</option>
                <option value="task_created">Task Created</option>
                <option value="task_updated">Task Updated</option>
                <option value="task_deleted">Task Deleted</option>
                <option value="status_changed">Status Changed</option>
              </select>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">User (name)</label>
                <input
                  type="text"
                  placeholder="Filter by creator name..."
                  value={filters.user || ''}
                  onChange={(e) => onFiltersChange({ ...filters, user: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">From Date</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">To Date</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onFiltersChange({})}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, totalItems)

  // Build page numbers with ellipsis
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
      {/* Info */}
      <p className="text-xs text-gray-500 order-2 sm:order-1">
        Showing <span className="font-semibold text-gray-700">{start}–{end}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalItems}</span> activities
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === currentPage
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function formatLog(log: ActivityLog) {
  const style = actionStyles[log.action] ?? actionStyles.task_updated
  const ActionIcon = style.icon
  const action = actionLabels[log.action] ?? log.action
  const when = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
  const fullTime = format(new Date(log.timestamp), 'PPpp')
  const task = log.taskTitle ? `${log.taskTitle}` : '—'
  const details = log.details ? log.details : ''

  return (
    <div key={log.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${style.ring}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.iconBox}`}>
          <ActionIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${style.chip}`}>
              {action}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <CalendarClock className="h-3.5 w-3.5" />
              {when}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="font-medium text-gray-800">{log.userName}</span>
            </span>
            <span className="text-gray-400">•</span>
            <span title={fullTime}>{fullTime}</span>
          </div>

          {log.taskId && (
            <p className="mt-2 text-xs text-gray-600">
              Task: <span className="font-medium text-gray-800">{task}</span>
            </p>
          )}
        </div>
      </div>

      {details && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-600 whitespace-pre-line">{details}</p>
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const [filters, setFilters] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const offset = (currentPage - 1) * ITEMS_PER_PAGE
  const memoizedFilters = useMemo(() => ({ ...filters, offset }), [filters, offset])

  const { logs, total, loading, error, refetch } = useActivityLogs(ITEMS_PER_PAGE, memoizedFilters)

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetch(),
        new Promise(resolve => setTimeout(resolve, 400)),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="pb-4">
      <div className="mb-6 rounded-2xl border border-gray-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
            <p className="mt-1 text-sm text-gray-500">Recent system actions with full details, filters, and pagination.</p>
            <p className="mt-2 text-xs text-gray-500">Each page shows 10 activities.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={`btn-secondary transition-all ${refreshing ? 'opacity-80 cursor-not-allowed' : ''}`}
            title="Refresh activity logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <ActivityFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isAdmin={isAdmin}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">Failed to load activity logs</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
            <div key={idx} className="h-28 animate-pulse bg-gray-100 rounded-2xl" />
          ))
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-gray-500">No activities found matching your filters.</p>
          </div>
        ) : (
          logs.map(log => formatLog(log))
        )}
      </div>

      <ActivityPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        perPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
