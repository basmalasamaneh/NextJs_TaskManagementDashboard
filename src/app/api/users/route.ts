import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getAllPublicUsers } from '@/lib/userStore'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await getAllPublicUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error('[GET /api/users]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
