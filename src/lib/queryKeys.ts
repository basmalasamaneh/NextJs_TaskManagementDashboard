type ActivityFilters = {
  taskId?: string
  action?: string
  user?: string
  dateFrom?: string
  dateTo?: string
  offset?: number
}

function buildActivityUrl(limit?: number, filters?: ActivityFilters): string {
  const params = new URLSearchParams()
  if (limit) params.set('limit', limit.toString())
  if (filters?.taskId) params.set('taskId', filters.taskId)
  if (filters?.action) params.set('action', filters.action)
  if (filters?.user) params.set('user', filters.user)
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters?.dateTo) params.set('dateTo', filters.dateTo)
  if (filters?.offset !== undefined) params.set('offset', filters.offset.toString())
  return `/api/activity?${params.toString()}`
}

// React Query array keys (used as queryKey)
// URL helpers (used as queryFn argument)
export const queryKeys = {
  tasks: {
    all: ['tasks', 'list'] as const,
    allUrl: '/api/tasks',
    stats: ['tasks', 'stats'] as const,
    statsUrl: '/api/tasks?stats=true',
    recent: (limit: number) => ['tasks', 'recent', limit] as const,
    recentUrl: (limit: number) => `/api/tasks?limit=${limit}`,
  },
  notifications: {
    list: (limit: number) => ['notifications', limit] as const,
    url: (limit: number) => `/api/notifications?limit=${limit}`,
  },
  activity: {
    list: (limit?: number, filters?: ActivityFilters) =>
      ['activity', limit, filters] as const,
    url: (limit?: number, filters?: ActivityFilters) =>
      buildActivityUrl(limit, filters),
  },
}
