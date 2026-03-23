'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Plus, Search, Filter, Pencil, Trash2,
  CheckCircle2, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
  ListTodo, SortAsc, Loader2, Calendar, User, Shield, Eye,
} from 'lucide-react'
import Link from 'next/link'
import { useTasks } from '@/hooks/useTasks'
import { TaskModal }     from '@/components/TaskModal'
import { ActionOverlay } from '@/components/ActionOverlay'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { format, parseISO, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'

// ── Types ─────────────────────────────────────────────────────
type SortKey    = 'createdAt' | 'dueDate' | 'title' | 'priority'
type DateFilter = 'all' | 'today' | 'tomorrow' | 'this-week' | 'overdue'

const TASKS_PER_PAGE = 10

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all',       label: 'Any Date'     },
  { value: 'today',     label: 'Due Today'    },
  { value: 'tomorrow',  label: 'Due Tomorrow' },
  { value: 'this-week', label: 'This Week'    },
  { value: 'overdue',   label: 'Overdue'      },
]

function matchesDateFilter(task: Task, filter: DateFilter): boolean {
  if (filter === 'all') return true
  const d = parseISO(task.dueDate)
  if (filter === 'today')     return isToday(d)
  if (filter === 'tomorrow')  return isTomorrow(d)
  if (filter === 'this-week') return isThisWeek(d, { weekStartsOn: 1 })
  if (filter === 'overdue')   return isPast(parseISO(task.dueDate + 'T23:59:59')) && task.status !== 'completed'
  return true
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />
}

