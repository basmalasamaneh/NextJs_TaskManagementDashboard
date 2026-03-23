import { db } from './db'
import { sql } from 'drizzle-orm'

export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'USER' NOT NULL,
        created_at TEXT NOT NULL
      )
    `)

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        due_date TEXT NOT NULL,
        user_id TEXT NOT NULL,
        assigned_user_id TEXT,
        assigned_user_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (assigned_user_id) REFERENCES users(id)
      )
    `)

    // Migration-safe patch for existing databases created before assigned_user_id existed.
    try {
      await db.run(sql`ALTER TABLE tasks ADD COLUMN assigned_user_id TEXT`)
    } catch {
      // Column already exists; ignore.
    }

    try {
      await db.run(sql`ALTER TABLE tasks ADD COLUMN assigned_user_name TEXT`)
    } catch {
      // Column already exists; ignore.
    }

    // Backfill assignee text for old rows.
    await db.run(sql`UPDATE tasks SET assigned_user_name = 'Unassigned' WHERE assigned_user_name IS NULL`)

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        task_id TEXT,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        details TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      )
    `)

    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}