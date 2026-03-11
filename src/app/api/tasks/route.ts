import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getTasksByUserId, getAllTasks, createTask, getTaskStats, seedDemoTasks } from '@/lib/taskStore'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user     = session.user as any
  const userId   = user.id   as string
  const isAdmin  = user.role === 'admin'
  const userName = user.name as string

  seedDemoTasks(userId, userName)

  const { searchParams } = new URL(req.url)
  const statsOnly = searchParams.get('stats') === 'true'
  const limit     = searchParams.get('limit')

  if (statsOnly) return NextResponse.json(getTaskStats(userId, isAdmin))

  let tasks = isAdmin ? getAllTasks() : getTasksByUserId(userId)

  if (!isAdmin) {
    tasks = tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  if (limit) tasks = tasks.slice(0, parseInt(limit))

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user   = session.user as any
  const userId = user.id as string
  const body   = await req.json()

  const { title, description, priority, dueDate, assignedUser, status } = body

  if (!title || !dueDate) {
    return NextResponse.json({ error: 'Title and due date are required' }, { status: 400 })
  }

  const task = createTask(userId, {
    title,
    description:  description  ?? '',
    priority:     priority     ?? 'medium',
    dueDate,
    assignedUser: assignedUser ?? '',
    status,
  })

  return NextResponse.json(task, { status: 201 })
}