import { db } from './db'
import { users } from './schema'
import { eq } from 'drizzle-orm'

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'admin' | 'user'
  createdAt: string
}

export interface PublicUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (result.length === 0) return null
    const u = result[0]
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role as 'admin' | 'user',
      createdAt: u.createdAt,
    }
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    throw new Error('Failed to fetch user')
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (result.length === 0) return null
    const u = result[0]
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role as 'admin' | 'user',
      createdAt: u.createdAt,
    }
  } catch (error) {
    console.error('Error fetching user by email:', error)
    throw new Error('Failed to fetch user')
  }
}

export async function getUserByName(name: string): Promise<User | null> {
  try {
    const normalized = name.trim().toLowerCase()
    if (!normalized) return null
    const result = await db.select().from(users)
    const match = result.find(u => u.name.toLowerCase() === normalized)
    if (!match) return null
    return {
      id: match.id,
      name: match.name,
      email: match.email,
      passwordHash: match.passwordHash,
      role: match.role as 'admin' | 'user',
      createdAt: match.createdAt,
    }
  } catch (error) {
    console.error('Error fetching user by name:', error)
    throw new Error('Failed to fetch user')
  }
}

export async function createUser(data: { id: string; name: string; email: string; passwordHash: string; role?: 'admin' | 'user' }): Promise<User> {
  try {
    const now = new Date().toISOString()
    const newUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role || 'user',
      createdAt: now,
    }

    await db.insert(users).values(newUser).onConflictDoNothing({ target: users.email })
    const persisted = await getUserByEmail(data.email)
    if (!persisted) {
      throw new Error('Failed to create user')
    }
    return persisted
  } catch (error) {
    console.error('Error creating user:', error)
    throw new Error('Failed to create user')
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const result = await db.select().from(users)
    return result.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role as 'admin' | 'user',
      createdAt: u.createdAt,
    }))
  } catch (error) {
    console.error('Error fetching all users:', error)
    throw new Error('Failed to fetch users')
  }
}

export async function getAllPublicUsers(): Promise<PublicUser[]> {
  const list = await getAllUsers()
  return list.map(({ id, name, email, role }) => ({ id, name, email, role }))
}