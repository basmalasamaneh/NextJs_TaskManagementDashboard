import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { updateTask, deleteTask, getTaskById } from '@/lib/taskStore'
import { addActivity } from '@/lib/activityStore'
import { canEditTask, canDeleteTask, canUpdateTaskStatus } from '@/lib/rbac'

// ── PUT /api/tasks/:id ────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user    = session.user as any
    const userId  = user.id   as string
    const userRole = (user.role as string) as any
    const isAdmin = userRole === 'admin'
    const body    = await req.json()

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'Request body is empty' }, { status: 400 })
    }

    // Get the task first to check ownership
    const task = await getTaskById(params.id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // RBAC: Check if user can edit this task
    if (!canEditTask(userRole as any, task.userId, userId)) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this task' },
        { status: 403 }
      )
    }

    // RBAC: Users can only update status, admins can update any field
    if (!isAdmin && body.title) {
      return NextResponse.json(
        { error: 'You can only update the task status' },
        { status: 403 }
      )
    }

    const updatedTask = await updateTask(userId, params.id, body, isAdmin)
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Activity log
    try {
      const changes: string[] = []
      const compare = (label: string, before: any, after: any) => {
        if (after !== undefined && after !== before) {
          changes.push(`${label}: ${before ?? '—'} → ${after}`)
        }
      }

      compare('Title', task.title, body.title)
      compare('Description', task.description, body.description)
      compare('Priority', task.priority, body.priority)
      compare('Assigned to', task.assignedUserId ?? task.assignedUser, body.assignedUserId ?? body.assignedUser)
      compare('Due date', task.dueDate, body.dueDate)
      compare('Status', task.status, body.status)

      const details = changes.length > 0 ? changes.join('; ') : undefined

      if (body.status && body.status !== task.status) {
        await addActivity(
          userId,
          user.name as string,
          'status_changed',
          task.id,
          task.title,
          details ?? `Status changed from ${task.status} to ${body.status}`
        )
      } else {
        await addActivity(userId, user.name as string, 'task_updated', task.id, task.title, details)
      }
    } catch (err) {
      console.warn('[PUT /api/tasks/:id] Activity logging failed', err)
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('[PUT /api/tasks/:id]', error)
    if (error instanceof Error && error.message.includes('Assigned user')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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
    const userRole = (user.role as string) as any
    const isAdmin = userRole === 'admin'

    // Get the task first to check ownership
    const task = await getTaskById(params.id)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // RBAC: Check if user can delete this task
    if (!canDeleteTask(userRole as any, task.userId, userId)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this task' },
        { status: 403 }
      )
    }

    // Activity log
    try {
      await addActivity(
        userId,
        user.name as string,
        'task_deleted',
        task.id,
        task.title,
        `Status: ${task.status}; Priority: ${task.priority}; Due: ${task.dueDate}; Assigned: ${task.assignedUser}`
      )
    } catch (err) {
      console.warn('[DELETE /api/tasks/:id] Activity logging failed', err)
    }

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
