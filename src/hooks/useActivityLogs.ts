'use client'

import { useMemo } from 'react'
import { ActivityLog } from '@/types'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

type ActivityLogsResponse = {
  logs: ActivityLog[]
  total: number
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? 'Failed to fetch activity logs')
  }
  return data as T
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
  const enabled = sessionStatus === 'authenticated'

  const queryKey = useMemo(
    () => queryKeys.activity.list(limit, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit, filters?.taskId, filters?.action, filters?.user, filters?.dateFrom, filters?.dateTo, filters?.offset]
  )

  const url = useMemo(
    () => queryKeys.activity.url(limit, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limit, filters?.taskId, filters?.action, filters?.user, filters?.dateFrom, filters?.dateTo, filters?.offset]
  )

  const { data, error, isLoading, refetch } = useQuery<ActivityLogsResponse>({
    queryKey,
    queryFn: () => fetcher<ActivityLogsResponse>(url),
    enabled,
    placeholderData: prev => prev,
  })

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    loading: isLoading || sessionStatus === 'loading',
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
