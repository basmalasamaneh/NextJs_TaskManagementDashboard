import { Task, TaskStatus } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { isPast, parseISO } from 'date-fns'
import { storageGet, storageSet, storageKeys } from './storage'

const key = (userId: string) => `tasks:${userId}`

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

async function readUserTasks(userId: string): Promise<Task[]> {
  return (await storageGet(key(userId))) ?? []
}

async function writeUserTasks(userId: string, tasks: Task[]): Promise<void> {
  await storageSet(key(userId), tasks)
}

export async function getTasksByUserId(userId: string): Promise<Task[]> {
  const tasks = await readUserTasks(userId)
  return tasks.map(t => ({ ...t, status: resolveStatus(t) }))
}

export async function getAllTasks(): Promise<Task[]> {
  const keys = await storageKeys('tasks:*')
  const all: Task[] = []
  for (const k of keys) {
    const tasks: Task[] = (await storageGet(k)) ?? []
    all.push(...tasks.map(t => ({ ...t, status: resolveStatus(t) })))
  }
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getTaskStats(userId: string, isAdmin: boolean) {
  const tasks        = isAdmin ? await getAllTasks() : await getTasksByUserId(userId)
  const total        = tasks.length
  const completed    = tasks.filter(t => t.status === 'completed').length
  const overdue      = tasks.filter(t => t.status === 'overdue').length
  const inProgress   = tasks.filter(t => t.status === 'in-progress').length
  const pending      = tasks.filter(t => t.status === 'pending').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, pending, inProgress, overdue, completionRate }
}

export async function createTask(
  userId: string,
  data: {
    title: string; description: string
    priority: Task['priority']; dueDate: string
    assignedUser: string; status?: TaskStatus
  }
): Promise<Task> {
  const tasks = await readUserTasks(userId)
  const now   = new Date().toISOString()
  const task: Task = {
    id: uuidv4(), userId,
    title:        data.title,
    description:  data.description,
    priority:     data.priority,
    dueDate:      data.dueDate,
    assignedUser: data.assignedUser,
    status:       data.status ?? 'pending',
    createdAt:    now,
    updatedAt:    now,
  }
  await writeUserTasks(userId, [...tasks, task])
  return { ...task, status: resolveStatus(task) }
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>,
  isAdmin = false
): Promise<Task | null> {
  if (isAdmin) {
    const allKeys = await storageKeys('tasks:*')
    for (const k of allKeys) {
      const tasks: Task[] = (await storageGet(k)) ?? []
      const idx = tasks.findIndex(t => t.id === taskId)
      if (idx !== -1) {
        const updated: Task = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() }
        tasks[idx] = updated
        await storageSet(k, tasks)
        return { ...updated, status: resolveStatus(updated) }
      }
    }
    return null
  }

  const tasks = await readUserTasks(userId)
  const idx   = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return null
  const updated: Task = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() }
  tasks[idx] = updated
  await writeUserTasks(userId, tasks)
  return { ...updated, status: resolveStatus(updated) }
}

export async function deleteTask(
  userId: string,
  taskId: string,
  isAdmin = false
): Promise<boolean> {
  if (isAdmin) {
    const allKeys = await storageKeys('tasks:*')
    for (const k of allKeys) {
      const tasks: Task[] = (await storageGet(k)) ?? []
      const next = tasks.filter(t => t.id !== taskId)
      if (next.length < tasks.length) { await storageSet(k, next); return true }
    }
    return false
  }

  const tasks = await readUserTasks(userId)
  const next  = tasks.filter(t => t.id !== taskId)
  if (next.length === tasks.length) return false
  await writeUserTasks(userId, next)
  return true
}

export async function seedDemoTasks(userId: string, userName: string): Promise<void> {
  const existing = await storageGet(key(userId))
  if (existing !== null) return

  await writeUserTasks(userId, [])

  const now    = new Date()
  const future = (d: number) => { const x = new Date(now); x.setDate(x.getDate() + d); return x.toISOString().split('T')[0] }
  const past   = (d: number) => { const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString().split('T')[0] }

  type Seed = { title: string; description: string; priority: Task['priority']; dueDate: string; status: TaskStatus }
  const seeds: Seed[] = [
    { title: 'Design system architecture',     description: 'Create the overall system design document for the new platform.',   priority: 'high',   dueDate: future(5),  status: 'completed'   },
    { title: 'Set up CI/CD pipeline',          description: 'Configure GitHub Actions for automated testing and deployment.',     priority: 'high',   dueDate: future(3),  status: 'in-progress' },
    { title: 'Write API documentation',        description: 'Document all REST API endpoints using OpenAPI/Swagger.',            priority: 'medium', dueDate: future(7),  status: 'pending'     },
    { title: 'Code review for feature branch', description: 'Review the pull request for the new authentication module.',        priority: 'medium', dueDate: past(2),    status: 'pending'     },
    { title: 'Fix production bug #247',        description: 'Resolve the null pointer exception in the payment service.',        priority: 'high',   dueDate: past(1),    status: 'pending'     },
    { title: 'Update dependencies',            description: 'Upgrade all npm packages to latest stable versions.',               priority: 'low',    dueDate: future(14), status: 'pending'     },
    { title: 'Write unit tests',               description: 'Achieve 80% test coverage for the core business logic.',            priority: 'medium', dueDate: future(10), status: 'in-progress' },
    { title: 'Database optimization',          description: 'Add indexes to improve query performance on the reports table.',    priority: 'high',   dueDate: future(2),  status: 'completed'   },
  ]
  for (const s of seeds) {
    await createTask(userId, { ...s, assignedUser: userName })
  }
}
