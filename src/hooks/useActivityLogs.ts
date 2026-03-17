'use client'

import { useState, useEffect, useCallback } from 'react'
import { ActivityLog } from '@/types'
import { useSession } from 'next-auth/react'

async function apiFetch(url: string): Promise<any | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function useActivityLogs(limit?: number, filters?: {
  taskId?: string
  action?: string
  user?: string
  dateFrom?: string
  dateTo?: string
  offset?: number
}) {
  const { status: sessionStatus } = useSession()
  const [logs, setLogs]       = useState<ActivityLog[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  // Memoize the query parameters to prevent unnecessary re-fetches
  const queryKey = JSON.stringify({ limit, filters, sessionStatus })

  const fetchLogs = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return
    setLoading(true)
    const params = new URLSearchParams()
    if (limit) params.set('limit', limit.toString())
    if (filters?.taskId) params.set('taskId', filters.taskId)
    if (filters?.action) params.set('action', filters.action)
    if (filters?.user) params.set('user', filters.user)
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.set('dateTo', filters.dateTo)
    if (filters?.offset !== undefined) params.set('offset', filters.offset.toString())

    const url = `/api/activity?${params.toString()}`
    const data = await apiFetch(url)
    if (data !== null) {
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    }
    setLoading(false)
  }, [queryKey]) // Use the memoized query key as dependency

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return { logs, total, loading, refetch: fetchLogs }
}