// ── Delete confirm modal ──────────────────────────────────────
function DeleteConfirmModal({
  task, onConfirm, onCancel, isDeleting, error,
}: { task: Task; onConfirm: () => void; onCancel: () => void; isDeleting: boolean; error?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDeleting && onCancel()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isDeleting
            ? <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
            : <Trash2  className="w-6 h-6 text-red-600" />}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center">
          {isDeleting ? 'Deleting…' : 'Delete Task'}
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">
          {isDeleting
            ? 'Removing task from your list…'
            : <>Are you sure you want to delete <span className="font-medium text-gray-700">"{task.title}"</span>? This cannot be undone.</>}
        </p>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        {!isDeleting && (
          <div className="flex gap-3">
            <button onClick={onCancel}  className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} className="btn-danger flex-1">Delete</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Pagination component ──────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const start = (currentPage - 1) * perPage + 1
  const end   = Math.min(currentPage * perPage, totalItems)

  // Build page numbers with ellipsis
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3)             pages.push('...')
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
        <span className="font-semibold text-gray-700">{totalItems}</span> tasks
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

// ── Main page ─────────────────────────────────────────────────
export default function TasksPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'
  const currentUserId = (session?.user as any)?.id as string | undefined

  const { tasks, loading, actionState, completingId, refetch, createTask, updateTask, markComplete, deleteTask } = useTasks()

  const [showModal,    setShowModal]    = useState(false)
  const [editingTask,  setEditingTask]  = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [isDeleting,   setIsDeleting]   = useState(false)
  const [deleteError,  setDeleteError]  = useState<string>('')

  // ── Filters ──────────────────────────────────────────────────
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [dateFilter,     setDateFilter]     = useState<DateFilter>('all')
  const [userFilter,     setUserFilter]     = useState<string>('all')
  const [sortKey,        setSortKey]        = useState<SortKey>('createdAt')
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('desc')

  // ── Pagination ───────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)

  const uniqueUsers = useMemo(() => {
    const names = Array.from(new Set(tasks.map(t => t.createdBy).filter(Boolean)))
    return names.sort()
  }, [tasks])

  const activeFilterCount = [
    search !== '',
    statusFilter   !== 'all',
    priorityFilter !== 'all',
    dateFilter     !== 'all',
    isAdmin && userFilter !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setPriorityFilter('all')
    setDateFilter('all'); setUserFilter('all')
    setCurrentPage(1)
  }

  // Reset to page 1 whenever filters change
  const updateSearch         = (v: string)                   => { setSearch(v);         setCurrentPage(1) }
  const updateStatusFilter   = (v: TaskStatus | 'all')      => { setStatusFilter(v);   setCurrentPage(1) }
  const updatePriorityFilter = (v: TaskPriority | 'all')    => { setPriorityFilter(v); setCurrentPage(1) }
  const updateDateFilter     = (v: DateFilter)              => { setDateFilter(v);     setCurrentPage(1) }
  const updateUserFilter     = (v: string)                  => { setUserFilter(v);     setCurrentPage(1) }

  // ── Filtered + sorted list ───────────────────────────────────
  const filtered = useMemo(() => {
    let r = [...tasks]
    if (search)                       r = r.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter   !== 'all')     r = r.filter(t => t.status   === statusFilter)
    if (priorityFilter !== 'all')     r = r.filter(t => t.priority === priorityFilter)
    if (dateFilter     !== 'all')     r = r.filter(t => matchesDateFilter(t, dateFilter))
    if (isAdmin && userFilter !== 'all') r = r.filter(t => t.createdBy === userFilter)
    r.sort((a, b) => {
      const cmp =
        sortKey === 'priority' ? PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        : sortKey === 'title'  ? a.title.localeCompare(b.title)
        : new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return r
  }, [tasks, search, statusFilter, priorityFilter, dateFilter, userFilter, isAdmin, sortKey, sortDir])

  // ── Pagination calculations ───────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filtered.length / TASKS_PER_PAGE))
  const safePage    = Math.min(currentPage, totalPages)
  const paginated   = filtered.slice((safePage - 1) * TASKS_PER_PAGE, safePage * TASKS_PER_PAGE)

  // ── Handlers ──────────────────────────────────────────────────
  const handleSave = async (data: Partial<Task>) => {
    if (editingTask) await updateTask(editingTask.id, data)
    else             await createTask(data)
    setEditingTask(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteTask(deleteTarget.id)
      setDeleteTarget(null)
      // If last item on page, go back one page
      if (paginated.length === 1 && safePage > 1) {
        setCurrentPage(safePage - 1)
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete task')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <ActionOverlay state={actionState} />

      {(showModal || editingTask) && (
        <TaskModal
          task={editingTask}
          onClose={() => { setShowModal(false); setEditingTask(null) }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          task={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            {isAdmin && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Admin View
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" /><span>Loading tasks…</span></>
              : isAdmin
                ? `${tasks.length} total task${tasks.length !== 1 ? 's' : ''} across all users`
                : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => refetch()} disabled={loading}
            className={`btn-secondary transition-all ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button onClick={() => { setShowModal(true); setEditingTask(null) }} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => updateSearch(e.target.value)}
            className="form-input pl-9 w-full"
            placeholder="Search tasks by title…"
          />
        </div>

        {/* Filter dropdowns — responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Status */}
          <div className="relative col-span-1">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={e => updateStatusFilter(e.target.value as TaskStatus | 'all')}
              className="form-select pl-8 text-xs w-full"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Priority */}
          <div className="col-span-1">
            <select
              value={priorityFilter}
              onChange={e => updatePriorityFilter(e.target.value as TaskPriority | 'all')}
              className="form-select text-xs w-full"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="relative col-span-1">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select
              value={dateFilter}
              onChange={e => updateDateFilter(e.target.value as DateFilter)}
              className={`form-select pl-8 text-xs w-full ${dateFilter !== 'all' ? 'border-green-400 bg-green-50 text-green-800' : ''}`}
            >
              {DATE_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* User filter — admin only */}
          {isAdmin && (
            <div className="relative col-span-1">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={userFilter}
                onChange={e => updateUserFilter(e.target.value)}
                className={`form-select pl-8 text-xs w-full ${userFilter !== 'all' ? 'border-purple-400 bg-purple-50 text-purple-800' : ''}`}
              >
                <option value="all">All Creators</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className={`flex items-center gap-1 col-span-1 ${!isAdmin ? 'col-span-2 sm:col-span-1' : ''}`}>
            <SortAsc className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="form-select text-xs flex-1"
            >
              <option value="createdAt">Newest</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="btn-secondary px-2 py-2 flex-shrink-0"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Active filter summary */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-semibold text-green-700">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </span>
              {' '}— showing {filtered.length} of {tasks.length} tasks
            </p>
            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Task list ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <Skeleton className="h-7 w-7 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <ListTodo className="w-7 h-7 text-green-400" />
          </div>
          <p className="font-medium text-gray-600 mb-1">
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {tasks.length === 0 ? 'Create your first task to get started.' : 'Try adjusting your search or filters.'}
          </p>
          {tasks.length === 0 ? (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Task
            </button>
          ) : (
            <button onClick={clearFilters} className="btn-secondary">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="card p-4">
          <div className="space-y-3 mb-4">
            {paginated.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                isAdmin={isAdmin}
                canDelete={isAdmin}
                isCompleting={completingId === task.id}
                onEdit={() => setEditingTask(task)}
                onDelete={() => { setDeleteError(''); setDeleteTarget(task) }}
                onMarkComplete={() => markComplete(task.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            perPage={TASKS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  )
}

// ── Task card ─────────────────────────────────────────────────
function TaskCard({ task, isAdmin, canDelete, isCompleting, onEdit, onDelete, onMarkComplete }: {
  task: Task; isAdmin: boolean; canDelete: boolean; isCompleting: boolean
  onEdit: () => void; onDelete: () => void; onMarkComplete: () => void
}) {
  return (
    <div className={`rounded-xl border p-4 hover:shadow-md transition-all border-l-4 ${
      task.status === 'overdue'       ? 'border-l-red-400   border-gray-100 bg-red-50/30'
      : task.status === 'completed'   ? 'border-l-green-400 border-gray-100 bg-green-50/20'
      : task.status === 'in-progress' ? 'border-l-blue-400  border-gray-100 bg-blue-50/20'
      : 'border-l-amber-400 border-gray-100'
    } ${isCompleting ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">

        {/* Complete button */}
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        ) : isCompleting ? (
          <Loader2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5 animate-spin" />
        ) : (
          <button onClick={onMarkComplete}
            className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0 transition-colors flex items-center justify-center group"
            title="Mark as complete">
            <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-green-400 transition-colors" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge   status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="text-xs text-gray-400">
              Due: {format(parseISO(task.dueDate), 'MMM d, yyyy')}
            </span>
            {task.createdBy && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700">
                Created by: {task.createdBy}
              </span>
            )}
            {task.assignedUser && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isAdmin
                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                <User className="w-3 h-3" />
                Assigned as: {task.assignedUser}
              </span>
            )}
            <span className="text-xs text-gray-300 hidden sm:inline">
              Created: {format(parseISO(task.createdAt), 'MMM d')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link href={`/dashboard/tasks/${task.id}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="View details">
            <Eye className="w-4 h-4" />
          </Link>
          <button onClick={onEdit} disabled={isCompleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
            title="Edit task">
            <Pencil className="w-4 h-4" />
          </button>
          {canDelete && (
            <button onClick={onDelete} disabled={isCompleting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
              title="Delete task">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
