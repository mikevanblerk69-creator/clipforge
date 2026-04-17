'use client'

/**
 * Achievements — badge shelf showing unlocked/locked badges.
 * Badges glow when newly unlocked; locked badges are greyed out.
 * Tooltip on hover explaining how to unlock each.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'

// ─── Badge definitions ────────────────────────────────────────────────────────

interface BadgeDef {
  id: string
  emoji: string
  label: string
  description: string
  howToUnlock: string
  check: (stats: AchievementStats) => boolean
}

export interface AchievementStats {
  videosGenerated: number
  referrals: number
  hasBoughtStudio: boolean
}

const BADGES: BadgeDef[] = [
  {
    id: 'first_video',
    emoji: '🎬',
    label: 'First Video',
    description: 'Generated your first video',
    howToUnlock: 'Generate your first video',
    check: (s) => s.videosGenerated >= 1,
  },
  {
    id: 'on_fire',
    emoji: '🔥',
    label: 'On Fire',
    description: 'Generated 5 videos',
    howToUnlock: 'Generate 5 videos total',
    check: (s) => s.videosGenerated >= 5,
  },
  {
    id: 'power_creator',
    emoji: '💫',
    label: 'Power Creator',
    description: 'Generated 25 videos',
    howToUnlock: 'Generate 25 videos total',
    check: (s) => s.videosGenerated >= 25,
  },
  {
    id: 'connector',
    emoji: '🤝',
    label: 'Connector',
    description: 'Referred your first friend',
    howToUnlock: 'Refer 1 friend who signs up',
    check: (s) => s.referrals >= 1,
  },
  {
    id: 'studio_pro',
    emoji: '👑',
    label: 'Studio Pro',
    description: 'Bought the Studio plan',
    howToUnlock: 'Purchase the Studio credit pack',
    check: (s) => s.hasBoughtStudio,
  },
]

// ─── Individual Badge ─────────────────────────────────────────────────────────

interface BadgeProps {
  badge: BadgeDef
  unlocked: boolean
  isNew?: boolean
}

function Badge({ badge, unlocked, isNew }: BadgeProps) {
  const [showTip, setShowTip] = useState(false)

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* Badge circle */}
      <motion.button
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        whileHover={{ scale: unlocked ? 1.1 : 1.03 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center justify-center rounded-2xl focus:outline-none"
        style={{
          width: 60,
          height: 60,
          background: unlocked
            ? 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #5b21b6 100%)'
            : 'rgba(255,255,255,0.04)',
          border: unlocked
            ? '1.5px solid rgba(167,139,250,0.5)'
            : '1.5px solid rgba(255,255,255,0.06)',
          boxShadow: unlocked
            ? isNew
              ? '0 0 20px rgba(167,139,250,0.7), 0 0 40px rgba(167,139,250,0.35)'
              : '0 0 12px rgba(167,139,250,0.35)'
            : 'none',
          filter: unlocked ? 'none' : 'grayscale(1) opacity(0.3)',
          cursor: 'default',
        }}
        aria-label={`${badge.label} badge — ${unlocked ? badge.description : badge.howToUnlock}`}
      >
        <span className="text-2xl" role="img" aria-hidden>
          {badge.emoji}
        </span>

        {/* Glow pulse for newly unlocked */}
        {unlocked && isNew && (
          <motion.span
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 1.4, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.6 }}
            className="absolute inset-0 rounded-2xl"
            style={{ border: '2px solid rgba(167,139,250,0.6)' }}
          />
        )}

        {/* Lock icon overlay */}
        {!unlocked && (
          <span
            className="absolute bottom-1 right-1 text-[10px] leading-none text-white/25"
            aria-hidden
          >
            🔒
          </span>
        )}
      </motion.button>

      {/* Label */}
      <span
        className="text-[11px] font-semibold text-center leading-tight"
        style={{ color: unlocked ? 'rgba(221,214,254,0.9)' : 'rgba(255,255,255,0.2)' }}
      >
        {badge.label}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-3 z-50 w-44 pointer-events-none"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 shadow-xl">
              <p className="text-xs font-bold text-white mb-1">
                {badge.emoji} {badge.label}
              </p>
              {unlocked ? (
                <p className="text-xs text-violet-300">{badge.description}</p>
              ) : (
                <>
                  <p className="text-[11px] text-white/40 mb-1">Locked</p>
                  <p className="text-[11px] text-amber-400/80">
                    🔓 {badge.howToUnlock}
                  </p>
                </>
              )}
            </div>
            {/* Arrow */}
            <div
              className="mx-auto w-2 h-2 rotate-45 border-b border-r border-white/10 bg-slate-900"
              style={{ marginTop: -4 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AchievementsProps {
  stats: AchievementStats
  /** IDs of badges that were just unlocked this session (will glow) */
  newlyUnlocked?: string[]
}

export function Achievements({ stats, newlyUnlocked = [] }: AchievementsProps) {
  const unlockedCount = BADGES.filter((b) => b.check(stats)).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-6"
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-base font-bold text-white">Achievements</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300">
          {unlockedCount} / {BADGES.length}
        </span>
      </div>

      {/* Badge grid */}
      <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
        {BADGES.map((badge) => {
          const unlocked = badge.check(stats)
          const isNew = newlyUnlocked.includes(badge.id)
          return (
            <Badge
              key={badge.id}
              badge={badge}
              unlocked={unlocked}
              isNew={isNew}
            />
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / BADGES.length) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
          />
        </div>
        <p className="text-xs text-white/25 mt-1.5">
          {unlockedCount === BADGES.length
            ? '🎉 All badges unlocked!'
            : `${BADGES.length - unlockedCount} badge${BADGES.length - unlockedCount !== 1 ? 's' : ''} to go`}
        </p>
      </div>
    </motion.div>
  )
}
