'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import {
  ArrowLeft, Calendar, FileText, AlignLeft, Tag, User, AlertCircle,
  Edit, Trash2, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { useTasks } from '@/hooks/useTasks'
import { useActivityLogs } from '@/hooks/useActivityLogs'
import { TaskModal } from '@/components/TaskModal'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { Task } from '@/types'

function TaskDetail({ task }: { task: Task }) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'
  const currentUserId = (session?.user as any)?.id
  const canEdit = isAdmin || task.userId === currentUserId
  const canDelete = isAdmin || task.userId === currentUserId

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{task.title}</h1>
          <p className="text-gray-500 mt-1">Created {format(parseISO(task.createdAt), 'PPP')}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <button className="btn-secondary">
              <Edit className="w-4 h-4" /> Edit
            </button>
          )}
          {canDelete && (
            <button className="btn-secondary text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Task Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Task Information</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Title</p>
                <p className="text-sm font-medium">{task.title}</p>
              </div>
            </div>

            {task.description && (
              <div className="flex items-start gap-3">
                <AlignLeft className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="text-sm">{task.description}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <PriorityBadge priority={task.priority} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <StatusBadge status={task.status} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="text-sm font-medium">{format(parseISO(task.dueDate), 'PPP')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created by</p>
                <p className="text-sm font-medium">{task.createdBy || 'Unknown User'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Assigned as</p>
                <p className="text-sm font-medium">{task.assignedUser}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Activity Feed</h2>
          <TaskActivityFeed taskId={task.id} />
        </div>
      </div>
    </div>
  )
}

function TaskActivityFeed({ taskId }: { taskId: string }) {
  const memoizedFilters = useMemo(() => ({ taskId }), [taskId])
  const { logs, loading, error } = useActivityLogs(undefined, memoizedFilters)

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-gray-100 rounded-lg" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">No activity yet for this task.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm text-red-600">Failed to load activity feed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {logs.map(log => (
        <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-800">{log.action.replace('_', ' ')}</p>
          <p className="text-xs text-gray-500 mt-1">
            {log.userName} · {format(parseISO(log.timestamp), 'PPp')}
          </p>
          {log.details && (
            <p className="text-xs text-gray-600 mt-2">{log.details}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const { tasks, loading, error } = useTasks()
  const [showModal, setShowModal] = useState(false)

  const task = tasks.find(t => t.id === params.id)

  useEffect(() => {
    if (!loading && !task) {
      router.push('/dashboard/tasks')
    }
  }, [loading, task, router])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Failed to load task</h1>
        <p className="text-gray-500 mb-4">{error}</p>
        <Link href="/dashboard/tasks" className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </Link>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h1>
        <p className="text-gray-500 mb-4">The task you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/tasks" className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <Link href="/dashboard/tasks" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </Link>
      </div>

      <TaskDetail task={task} />

      {showModal && (
        <TaskModal task={task} onClose={() => setShowModal(false)} onSave={async () => {}} />
      )}
    </>
  )
}
