import { v4 as uuidv4 } from 'uuid'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { notifications } from './schema'
import { AppNotification, NotificationType } from '@/types'

type NewNotificationInput = {
  userId: string
  actorUserId: string
  type: NotificationType
  message: string
  relatedUser: string
  taskId?: string
}

function mapRow(row: typeof notifications.$inferSelect): AppNotification {
  return {
    id: row.id,
    userId: row.userId,
    actorUserId: row.actorUserId,
    type: row.type as NotificationType,
    message: row.message,
    relatedUser: row.relatedUser,
    timestamp: row.timestamp,
    taskId: row.taskId ?? undefined,
    isRead: row.isRead === '1',
  }
}

export async function createNotification(input: NewNotificationInput): Promise<AppNotification> {
  const row: typeof notifications.$inferInsert = {
    id: uuidv4(),
    userId: input.userId,
    actorUserId: input.actorUserId,
    taskId: input.taskId ?? null,
    type: input.type,
    message: input.message,
    relatedUser: input.relatedUser,
    timestamp: new Date().toISOString(),
    isRead: '0',
  }

  await db.insert(notifications).values(row)
  return mapRow(row as typeof notifications.$inferSelect)
}

export async function getNotificationsByUserId(userId: string, limit = 20): Promise<AppNotification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.timestamp))
    .limit(limit)

  return rows.map(mapRow)
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, '0')))

  return Number(result[0]?.count ?? 0)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: '1' })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, '0')))
}
