import bcrypt from 'bcryptjs'
import { db } from './db'
import { tasks, users } from './schema'

type DemoUser = {
  id: string
  name: string
  email: string
  password: string
  role: 'admin' | 'user'
}

const DEMO_USERS: DemoUser[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@gmail.com', password: 'admin123', role: 'admin' },
  { id: 'user-2', name: 'Basmala Samaneh', email: 'basmala@gmail.com', password: 'basmala123', role: 'user' },
]

const DEMO_TASKS = [
  {
    id: 'task-demo-1',
    title: 'Review sprint board',
    description: 'Check all open tasks and confirm priorities for this week.',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2026-03-20',
    userId: 'user-1',
    assignedUserId: 'user-2',
    assignedUserName: 'Basmala Samaneh',
  },
  {
    id: 'task-demo-2',
    title: 'Prepare deployment checklist',
    description: 'Document env vars, rollback steps, and smoke tests.',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-03-22',
    userId: 'user-2',
    assignedUserId: 'user-2',
    assignedUserName: 'Basmala Samaneh',
  },
]

let demoDataPromise: Promise<void> | null = null

async function seedDemoData(): Promise<void> {
  const now = new Date().toISOString()

  for (const u of DEMO_USERS) {
    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: bcrypt.hashSync(u.password, 10),
        role: u.role,
        createdAt: now,
      })
      .onConflictDoNothing({ target: users.email })
  }

  for (const t of DEMO_TASKS) {
    await db
      .insert(tasks)
      .values({
        ...t,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: tasks.id })
  }
}

export function ensureDemoData(): Promise<void> {
  if (!demoDataPromise) {
    demoDataPromise = seedDemoData().catch((error) => {
      demoDataPromise = null
      throw error
    })
  }

  return demoDataPromise
}
