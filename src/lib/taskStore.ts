import { Task, TaskStatus } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { isPast, parseISO } from 'date-fns'
import { db } from './db'
import { activityLogs, notifications, tasks } from './schema'
import { eq, desc } from 'drizzle-orm'
import { getAllUsers, getUserByName } from './userStore'

function resolveStatus(task: Task): TaskStatus {
  if (task.status === 'completed')   return 'completed'
  if (task.status === 'in-progress') return 'in-progress'
  if (
    task.status === 'pending' &&
    task.dueDate &&
    isPast(parseISO(task.dueDate + 'T23:59:59'))
  ) return 'overdue'
  return task.status
}

async function toTaskView(rows: Array<typeof tasks.$inferSelect>): Promise<Task[]> {
  const userList = await getAllUsers()
  const userMap = new Map(userList.map(u => [u.id, u.name]))

  return rows.map(row => {
    const assignedUserId = row.assignedUserId ?? undefined
    const assignedUser = row.assignedUserName ?? (assignedUserId ? (userMap.get(assignedUserId) ?? 'Unknown User') : 'Unassigned')
    const createdBy = userMap.get(row.userId) ?? 'Unknown User'
    const view: Task = {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      priority: row.priority as Task['priority'],
      dueDate: row.dueDate,
      createdBy,
      assignedUserId,
      assignedUser,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userId: row.userId,
    }
    return { ...view, status: resolveStatus(view) }
  })
}

export async function getTasksByUserId(userId: string): Promise<Task[]> {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt))
    return await toTaskView(result)
  } catch (error) {
    console.error('Error fetching tasks by user ID:', error)
    throw new Error('Failed to fetch tasks')
  }
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const result = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (result.length === 0) return null
    const mapped = await toTaskView(result)
    return mapped[0] ?? null
  } catch (error) {
    console.error('Error fetching task by ID:', error)
    throw new Error('Failed to fetch task')
  }
}

export async function getAllTasks(): Promise<Task[]> {
  try {
    const result = await db.select().from(tasks).orderBy(desc(tasks.createdAt))
    return await toTaskView(result)
  } catch (error) {
    console.error('Error fetching all tasks:', error)
    throw new Error('Failed to fetch tasks')
  }
}

export async function getTaskStats(userId: string, isAdmin: boolean) {
  try {
    const taskList = isAdmin ? await getAllTasks() : await getTasksByUserId(userId)
    const total = taskList.length
    const completed = taskList.filter(t => t.status === 'completed').length
    const overdue = taskList.filter(t => t.status === 'overdue').length
    const inProgress = taskList.filter(t => t.status === 'in-progress').length
    const pending = taskList.filter(t => t.status === 'pending').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, pending, inProgress, overdue, completionRate }
  } catch (error) {
    console.error('Error calculating task stats:', error)
    throw new Error('Failed to calculate task statistics')
  }
}

export async function createTask(
  userId: string,
  data: {
    title: string; description: string
    priority: Task['priority']; dueDate: string
    assignedUserId?: string; assignedUser?: string; status?: TaskStatus
  }
): Promise<Task> {
  try {
    const now = new Date().toISOString()
    const taskId = uuidv4()
    const assignedUserName = data.assignedUser?.trim() ?? ''
    if (assignedUserName.length <= 3) {
      throw new Error('Assigned user must be more than 3 characters')
    }

    const maybeMatchedUser = await getUserByName(assignedUserName)
    const resolvedAssignedUserId = maybeMatchedUser?.id ?? data.assignedUserId

    const newTask = {
      id: taskId,
      title: data.title,
      description: data.description,
      status: data.status ?? 'pending',
      priority: data.priority,
      dueDate: data.dueDate,
      userId: userId,
      assignedUserId: resolvedAssignedUserId,
      assignedUserName,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(tasks).values(newTask)
    const createdTask = await getTaskById(taskId)
    if (!createdTask) {
      throw new Error('Failed to create task')
    }
    return createdTask
  } catch (error) {
    console.error('Error creating task:', error)
    throw new Error('Failed to create task')
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>> & { assignedUserId?: string; assignedUser?: string },
  isAdmin = false
): Promise<Task | null> {
  try {
    // First check if task exists and user has permission
    const existingTask = await getTaskById(taskId)
    if (!existingTask) return null
    if (!isAdmin && existingTask.userId !== userId) return null

    const updateData: Partial<typeof tasks.$inferInsert> = {}
    if (data.title) updateData.title = data.title
    if (data.description) updateData.description = data.description
    if (data.status) updateData.status = data.status
    if (data.priority) updateData.priority = data.priority
    if (data.dueDate) updateData.dueDate = data.dueDate
    if (data.assignedUser?.trim() !== undefined) {
      const assignedUserName = data.assignedUser?.trim() ?? ''
      if (assignedUserName.length > 0 && assignedUserName.length <= 3) {
        throw new Error('Assigned user must be more than 3 characters')
      }
      if (assignedUserName.length > 3) {
        updateData.assignedUserName = assignedUserName
        const maybeUser = await getUserByName(assignedUserName)
        updateData.assignedUserId = maybeUser?.id ?? null
      }
    } else if (data.assignedUserId) {
      updateData.assignedUserId = data.assignedUserId
    }
    updateData.updatedAt = new Date().toISOString()

    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId))

    // Fetch updated task
    const updatedTask = await getTaskById(taskId)
    return updatedTask
  } catch (error) {
    console.error('Error updating task:', error)
    throw new Error('Failed to update task')
  }
}

export async function deleteTask(userId: string, taskId: string, isAdmin = false): Promise<boolean> {
  try {
    // First check if task exists and user has permission
    const existingTask = await getTaskById(taskId)
    if (!existingTask) return false
    if (!isAdmin && existingTask.userId !== userId) return false

    // Keep historical logs but detach them from the task to satisfy FK constraints.
    await db.update(activityLogs).set({ taskId: null }).where(eq(activityLogs.taskId, taskId))
    // Keep notification history but detach task reference to satisfy FK constraints.
    await db.update(notifications).set({ taskId: null }).where(eq(notifications.taskId, taskId))
    await db.delete(tasks).where(eq(tasks.id, taskId))
    return true
  } catch (error) {
    console.error('Error deleting task:', error)
    throw new Error('Failed to delete task')
  }
}
