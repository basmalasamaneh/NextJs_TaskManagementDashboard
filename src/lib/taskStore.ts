import { Task, TaskStatus } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { isPast, parseISO } from 'date-fns'
import fs from 'fs'
import path from 'path'

const DATA_DIR  = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'tasks.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readAll(): Record<string, Task[]> {
  ensureDir()
  if (!fs.existsSync(DATA_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, Task[]>) {
  ensureDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

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

export function getTasksByUserId(userId: string): Task[] {
  const all = readAll()
  return (all[userId] ?? []).map(t => ({ ...t, status: resolveStatus(t) }))
}

export function createTask(
  userId: string,
  data: { title: string; description: string; priority: Task['priority']; dueDate: string; status?: TaskStatus }
): Task {
  const all = readAll()
  const now  = new Date().toISOString()
  const task: Task = {
    id: uuidv4(), userId,
    title: data.title, description: data.description,
    priority: data.priority, dueDate: data.dueDate,
    status: data.status ?? 'pending',
    createdAt: now, updatedAt: now,
  }
  all[userId] = [...(all[userId] ?? []), task]
  writeAll(all)
  return { ...task, status: resolveStatus(task) }
}

export function updateTask(
  userId: string, taskId: string,
  data: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>
): Task | null {
  const all   = readAll()
  const tasks = all[userId] ?? []
  const idx   = tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return null
  const updated: Task = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() }
  tasks[idx] = updated
  all[userId] = [...tasks]
  writeAll(all)
  return { ...updated, status: resolveStatus(updated) }
}

export function deleteTask(userId: string, taskId: string): boolean {
  const all   = readAll()
  const tasks = all[userId] ?? []
  const next  = tasks.filter(t => t.id !== taskId)
  if (next.length === tasks.length) return false
  all[userId] = next
  writeAll(all)
  return true
}

export function getTaskStats(userId: string) {
  const tasks        = getTasksByUserId(userId)
  const total        = tasks.length
  const completed    = tasks.filter(t => t.status === 'completed').length
  const overdue      = tasks.filter(t => t.status === 'overdue').length
  const inProgress   = tasks.filter(t => t.status === 'in-progress').length
  const pending      = tasks.filter(t => t.status === 'pending').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, pending, inProgress, overdue, completionRate }
}

export function seedDemoTasks(userId: string) {
  const all = readAll()
  if (all[userId] !== undefined) return   
  all[userId] = []
  writeAll(all)   

  const now    = new Date()
  const future = (d: number) => { const x = new Date(now); x.setDate(x.getDate() + d); return x.toISOString().split('T')[0] }
  const past   = (d: number) => { const x = new Date(now); x.setDate(x.getDate() - d); return x.toISOString().split('T')[0] }

  const seeds: Array<{ title: string; description: string; priority: Task['priority']; dueDate: string; status: TaskStatus }> = [
    { title: 'Design system architecture',    description: 'Create the overall system design document for the new platform.',    priority: 'high',   dueDate: future(5),  status: 'completed'   },
    { title: 'Set up CI/CD pipeline',         description: 'Configure GitHub Actions for automated testing and deployment.',      priority: 'high',   dueDate: future(3),  status: 'in-progress' },
    { title: 'Write API documentation',       description: 'Document all REST API endpoints using OpenAPI/Swagger.',             priority: 'medium', dueDate: future(7),  status: 'pending'     },
    { title: 'Code review for feature branch',description: 'Review the pull request for the new authentication module.',         priority: 'medium', dueDate: past(2),    status: 'pending'     },
    { title: 'Fix production bug #247',        description: 'Resolve the null pointer exception in the payment service.',        priority: 'high',   dueDate: past(1),    status: 'pending'     },
    { title: 'Update dependencies',           description: 'Upgrade all npm packages to latest stable versions.',                priority: 'low',    dueDate: future(14), status: 'pending'     },
    { title: 'Write unit tests',              description: 'Achieve 80% test coverage for the core business logic.',             priority: 'medium', dueDate: future(10), status: 'in-progress' },
    { title: 'Database optimization',         description: 'Add indexes to improve query performance on the reports table.',     priority: 'high',   dueDate: future(2),  status: 'completed'   },
  ]
  seeds.forEach(s => createTask(userId, s))
}
