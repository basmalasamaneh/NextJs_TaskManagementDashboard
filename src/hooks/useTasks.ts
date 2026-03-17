'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Task, TaskStats } from '@/types'
import { useSession } from 'next-auth/react'

const MIN_FEEDBACK_MS = 500

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

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
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [stats,       setStats]       = useState<TaskStats | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [completingId, setCompletingId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchAll = useCallback(async () => {
  if (sessionStatus !== 'authenticated') return
  abortRef.current?.abort()
  abortRef.current = new AbortController()
  setLoading(true)
  const [tasksData, statsData] = await Promise.all([
    apiFetch('/api/tasks'),
    apiFetch('/api/tasks?stats=true'),
    sleep(500), // show loading for 500ms
  ])



    if (tasksData !== null) setTasks(tasksData)
    if (statsData !== null) setStats(statsData)
    setLoading(false)
  }, [sessionStatus])

  useEffect(() => {
    fetchAll()
    return () => { abortRef.current?.abort() }
  }, [fetchAll])

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
    await fetchAll()
    setActionState('idle')
    return result
  }

  const updateTask = async (id: string, data: Partial<Task>) => {
    setActionState('updating')
    await Promise.all([
      apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
      sleep(MIN_FEEDBACK_MS),
    ])
    await fetchAll()
    setActionState('idle')
  }

  const markComplete = async (id: string) => {
    setCompletingId(id)
    await Promise.all([
      apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }),
      sleep(MIN_FEEDBACK_MS),
    ])
    await fetchAll()
    setCompletingId(null)
  }

  const deleteTask = async (id: string) => {
    setActionState('deleting')
    const [result] = await Promise.all([
      apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),
      sleep(MIN_FEEDBACK_MS),
    ])
    if (!result?.success) {
      setActionState('idle')
      throw new Error(result?.error ?? 'Failed to delete task')
    }
    await fetchAll()
    setActionState('idle')
  }

  return {
    tasks, stats,
    loading: loading || sessionStatus === 'loading',
    actionState,
    completingId,
    refetch: fetchAll,
    createTask, updateTask, markComplete, deleteTask,
  }
}

export function useRecentTasks(limit = 6) {
  const { status: sessionStatus } = useSession()
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return
    setLoading(true)
    const data = await apiFetch(`/api/tasks?limit=${limit}`)
    if (data !== null) setTasks(data)
    setLoading(false)
  }, [limit, sessionStatus])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  return { tasks, loading: loading || sessionStatus === 'loading', refetch: fetchTasks }
}
