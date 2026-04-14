'use client'

import { motion } from 'framer-motion'
import { Film, Zap, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
  totalVideos: number
  creditsUsed: number
  creditsRemaining: number
  hoursGenerated: number
}

interface StatsStripProps {
  stats: Stats
  isLoading?: boolean
  className?: string
}

const STAT_CONFIG = [
  {
    key: 'totalVideos' as const,
    label: 'Total Videos',
    icon: Film,
    color: 'text-orange',
    bg: 'bg-orange/8 border-orange/15',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'creditsUsed' as const,
    label: 'Credits Used',
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/8 border-yellow-500/15',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'creditsRemaining' as const,
    label: 'Credits Left',
    icon: TrendingUp,
    color: 'text-cyan',
    bg: 'bg-cyan/8 border-cyan/15',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'hoursGenerated' as const,
    label: 'Minutes Generated',
    icon: Clock,
    color: 'text-green-400',
    bg: 'bg-green-500/8 border-green-500/15',
    format: (v: number) => v.toFixed(1) + 'm',
  },
]

function StatSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg shimmer" />
        <div className="h-3 w-16 rounded shimmer" />
      </div>
      <div className="h-7 w-20 rounded shimmer mb-1" />
      <div className="h-3 w-24 rounded shimmer" />
    </div>
  )
}

export function StatsStrip({ stats, isLoading, className }: StatsStripProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
        {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {STAT_CONFIG.map(({ key, label, icon: Icon, color, bg, format }, index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.07 }}
          className={cn(
            'p-4 rounded-xl border glass transition-all duration-200 hover:scale-[1.02] hover:shadow-card',
            bg
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-black/20', color)}>
              <Icon className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className={cn('text-2xl font-bold mb-0.5', color)}>
            {format(stats[key])}
          </div>
          <div className="text-xs text-muted font-medium">{label}</div>
        </motion.div>
      ))}
    </div>
  )
}
