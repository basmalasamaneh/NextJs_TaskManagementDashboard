import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail } from './userStore'
import { ensureDemoData } from './demoData'

// Best-effort warm-up for environments where module init runs before first request.
ensureDemoData().catch(console.error)

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
          await ensureDemoData()
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
