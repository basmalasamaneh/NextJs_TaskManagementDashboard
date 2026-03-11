import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { updateTask, deleteTask } from '@/lib/taskStore'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user    = session.user as any
  const userId  = user.id   as string
  const isAdmin = user.role === 'admin'
  const body    = await req.json()
  const task    = updateTask(userId, params.id, body, isAdmin)

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user    = session.user as any
  const userId  = user.id   as string
  const isAdmin = user.role === 'admin'
  const ok      = deleteTask(userId, params.id, isAdmin)

  if (!ok) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
