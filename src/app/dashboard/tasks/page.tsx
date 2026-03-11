'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  Plus, Search, Filter, Pencil, Trash2,
  CheckCircle2, RefreshCw, ChevronDown,
  ListTodo, SortAsc, Loader2, Calendar, User, Shield,
} from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { TaskModal }     from '@/components/TaskModal'
import { ActionOverlay } from '@/components/ActionOverlay'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { format, parseISO, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'

type SortKey    = 'createdAt' | 'dueDate' | 'title' | 'priority'
type DateFilter = 'all' | 'today' | 'tomorrow' | 'this-week' | 'overdue'

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

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ''}`} />
}

function DeleteConfirmModal({
  task, onConfirm, onCancel, isDeleting,
}: { task: Task; onConfirm: () => void; onCancel: () => void; isDeleting: boolean }) {
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

export default function TasksPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const { tasks, loading, actionState, completingId, refetch, createTask, updateTask, markComplete, deleteTask } = useTasks()

  const [showModal,    setShowModal]    = useState(false)
  const [editingTask,  setEditingTask]  = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [isDeleting,   setIsDeleting]   = useState(false)

  // Filters 
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [dateFilter,     setDateFilter]     = useState<DateFilter>('all')
  const [userFilter,     setUserFilter]     = useState<string>('all')  // admin only
  const [sortKey,        setSortKey]        = useState<SortKey>('createdAt')
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('desc')

  // Unique list of assigned users, for admin's user filter dropdown
  const uniqueUsers = useMemo(() => {
    const names = Array.from(new Set(tasks.map(t => t.assignedUser).filter(Boolean)))
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
  }

  const filtered = useMemo(() => {
    let r = [...tasks]
    if (search)            r = r.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    if (statusFilter   !== 'all') r = r.filter(t => t.status   === statusFilter)
    if (priorityFilter !== 'all') r = r.filter(t => t.priority === priorityFilter)
    if (dateFilter     !== 'all') r = r.filter(t => matchesDateFilter(t, dateFilter))
    if (isAdmin && userFilter !== 'all') r = r.filter(t => t.assignedUser === userFilter)
    r.sort((a, b) => {
      const cmp =
        sortKey === 'priority' ? PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        : sortKey === 'title'  ? a.title.localeCompare(b.title)
        : new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return r
  }, [tasks, search, statusFilter, priorityFilter, dateFilter, userFilter, isAdmin, sortKey, sortDir])

  const handleSave = async (data: Partial<Task>) => {
    if (editingTask) await updateTask(editingTask.id, data)
    else             await createTask(data)
    setEditingTask(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await deleteTask(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
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
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
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
            {loading && (
              <span className="flex gap-0.5 ml-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-gray-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            )}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
            placeholder="Search tasks by title…"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Status */}
          <div className="relative flex-1 min-w-[140px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="form-select pl-9 w-full">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex-1 min-w-[140px]">
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              className="form-select w-full">
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Due Date */}
          <div className="relative flex-1 min-w-[140px]">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilter)}
              className={`form-select pl-9 w-full ${dateFilter !== 'all' ? 'border-green-400 bg-green-50 text-green-800' : ''}`}>
              {DATE_FILTER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* User filter — admin only */}
          {isAdmin && (
            <div className="relative flex-1 min-w-[140px]">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={userFilter} onChange={e => setUserFilter(e.target.value)}
                className={`form-select pl-9 w-full ${userFilter !== 'all' ? 'border-purple-400 bg-purple-50 text-purple-800' : ''}`}>
                <option value="all">All Users</option>
                {uniqueUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
            <SortAsc className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="form-select w-full">
              <option value="createdAt">Newest</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="btn-secondary px-2.5 py-2">
              <ChevronDown className={`w-4 h-4 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
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

      {/* Task list */}
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
        <div className="space-y-3">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isAdmin={isAdmin}
              isCompleting={completingId === task.id}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeleteTarget(task)}
              onMarkComplete={() => markComplete(task.id)}
            />
          ))}
          <p className="text-center text-xs text-gray-400 py-2">
            Showing {filtered.length} of {tasks.length} tasks
          </p>
        </div>
      )}
    </>
  )
}

function TaskCard({ task, isAdmin, isCompleting, onEdit, onDelete, onMarkComplete }: {
  task: Task; isAdmin: boolean; isCompleting: boolean
  onEdit: () => void; onDelete: () => void; onMarkComplete: () => void
}) {
  return (
    <div className={`card p-4 hover:shadow-md transition-all border-l-4 ${
      task.status === 'overdue'       ? 'border-l-red-400'
      : task.status === 'completed'   ? 'border-l-green-400'
      : task.status === 'in-progress' ? 'border-l-blue-400'
      : 'border-l-amber-400'
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
            <span className="text-xs text-gray-400">Due: {format(parseISO(task.dueDate), 'MMM d, yyyy')}</span>

            {/* Assigned user badge */}
            {task.assignedUser && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700'
              }`}>
                <User className="w-3 h-3" />
                {task.assignedUser}
              </span>
            )}

            <span className="text-xs text-gray-300">Created: {format(parseISO(task.createdAt), 'MMM d')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onEdit} disabled={isCompleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
            title="Edit task">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} disabled={isCompleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Delete task">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
