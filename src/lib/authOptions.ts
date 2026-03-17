import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail, createUser } from './userStore'

const DEMO_USERS = [
  { id: 'user-1', name: 'Admin User',      email: 'admin@gmail.com',   password: 'admin123',   role: 'admin' },
  { id: 'user-2', name: 'Basmala Samaneh', email: 'basmala@gmail.com', password: 'basmala123', role: 'user'  },
]

async function initializeDemoUsers() {
  for (const demo of DEMO_USERS) {
    const existing = await getUserByEmail(demo.email)
    if (!existing) {
      await createUser({
        id:           demo.id,
        name:         demo.name,
        email:        demo.email,
        passwordHash: bcrypt.hashSync(demo.password, 10),
        role:         demo.role as 'admin' | 'user',
      })
    }
  }
}

// Initialize demo users whenever this module is loaded (every cold-start).
initializeDemoUsers().catch(console.error)

export const SESSION_MAX_AGE = 10 * 60  // 10 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const user = await getUserByEmail(credentials.email.toLowerCase())
          if (!user) return null
          const ok = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!ok) return null
          return { id: user.id, name: user.name, email: user.email, role: user.role }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id
        token.role      = (user as any).role
        token.loginTime = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id        = token.id as string
        ;(session.user as any).role      = token.role as string
        ;(session.user as any).loginTime = token.loginTime as number
      }
      return session
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
