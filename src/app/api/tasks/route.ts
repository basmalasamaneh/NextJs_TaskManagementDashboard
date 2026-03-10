import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import {
  getTasksByUserId,
  createTask,
  getTaskStats,
  seedDemoTasks,
} from '@/lib/taskStore'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  seedDemoTasks(userId)

  const { searchParams } = new URL(req.url)
  const statsOnly = searchParams.get('stats') === 'true'
  const limit = searchParams.get('limit')

  if (statsOnly) {
    return NextResponse.json(getTaskStats(userId))
  }

  let tasks = getTasksByUserId(userId)

  // Sorting: recent first
  tasks = tasks.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (limit) {
    tasks = tasks.slice(0, parseInt(limit))
  }

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const body = await req.json()

  const { title, description, priority, dueDate, status } = body

  if (!title || !dueDate) {
    return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 })
  }

  const task = createTask(userId, {
    title,
    description: description ?? '',
    priority: priority ?? 'medium',
    dueDate,
    status,
  })

  return NextResponse.json(task, { status: 201 })
}
