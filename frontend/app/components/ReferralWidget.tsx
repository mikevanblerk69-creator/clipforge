'use client'

/**
 * ReferralWidget — Shows user's referral link, copy button, and stats.
 * "Invite friends, earn credits — 3 credits per paying friend"
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Copy, CheckCheck, Gift } from 'lucide-react'

interface ReferralWidgetProps {
  userId: string
  referralCount?: number
  creditsEarned?: number
}

export function ReferralWidget({
  userId,
  referralCount = 0,
  creditsEarned = 0,
}: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false)
  const referralLink = `https://clipforge.app/signup?ref=${userId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS / older browsers
      const el = document.createElement('textarea')
      el.value = referralLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-fuchsia-950 p-6"
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-fuchsia-400" />
        </div>
        <h2 className="text-base font-bold text-white">Invite Friends, Earn Credits</h2>
      </div>
      <p className="text-xs text-white/40 mb-5 ml-10">
        You earn <span className="text-fuchsia-400 font-semibold">3 credits</span> for every friend who pays
      </p>

      {/* Referral link box */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/50 font-mono truncate">
          {referralLink}
        </div>
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.92 }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: copied
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #a855f7, #9333ea)',
            boxShadow: copied
              ? '0 4px 14px rgba(16,185,129,0.35)'
              : '0 4px 14px rgba(168,85,247,0.4)',
            color: 'white',
          }}
        >
          {copied ? (
            <>
              <CheckCheck className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/5 px-4 py-3 text-center">
          <div className="text-2xl font-extrabold text-white tabular-nums">
            {referralCount}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            Friends referred
          </div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/5 px-4 py-3 text-center">
          <div className="text-2xl font-extrabold tabular-nums" style={{ color: '#c084fc' }}>
            {creditsEarned}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            Credits earned
          </div>
        </div>
      </div>

      {/* Share hint */}
      <p className="mt-4 text-xs text-white/25 text-center flex items-center justify-center gap-1.5">
        <Gift className="w-3 h-3" />
        Share your link — credits land automatically when they pay
      </p>
    </motion.div>
  )
}
