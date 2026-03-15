import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  getTasksByUserId, getAllTasks,
  createTask, getTaskStats, seedDemoTasks,
} from '@/lib/taskStore'

// ── GET /api/tasks ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user     = session.user as any
    const userId   = user.id   as string
    const isAdmin  = user.role === 'admin'
    const userName = user.name as string

    await seedDemoTasks(userId, userName)

    const { searchParams } = new URL(req.url)
    const statsOnly = searchParams.get('stats') === 'true'
    const limit     = searchParams.get('limit')

    if (statsOnly) {
      const stats = await getTaskStats(userId, isAdmin)
      return NextResponse.json(stats)
    }

    let tasks = isAdmin ? await getAllTasks() : await getTasksByUserId(userId)

    if (!isAdmin) {
      tasks = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    if (limit) tasks = tasks.slice(0, parseInt(limit))

    return NextResponse.json(tasks)
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
    const body   = await req.json()
    const { title, description, priority, dueDate, assignedUser, status } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }

    const task = await createTask(userId, {
      title:        title.trim(),
      description:  description?.trim() ?? '',
      priority:     priority     ?? 'medium',
      dueDate,
      assignedUser: assignedUser ?? '',
      status,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tasks]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
