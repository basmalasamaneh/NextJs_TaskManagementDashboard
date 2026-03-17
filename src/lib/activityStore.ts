import { v4 as uuidv4 } from 'uuid'
import { db } from './db'
import { activityLogs, users, tasks } from './schema'
import { ActivityLog, ActivityAction } from '@/types'
import { eq, desc, and, gte, lte, like, or, isNull } from 'drizzle-orm'

export async function getActivitiesByUserId(userId: string): Promise<ActivityLog[]> {
  try {
    const result = await db.select({
      log: activityLogs,
      userName: users.name,
      taskTitle: tasks.title,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(tasks, eq(activityLogs.taskId, tasks.id))
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.timestamp))

    return result.map(row => ({
      id: row.log.id,
      userId: row.log.userId,
      userName: row.userName || 'Unknown User',
      action: row.log.action as ActivityAction,
      timestamp: row.log.timestamp,
      taskId: row.log.taskId || undefined,
      taskTitle: row.taskTitle || undefined,
      details: row.log.details || undefined,
    }))
  } catch (error) {
    console.error('Error fetching activities by user ID:', error)
    throw new Error('Failed to fetch activities')
  }
}

export async function getAllActivities(filters?: {
  action?: ActivityAction
  userId?: string
  taskId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}): Promise<{ logs: ActivityLog[], total: number }> {
  try {
    let whereConditions = []

    if (filters?.action) {
      whereConditions.push(eq(activityLogs.action, filters.action))
    }
    if (filters?.userId) {
      whereConditions.push(eq(activityLogs.userId, filters.userId))
    }
    if (filters?.taskId) {
      whereConditions.push(eq(activityLogs.taskId, filters.taskId))
    }
    if (filters?.dateFrom) {
      whereConditions.push(gte(activityLogs.timestamp, filters.dateFrom))
    }
    if (filters?.dateTo) {
      whereConditions.push(lte(activityLogs.timestamp, filters.dateTo))
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const totalResult = await db.$count(activityLogs, whereClause)
    const total = totalResult

    // Get paginated results with joins
    const limit = filters?.limit || 20
    const offset = filters?.offset || 0

    const result = await db.select({
      log: activityLogs,
      userName: users.name,
      taskTitle: tasks.title,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(tasks, eq(activityLogs.taskId, tasks.id))
    .where(whereClause)
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit)
    .offset(offset)

    const logs = result.map(row => ({
      id: row.log.id,
      userId: row.log.userId,
      userName: row.userName || 'Unknown User',
      action: row.log.action as ActivityAction,
      timestamp: row.log.timestamp,
      taskId: row.log.taskId || undefined,
      taskTitle: row.taskTitle || undefined,
      details: row.log.details || undefined,
    }))

    return { logs, total }
  } catch (error) {
    console.error('Error fetching all activities:', error)
    throw new Error('Failed to fetch activities')
  }
}

export async function addActivity(
  userId: string,
  userName: string,
  action: ActivityAction,
  taskId?: string,
  taskTitle?: string,
  details?: string,
): Promise<ActivityLog> {
  try {
    const now = new Date().toISOString()
    const logId = uuidv4()
    const newLog = {
      id: logId,
      userId,
      taskId: taskId || null,
      action,
      timestamp: now,
      details: details || null,
    }

    await db.insert(activityLogs).values(newLog)

    return {
      id: logId,
      userId,
      userName,
      action,
      timestamp: now,
      taskId,
      taskTitle,
      details,
    }
  } catch (error) {
    console.error('Error adding activity:', error)
    throw new Error('Failed to add activity')
  }
}
