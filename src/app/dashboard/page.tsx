'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo,
  Plus, RefreshCw, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { useTasks, useRecentTasks } from '@/hooks/useTasks'
import { StatCard }      from '@/components/StatCard'
import { ProgressBar }   from '@/components/ProgressBar'
import { TaskChart }     from '@/components/TaskChart'
import { TaskModal }     from '@/components/TaskModal'
import { ActionOverlay } from '@/components/ActionOverlay'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { Task } from '@/types'
import { format, parseISO } from 'date-fns'

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Due {format(parseISO(task.dueDate), 'MMM d, yyyy')}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <PriorityBadge priority={task.priority} />
        <StatusBadge   status={task.status} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { stats, loading: statsLoading, actionState, refetch, createTask } = useTasks()
  const { tasks: recentTasks, loading: tasksLoading, refetch: refetchRecent } = useRecentTasks(6)
  const [showModal,  setShowModal]  = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isAdmin = (session?.user as any)?.role === 'admin'
  const userName = session?.user?.name?.split(' ')[0] ?? 'there'
  const handleRefresh = async () => {
  setRefreshing(true)
  await Promise.all([
    refetch(),
    refetchRecent(),
    new Promise(r => setTimeout(r, 600)), 
  ])
  setRefreshing(false)
}

  const handleCreate = async (data: Partial<Task>) => {
    await createTask(data)
    await refetchRecent()
  }

  return (
    <>
      <ActionOverlay state={actionState} />

      {showModal && (
        <TaskModal onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good day, {userName}! </h1>
          <p className="text-gray-500 mt-1 text-sm">Here's an overview of your task progress today.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
              onClick={handleRefresh}
              disabled={refreshing || statsLoading}
              className={`btn-secondary transition-all ${refreshing ? 'opacity-80 cursor-not-allowed' : ''}`}
                    title="Refresh data"
          >
              <RefreshCw className={`w-4 h-4 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                  {refreshing ? 'Refreshing…' : 'Refresh'}
              </span>
              {refreshing && (
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : stats ? (
            <>
              <StatCard title="Total Tasks"  value={stats.total}                     icon={ListTodo}      color="green" subtitle="All tasks"                   />
              <StatCard title="Completed"    value={stats.completed}                  icon={CheckCircle2}  color="blue"  subtitle={`${stats.completionRate}% done`} />
              <StatCard title="Pending"      value={stats.pending + stats.inProgress} icon={Clock}         color="amber" subtitle="Needs attention"              />
              <StatCard title="Overdue"      value={stats.overdue}                    icon={AlertTriangle} color="red"   subtitle="Past due date"                 />
            </>
          ) : null}
      </div>

      {/* Progress */}
      {statsLoading ? (
        <Skeleton className="h-40 mb-6" />
      ) : stats && stats.total > 0 ? (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Overall Completion</h2>
              <p className="text-sm text-gray-500 mt-0.5">{stats.completed} of {stats.total} tasks completed</p>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.completionRate}%</span>
          </div>
          <ProgressBar value={stats.completionRate} label="Task Completion Rate" size="lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
            {[
              { label: 'Completed',   count: stats.completed,  color: 'bg-green-500' },
              { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500'  },
              { label: 'Pending',     count: stats.pending,    color: 'bg-amber-500' },
              { label: 'Overdue',     count: stats.overdue,    color: 'bg-red-500'   },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-500">{item.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-700">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Chart + Recent tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Task Distribution</h2>
          <p className="text-sm text-gray-500 mb-4">Visual breakdown by status</p>
          {statsLoading ? <Skeleton className="h-64" />
            : stats && stats.total > 0 ? <TaskChart stats={stats} />
            : <EmptyState onCreateClick={() => setShowModal(true)} />}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">Recent Tasks</h2>
              <p className="text-sm text-gray-500 mt-0.5">Latest task activity</p>
            </div>
            <Link href="/dashboard/tasks" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {tasksLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : recentTasks.length === 0 ? (
            <EmptyState onCreateClick={() => setShowModal(true)} />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mb-3">
        <ListTodo className="w-7 h-7 text-green-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 mb-1">No tasks available</p>
      <p className="text-xs text-gray-400 mb-4">Create your first task to get started.</p>
      <button onClick={onCreateClick} className="btn-primary text-sm py-1.5 px-4">
        <Plus className="w-4 h-4" /> Create Task
      </button>
    </div>
  )
}
