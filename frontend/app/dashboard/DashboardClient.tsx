'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tv,
  Image,
  Mic,
  Scissors,
  ArrowRight,
  Zap,
  TrendingUp,
  FlaskConical,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { StatsStrip } from '@/components/dashboard/StatsStrip'
import { VideoGrid } from '@/components/dashboard/VideoGrid'
import { useVideoHistory } from '@/hooks/useVideoHistory'
import { useCredits } from '@/hooks/useCredits'
import { api } from '@/lib/api'
import { FreeTrialBanner } from '@/components/FreeTrialBanner'
import { SpinWheel } from '@/components/SpinWheel'
import { CreditsNudge } from '@/components/CreditsNudge'
import { ReferralWidget } from '@/components/ReferralWidget'
import { Achievements, type AchievementStats } from '@/components/Achievements'

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

// ─── Credits Panel ────────────────────────────────────────────────────────────

interface CreditsPanelProps {
  balance: number
  paymentStatus: string | null
}

function CreditsPanel({ balance, paymentStatus }: CreditsPanelProps) {
  // Determine how full the bar looks (soft max at 60 credits = Studio plan)
  const SOFT_MAX = 60
  const fillPct = Math.min((balance / SOFT_MAX) * 100, 100)

  const barColor =
    balance === 0
      ? 'from-red-600 to-red-500'
      : balance < 5
      ? 'from-amber-500 to-yellow-400'
      : 'from-violet-600 to-indigo-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-6"
    >
      {/* Subtle glow blob */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl" />

      {/* Payment status toast */}
      <AnimatePresence>
        {paymentStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span><strong>Payment confirmed!</strong> Your credits have been added.</span>
          </motion.div>
        )}
        {paymentStatus === 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm"
          >
            <XCircle className="w-4 h-4 flex-shrink-0" />
            <span>Payment was cancelled. No charges were made.</span>
          </motion.div>
        )}
        {paymentStatus === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm"
          >
            <Clock className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span>Payment pending — credits will appear once confirmed.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Balance display */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
              Credit Balance
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-6xl font-extrabold tabular-nums bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              {balance.toLocaleString()}
            </span>
            <span className="text-base text-white/40 font-medium">credits</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full max-w-xs rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
            />
          </div>
          <p className="text-xs text-white/30 mt-1.5">
            {balance === 0
              ? 'No credits remaining — top up to keep creating'
              : balance === 1
              ? '1 credit remaining'
              : `${balance} credits remaining`}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2.5 sm:items-end">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" />
            Buy More Credits
          </Link>
          <p className="text-xs text-white/25 text-center sm:text-right">
            From R99 · Credits never expire
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient({
  userEmail,
  accessToken,
  userId: _userId,
}: DashboardClientProps) {
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment_status') // ?payment_status=success|cancelled|pending

  const [stats, setStats] = useState({
    totalVideos: 0,
    creditsUsed: 0,
    creditsRemaining: 0,
    hoursGenerated: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  // Referral stats — fetched separately (gracefully degrades)
  const [referralCount, setReferralCount] = useState(0)
  const [referralCredits, setReferralCredits] = useState(0)

  const { balance } = useCredits(accessToken)
  const { videos, isLoading: videosLoading, deleteVideo } = useVideoHistory({
    token: accessToken,
    perPage: 6,
  })

  const firstName = userEmail.split('@')[0]

  // The userId may start with underscore prefix for lint suppression in props,
  // expose a clean version for child components.
  const userId = _userId

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

  // Fetch referral stats (best-effort)
  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${API_BASE}/referrals/stats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          setReferralCount(data.referral_count ?? 0)
          setReferralCredits(data.credits_earned ?? 0)
        }
      } catch {
        // Silently ignore — widget still renders with 0s
      }
    }
    if (accessToken) fetchReferrals()
  }, [accessToken])

  // Build achievement stats
  const achievementStats: AchievementStats = {
    videosGenerated: stats.totalVideos,
    referrals: referralCount,
    hasBoughtStudio: stats.creditsUsed >= 60,
  }

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

            {/* Free trial banner (0-credit users only) */}
            <FreeTrialBanner credits={balance} accessToken={accessToken} />

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

            {/* Credits Panel */}
            <CreditsPanel balance={balance} paymentStatus={paymentStatus} />

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

            {/* ── Engagement Section ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Spin Wheel */}
              <SpinWheel accessToken={accessToken} />

              {/* Referral Widget */}
              <ReferralWidget
                userId={userId}
                referralCount={referralCount}
                creditsEarned={referralCredits}
              />
            </div>

            {/* Achievement Badges */}
            <Achievements stats={achievementStats} />

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

      {/* Low-credits toast (fixed position, bottom-right) */}
      <CreditsNudge credits={balance} />
    </div>
  )
}
