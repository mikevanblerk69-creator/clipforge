'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Tv,
  Image,
  Mic,
  Scissors,
  ArrowRight,
  Zap,
  TrendingUp,
  FlaskConical,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { StatsStrip } from '@/components/dashboard/StatsStrip'
import { VideoGrid } from '@/components/dashboard/VideoGrid'
import { useVideoHistory } from '@/hooks/useVideoHistory'
import { useCredits } from '@/hooks/useCredits'
import { api } from '@/lib/api'

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

interface DashboardClientProps {
  userEmail: string
  accessToken: string
  userId: string
}

const QUICK_ACTIONS = [
  {
    href: '/studio/text2video',
    icon: Tv,
    label: 'Text to Video',
    description: 'Turn your words into cinematic clips',
    color: 'from-orange/20 to-orange/5 border-orange/20 hover:border-orange/40',
    iconColor: 'text-orange',
    credits: 10,
  },
  {
    href: '/studio/image2video',
    icon: Image,
    label: 'Image to Video',
    description: 'Animate any still image',
    color: 'from-cyan/20 to-cyan/5 border-cyan/20 hover:border-cyan/40',
    iconColor: 'text-cyan',
    credits: 15,
  },
  {
    href: '/studio/lipsync',
    icon: Mic,
    label: 'Lip Sync',
    description: 'Sync audio to any face',
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40',
    iconColor: 'text-purple-400',
    credits: 20,
  },
  {
    href: '/studio/editor',
    icon: Scissors,
    label: 'Video Editor',
    description: 'Trim and overlay your videos',
    color: 'from-green-500/20 to-green-500/5 border-green-500/20 hover:border-green-500/40',
    iconColor: 'text-green-400',
    credits: 5,
  },
]

export default function DashboardClient({
  userEmail,
  accessToken,
  userId: _userId,
}: DashboardClientProps) {
  const [stats, setStats] = useState({
    totalVideos: 0,
    creditsUsed: 0,
    creditsRemaining: 0,
    hoursGenerated: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const { balance } = useCredits(accessToken)
  const { videos, isLoading: videosLoading, deleteVideo } = useVideoHistory({
    token: accessToken,
    perPage: 6,
  })

  const firstName = userEmail.split('@')[0]

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getStats(accessToken)
        setStats({
          totalVideos: data.total_videos,
          creditsUsed: data.credits_used,
          creditsRemaining: data.credits_remaining,
          hoursGenerated: data.hours_generated,
        })
      } catch {
        // If stats endpoint not available, use credit balance as fallback
        setStats((prev) => ({ ...prev, creditsRemaining: balance }))
      } finally {
        setStatsLoading(false)
      }
    }
    loadStats()
  }, [accessToken, balance])

  useEffect(() => {
    if (!statsLoading) {
      setStats((prev) => ({ ...prev, creditsRemaining: balance }))
    }
  }, [balance, statsLoading])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {IS_DEMO && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-orange/10 border-b border-orange/20 text-sm text-orange">
          <FlaskConical className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Demo Mode</strong> — No API keys needed. Videos complete in ~5 seconds with a sample clip.
          </span>
        </div>
      )}
      <Header token={accessToken} userEmail={userEmail} creditBalance={balance} />

      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="hidden md:flex">
          <SidebarNav />
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between flex-wrap gap-4"
            >
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  Welcome back,{' '}
                  <span className="text-gradient capitalize">{firstName}</span>{' '}
                  👋
                </h1>
                <p className="text-sm text-muted">
                  Ready to forge something cinematic today?
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange/10 border border-orange/20">
                  <Zap className="w-4 h-4 text-orange" />
                  <span className="text-sm font-bold text-orange">{balance.toLocaleString()}</span>
                  <span className="text-xs text-muted">credits</span>
                </div>
                <Link
                  href="/studio/text2video"
                  className="flex items-center gap-2 px-4 py-2 bg-orange hover:bg-orange-dark text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-glow-orange"
                >
                  <TrendingUp className="w-4 h-4" />
                  Create
                </Link>
              </div>
            </motion.div>

            {/* Stats */}
            <StatsStrip stats={stats} isLoading={statsLoading} />

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map(({ href, icon: Icon, label, description, color, iconColor, credits }, i) => (
                  <motion.div
                    key={href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <Link
                      href={href}
                      className={`flex flex-col h-full p-5 rounded-2xl bg-gradient-to-br border transition-all duration-200 hover:-translate-y-1 hover:shadow-card group ${color}`}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center mb-4 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-bold mb-1 flex items-center gap-2">
                        {label}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                      <div className="text-xs text-muted mb-3">{description}</div>
                      <div className="mt-auto flex items-center gap-1 text-xs text-muted">
                        <Zap className="w-3 h-3 text-cyan" />
                        <span>from {credits} credits</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Recent Videos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recent Videos</h2>
                <Link
                  href="/history"
                  className="text-sm text-muted hover:text-orange transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <VideoGrid
                videos={videos}
                isLoading={videosLoading}
                onDelete={deleteVideo}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
