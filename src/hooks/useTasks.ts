'use client'

import { useCallback, useMemo, useState } from 'react'
import { Task, TaskStats } from '@/types'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ToastProvider'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

const MIN_FEEDBACK_MS = 500

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Failed to fetch data', res.status)
  }
  return data as T
}

async function apiFetch(url: string, options?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, options)
    const data = await res.json().catch(() => null)
    if (!res.ok) return { success: false, ...(data ?? {}), status: res.status }
    return data
  } catch {
    return null
  }
}

export type ActionState = 'idle' | 'saving' | 'updating' | 'deleting' | 'completing'

export function useTasks() {
  const { status: sessionStatus } = useSession()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [completingId, setCompletingId] = useState<string | null>(null)

  const enabled = sessionStatus === 'authenticated'

  const {
    data: tasksData,
    error: tasksError,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useQuery<Task[]>({
    queryKey: queryKeys.tasks.all,
    queryFn: () => fetcher<Task[]>(queryKeys.tasks.allUrl),
    enabled,
    placeholderData: prev => prev,
  })

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<TaskStats>({
    queryKey: queryKeys.tasks.stats,
    queryFn: () => fetcher<TaskStats>(queryKeys.tasks.statsUrl),
    enabled,
    placeholderData: prev => prev,
  })

  const refreshTaskCaches = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: query =>
        Array.isArray(query.queryKey) && query.queryKey[0] === 'tasks',
    })
  }, [queryClient])

  const fetchAll = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return
    await Promise.all([refetchTasks(), refetchStats()])
  }, [refetchTasks, refetchStats, sessionStatus])

  const loading = useMemo(() => {
    if (sessionStatus === 'loading') return true
    return Boolean(tasksLoading || statsLoading)
  }, [sessionStatus, statsLoading, tasksLoading])

  const error = useMemo(() => {
    return tasksError?.message ?? statsError?.message ?? null
  }, [statsError?.message, tasksError?.message])

  const tasks = tasksData ?? []
  const stats = statsData ?? null

  const createTask = async (data: Partial<Task>) => {
    setActionState('saving')
    const [result] = await Promise.all([
      apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
      sleep(MIN_FEEDBACK_MS),
    ])

    if (result?.error) {
      addToast({
        variant: 'error',
        title: 'Task creation failed',
        description: result.error,
      })
    } else {
      addToast({
        variant: 'success',
        title: 'Task assigned successfully',
        description: data.assignedUser
          ? `Assigned to ${data.assignedUser}`
          : 'New task is now available in your list.',
      })
    }

    await refreshTaskCaches()
    setActionState('idle')
    return result
  }

  const updateTask = async (id: string, data: Partial<Task>) => {
    const previousTask = tasks.find(task => task.id === id)
    setActionState('updating')
    const [result] = await Promise.all([
      apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
      sleep(MIN_FEEDBACK_MS),
    ])

    if (result?.error) {
      addToast({
        variant: 'error',
        title: 'Task update failed',
        description: result.error,
      })
    } else {
      const statusChanged = Boolean(
        data.status && previousTask && previousTask.status !== data.status
      )
      const assigneeChanged = Boolean(
        data.assignedUser && previousTask && previousTask.assignedUser !== data.assignedUser
      )

      if (assigneeChanged) {
        addToast({
          variant: 'success',
          title: 'Task assignment updated',
          description: `Assigned to ${data.assignedUser}.`,
        })
      }

      if (statusChanged) {
        addToast({
          variant: 'success',
          title: 'Task status updated',
          description: `Status changed to ${data.status}.`,
        })
      }

      if (!statusChanged && !assigneeChanged) {
        addToast({
          variant: 'success',
          title: 'Task updated',
        })
      }
    }

    await refreshTaskCaches()
    setActionState('idle')
    return result
  }

  const markComplete = async (id: string) => {
    setCompletingId(id)
    const [result] = await Promise.all([
      apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }),
      sleep(MIN_FEEDBACK_MS),
    ])

    if (result?.error) {
      addToast({
        variant: 'error',
        title: 'Could not complete task',
        description: result.error,
      })
    } else {
      addToast({
        variant: 'success',
        title: 'Task status updated',
        description: 'Task moved to completed.',
      })
    }

    await refreshTaskCaches()
    setCompletingId(null)
  }

  const deleteTask = async (id: string) => {
    setActionState('deleting')
    const [result] = await Promise.all([
      apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),
      sleep(MIN_FEEDBACK_MS),
    ])
    if (!result?.success) {
      addToast({
        variant: 'error',
        title: 'Task deletion failed',
        description: result?.error ?? 'Failed to delete task',
      })
      setActionState('idle')
      throw new Error(result?.error ?? 'Failed to delete task')
    }
    addToast({
      variant: 'success',
      title: 'Task deleted',
    })
    await refreshTaskCaches()
    setActionState('idle')
  }

  return {
    tasks, stats,
    loading,
    error,
    actionState,
    completingId,
    refetch: fetchAll,
    createTask, updateTask, markComplete, deleteTask,
  }
}

export function useRecentTasks(limit = 6) {
  const { status: sessionStatus } = useSession()
  const enabled = sessionStatus === 'authenticated'

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useQuery<Task[]>({
    queryKey: queryKeys.tasks.recent(limit),
    queryFn: () => fetcher<Task[]>(queryKeys.tasks.recentUrl(limit)),
    enabled,
    placeholderData: prev => prev,
  })

  return {
    tasks: data ?? [],
    loading: isLoading || sessionStatus === 'loading',
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
