export type TaskStatus   = 'pending' | 'in-progress' | 'completed' | 'overdue'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id:           string
  title:        string
  description:  string
  status:       TaskStatus
  priority:     TaskPriority
  dueDate:      string
  createdBy?:   string
  assignedUserId?: string
  assignedUser: string        
  createdAt:    string
  updatedAt:    string
  userId:       string
}

export interface TaskStats {
  total:          number
  completed:      number
  pending:        number
  inProgress:     number
  overdue:        number
  completionRate: number
}

export type ActivityAction = 'task_created' | 'task_updated' | 'task_deleted' | 'status_changed'

export interface ActivityLog {
  id:        string
  userId:    string
  userName:  string
  action:    ActivityAction
  timestamp: string
  taskId?:   string
  taskTitle?: string
  details?:  string
}

export interface CreateTaskInput {
  title:        string
  description:  string
  priority:     TaskPriority
  dueDate:      string
  assignedUserId?: string
  assignedUser: string
  status?:      TaskStatus
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus
}

export type NotificationType = 'task_assigned' | 'task_status_updated' | 'task_updated' | 'task_deleted'

export interface AppNotification {
  id: string
  userId: string
  actorUserId: string
  type: NotificationType
  message: string
  relatedUser: string
  timestamp: string
  taskId?: string
  isRead: boolean
}
