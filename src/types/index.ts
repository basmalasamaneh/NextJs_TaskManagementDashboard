export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface TaskStats {
  total: number
  completed: number
  pending: number
  inProgress: number
  overdue: number
  completionRate: number
}

export interface CreateTaskInput {
  title: string
  description: string
  priority: TaskPriority
  dueDate: string
  status?: TaskStatus
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus
}
