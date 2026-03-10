'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, CheckSquare, AlertCircle, Loader2, LogIn } from 'lucide-react'

const STEPS = ['Verifying credentials…', 'Starting session…', 'Redirecting…']

export default function LoginPage() {
  const router        = useRouter()
  const { status }    = useSession()
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [error,       setError]       = useState('')
  const [step,        setStep]        = useState(-1)   

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    setStep(0)
    await new Promise(r => setTimeout(r, 500))

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result?.error) {
      setStep(-1)
      setError('Invalid email or password. Please try again.')
      return
    }

    // Starting session
    setStep(1)
    await new Promise(r => setTimeout(r, 400))

    // Redirecting
    setStep(2)
    await new Promise(r => setTimeout(r, 300))

    router.replace('/dashboard')
  }

  const isLoading = step >= 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-100 rounded-full opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-50 rounded-full opacity-80" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl mb-4 shadow-lg">
            <CheckSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TaskBoard</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="form-input" placeholder="you@example.com"
                required autoComplete="email" disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pr-10" placeholder="Enter your password"
                  required autoComplete="current-password" disabled={isLoading}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {STEPS[step]}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-5 card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Demo Accounts — click to fill
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'Admin', email: 'admin@gmail.com', password: 'admin123' },
              { role: 'User',  email: 'basmala@gmail.com',  password: 'basmala123' },
            ].map(u => (
              <button key={u.email} type="button" disabled={isLoading}
                onClick={() => { setEmail(u.email); setPassword(u.password); setError('') }}
                className="text-left p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors disabled:opacity-50">
                <p className="text-xs font-semibold text-green-700">{u.role}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                <p className="text-xs text-gray-400">{u.password}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
