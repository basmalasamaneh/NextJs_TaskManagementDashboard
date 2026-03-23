'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Activity, CheckSquare, LayoutDashboard, ListTodo,
  LogOut, Menu, X, ChevronDown, Loader2,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'

const navLinks = [
  { href: '/dashboard',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tasks',   label: 'Tasks',     icon: ListTodo },
  { href: '/dashboard/activity', label: 'Activity',  icon: Activity },
]

export function Navbar() {
  const pathname          = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [signingOut, setSigningOut]   = useState(false)

  const user     = session?.user
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const handleSignOut = async () => {
    setSigningOut(true)
    setUserMenuOpen(false)
    setMobileOpen(false)
    await new Promise(r => setTimeout(r, 600))   
    signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="bg-green-800 text-white shadow-lg sticky top-0 z-50">
      {/* Signing-out bar */}
      {signingOut && (
        <div className="absolute inset-0 bg-green-900/80 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing out…
          </div>
        </div>
      )}

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">TaskBoard</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-700 hover:text-white'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationBell />

            <div className="relative">
            <button onClick={() => setUserMenuOpen(v => !v)} disabled={signingOut}
              className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-green-700 transition-colors">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium leading-none">{user?.name ?? 'User'}</p>
                <p className="text-xs text-green-300 mt-0.5 max-w-[140px] truncate">{user?.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-green-300" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" />Sign out
                  </button>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-1">
            <NotificationBell />
            <button onClick={() => setMobileOpen(v => !v)} disabled={signingOut}
              className="p-2 rounded-lg hover:bg-green-700 transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-green-700 mt-2 pt-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href ? 'bg-green-700 text-white' : 'text-green-100 hover:bg-green-700'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            <div className="border-t border-green-700 pt-3 mt-3">
              <div className="flex items-center gap-3 px-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-green-300 truncate max-w-[180px]">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleSignOut} disabled={signingOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-green-700 transition-colors disabled:opacity-50">
                {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
