import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { updateTask, deleteTask } from '@/lib/taskStore'

// ── PUT /api/tasks/:id ────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user    = session.user as any
    const userId  = user.id   as string
    const isAdmin = user.role === 'admin'
    const body    = await req.json()

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
    }

    const task = await updateTask(userId, params.id, body, isAdmin)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('[PUT /api/tasks/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── PATCH /api/tasks/:id (kept for backward compatibility) ────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return PUT(req, { params })
}

// ── DELETE /api/tasks/:id ─────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user    = session.user as any
    const userId  = user.id   as string
    const isAdmin = user.role === 'admin'

    const ok = await deleteTask(userId, params.id, isAdmin)
    if (!ok) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Task deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/tasks/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
