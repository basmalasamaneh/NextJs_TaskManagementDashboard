import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ensureDemoData } from '@/lib/demoData'
import { getActivitiesByUserId, getAllActivities } from '@/lib/activityStore'

export const dynamic = 'force-dynamic'

function startOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000`).toISOString()
}

function endOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString()
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user     = session.user as any
    await ensureDemoData()
    const userId   = user.id as string
    const userRole = (user.role as string) as any
    const isAdmin  = userRole === 'admin'

    const { searchParams } = new URL(req.url)
    const limit     = parseInt(searchParams.get('limit') || '50')
    const offset    = parseInt(searchParams.get('offset') || '0')
    const taskId    = searchParams.get('taskId')
    const action    = searchParams.get('action') as any
    const userFilter = searchParams.get('user')
    const dateFrom  = searchParams.get('dateFrom')
    const dateTo    = searchParams.get('dateTo')

    // Note: `user` query is a text search by user name, not a user id.
    const baseFilters = {
      taskId: taskId || undefined,
      action: action || undefined,
      userId: isAdmin ? undefined : userId,
      dateFrom: dateFrom ? startOfDayIso(dateFrom) : undefined,
      dateTo: dateTo ? endOfDayIso(dateTo) : undefined,
    }

    // For admin user-name search, fetch matching set then apply name filter and paginate reliably.
    if (isAdmin && userFilter?.trim()) {
      const { logs } = await getAllActivities({
        ...baseFilters,
        limit: 10000,
        offset: 0,
      })

      const normalized = userFilter.trim().toLowerCase()
      const filtered = logs.filter(log => (log.userName || '').toLowerCase().includes(normalized))
      const total = filtered.length
      const paginated = filtered.slice(offset, offset + limit)
      return NextResponse.json({ logs: paginated, total })
    }

    const { logs, total } = await getAllActivities({
      ...baseFilters,
      limit,
      offset,
    })

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error('[GET /api/activity]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
