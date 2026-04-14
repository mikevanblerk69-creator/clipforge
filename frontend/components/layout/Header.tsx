'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { CreditBadge } from '@/components/studio/CreditBadge'

interface HeaderProps {
  token?: string | null
  userEmail?: string | null
  creditBalance?: number
}

const navLinks = [
  { href: '/studio/text2video', label: 'Studio' },
  { href: '/history', label: 'History' },
  { href: '/pricing', label: 'Pricing' },
]

export function Header({ token, userEmail, creditBalance = 0 }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'CF'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-cyan flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-2xl tracking-wider text-gradient">
              ClipForge
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname?.startsWith(link.href)
                    ? 'text-orange bg-orange/10'
                    : 'text-muted hover:text-foreground hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <>
                <CreditBadge balance={creditBalance} />

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border hover:border-orange/30 transition-all duration-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange to-cyan flex items-center justify-center text-xs font-bold text-white">
                      {initials}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-card overflow-hidden z-50"
                        onMouseLeave={() => setDropdownOpen(false)}
                      >
                        <div className="px-4 py-3 border-b border-border">
                          <p className="text-xs text-muted">Signed in as</p>
                          <p className="text-sm font-medium truncate">{userEmail}</p>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-white/5 transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <User className="w-4 h-4" />
                            Dashboard
                          </Link>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:text-foreground hover:bg-white/5 transition-colors"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>
                          <hr className="border-border my-1" />
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 text-sm font-semibold bg-orange hover:bg-orange-dark text-white rounded-lg transition-all duration-200 glow-orange"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-black/95 backdrop-blur-md border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname?.startsWith(link.href)
                      ? 'text-orange bg-orange/10'
                      : 'text-muted hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <hr className="border-border my-2" />

              {token ? (
                <div className="space-y-1">
                  <div className="px-4 py-2">
                    <CreditBadge balance={creditBalance} />
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-4 pb-2">
                  <Link
                    href="/auth/login"
                    className="text-center px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:border-orange/30 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-center px-4 py-2.5 text-sm font-semibold bg-orange hover:bg-orange-dark text-white rounded-lg transition-colors"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
