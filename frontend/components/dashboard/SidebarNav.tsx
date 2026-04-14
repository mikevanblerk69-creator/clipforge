'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Tv,
  Image,
  Mic,
  Scissors,
  History,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio/text2video', label: 'Text to Video', icon: Tv },
  { href: '/studio/image2video', label: 'Image to Video', icon: Image },
  { href: '/studio/lipsync', label: 'Lip Sync', icon: Mic },
  { href: '/studio/editor', label: 'Editor', icon: Scissors, badge: 'Beta' },
  { href: '/history', label: 'History', icon: History },
]

interface SidebarNavProps {
  className?: string
}

export function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'relative flex flex-col bg-surface border-r border-border h-full py-4 overflow-hidden flex-shrink-0',
        className
      )}
    >
      {/* Logo area */}
      <div className={cn('px-4 mb-6 flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange to-cyan flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="font-display text-xl tracking-wider text-gradient whitespace-nowrap"
            >
              ClipForge
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-orange/10 text-orange'
                  : 'text-muted hover:text-foreground hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-orange"
                />
              )}

              <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive ? 'text-orange' : '')} />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium whitespace-nowrap flex items-center gap-2"
                  >
                    {label}
                    {badge && (
                      <span className="text-[9px] font-bold bg-cyan/20 text-cyan px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Collapsed tooltip badge */}
              {collapsed && badge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 mt-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-muted hover:text-foreground hover:bg-white/5 transition-all duration-200 text-sm',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
