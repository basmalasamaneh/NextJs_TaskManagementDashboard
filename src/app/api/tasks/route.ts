import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getTasksByUserId, getAllTasks, createTask, getTaskStats } from '@/lib/taskStore'
import { addActivity } from '@/lib/activityStore'
import { canCreateTask, canViewTask } from '@/lib/rbac'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }

// ── GET /api/tasks ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user     = session.user as any
    const userId   = user.id   as string
    const userRole = (user.role as string) as any
    const isAdmin  = userRole === 'admin'
    const { searchParams } = new URL(req.url)
    const statsOnly = searchParams.get('stats') === 'true'
    const limit     = searchParams.get('limit')

    if (statsOnly) {
      const stats = await getTaskStats(userId, isAdmin)
      return NextResponse.json(stats, { headers: noStoreHeaders })
    }

    // RBAC: Admin can view all tasks, users can only view their own
    let tasks = isAdmin ? await getAllTasks() : await getTasksByUserId(userId)

    // Filter out tasks the user shouldn't see (double-check)
    if (!isAdmin) {
      tasks = tasks.filter(t => canViewTask(userRole as any, t.userId, userId))
      tasks = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    if (limit) tasks = tasks.slice(0, parseInt(limit))

    return NextResponse.json(tasks, { headers: noStoreHeaders })
  } catch (error) {
    console.error('[GET /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST /api/tasks ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user   = session.user as any
    const userId = user.id as string
    const userRole = (user.role as string) as any

    // RBAC: Check if user has permission to create tasks
    if (!canCreateTask(userRole as any)) {
      return NextResponse.json(
        { error: 'You do not have permission to create tasks' },
        { status: 403 }
      )
    }

    const body   = await req.json()
    const { title, description, priority, dueDate, assignedUserId, assignedUser, status } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }
    if (!assignedUserId && !assignedUser?.trim()) {
      return NextResponse.json({ error: 'Assigned user is required' }, { status: 400 })
    }

    const task = await createTask(userId, {
      title:        title.trim(),
      description:  description?.trim() ?? '',
      priority:     priority     ?? 'medium',
      dueDate,
      assignedUserId,
      assignedUser: assignedUser ?? '',
      status,
    })

    // Activity log
    try {
      await addActivity(
        userId,
        user.name as string,
        'task_created',
        task.id,
        task.title,
        `Status: ${task.status}; Priority: ${task.priority}; Due: ${task.dueDate}; Assigned: ${task.assignedUser}`
      )
    } catch (err) {
      console.warn('[POST /api/tasks] Activity logging failed', err)
    }

    return NextResponse.json(task, { status: 201, headers: noStoreHeaders })
  } catch (error) {
    console.error('[POST /api/tasks]', error)
    if (error instanceof Error && error.message.includes('Assigned user')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
