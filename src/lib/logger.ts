import { db } from "./db"
import { activityLogs } from "./schema"
import { v4 as uuidv4 } from "uuid"

export async function logAction({ userId, taskId, action, details }: { userId: string; taskId?: string; action: string; details?: string }) {
  await db.insert(activityLogs).values({
    id: uuidv4(),
    userId,
    taskId: taskId || null,
    action,
    timestamp: new Date().toISOString(),
    details: details || null,
  })
}