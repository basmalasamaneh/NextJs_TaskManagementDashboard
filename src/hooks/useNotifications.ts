'use client'

import { useCallback } from 'react'
import { AppNotification } from '@/types'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

type NotificationsResponse = {
  notifications: AppNotification[]
  unreadCount: number
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error ?? 'Failed to fetch notifications')
  }
  return data as T
}

export function useNotifications(limit = 12) {
  const { status: sessionStatus } = useSession()
  const queryClient = useQueryClient()
  const enabled = sessionStatus === 'authenticated'

  const { data, error, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: queryKeys.notifications.list(limit),
    queryFn: () => fetcher<NotificationsResponse>(queryKeys.notifications.url(limit)),
    enabled,
    staleTime: 10000,
    refetchOnMount: true,
    refetchInterval: enabled ? 15000 : false,
    placeholderData: prev => prev,
  })

  const markAllRead = useCallback(async () => {
    const qKey = queryKeys.notifications.list(limit)
    // Optimistic update
    queryClient.setQueryData<NotificationsResponse>(qKey, prev => prev ? {
      notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    } : prev)

    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark notifications as read')
    } catch {
      // Rollback on error
      await queryClient.invalidateQueries({ queryKey: qKey })
    } finally {
      await queryClient.invalidateQueries({ queryKey: qKey })
    }
  }, [queryClient, limit])

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    loading: isLoading || sessionStatus === 'loading',
    error: error instanceof Error ? error.message : null,
    refetch,
    markAllRead,
  }
}
