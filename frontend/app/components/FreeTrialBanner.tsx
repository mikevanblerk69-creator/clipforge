'use client'

/**
 * FreeTrialBanner — shown only to users with 0 credits.
 * Calls POST /payments/claim-free-trial on CTA click.
 * Dismissed state stored in localStorage.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clapperboard, Loader2, CheckCircle2 } from 'lucide-react'

const STORAGE_KEY = 'clipforge_free_trial_dismissed'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface FreeTrialBannerProps {
  credits: number
  accessToken: string | null
}

export function FreeTrialBanner({ credits, accessToken }: FreeTrialBannerProps) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    // Only show if: user has 0 credits, not already dismissed, not already claimed
    if (
      credits === 0 &&
      !localStorage.getItem(STORAGE_KEY) &&
      accessToken
    ) {
      setVisible(true)
    }
  }, [credits, accessToken])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  const handleClaim = async () => {
    if (!accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/payments/claim-free-trial`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        setClaimed(true)
        localStorage.setItem(STORAGE_KEY, '1')
        setTimeout(() => setVisible(false), 2500)
      }
    } catch {
      // silently fail — banner just stays
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div
            className="relative flex items-center justify-between gap-4 px-5 py-3.5 mx-auto max-w-6xl rounded-2xl mb-4"
            style={{
              background:
                'linear-gradient(135deg, #4c1d95 0%, #5b21b6 40%, #6d28d9 70%, #7c3aed 100%)',
              boxShadow: '0 4px 32px rgba(109,40,217,0.45)',
            }}
          >
            {/* Subtle shimmer overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
              aria-hidden
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background:
                    'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                  animation: 'ftShimmer 3s ease-in-out infinite',
                }}
              />
            </div>

            {/* Left — icon + text */}
            <div className="flex items-center gap-3 z-10">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Clapperboard className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-white">
                🎬 Start free — 1 video on us.{' '}
                <span className="font-normal text-white/75">No card needed.</span>
              </p>
            </div>

            {/* Right — CTA + dismiss */}
            <div className="flex items-center gap-2 z-10 flex-shrink-0">
              {claimed ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  Credit added!
                </span>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-violet-700 text-sm font-bold hover:bg-white/90 transition-all duration-150 shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  Claim Free Video
                </button>
              )}

              <button
                onClick={handleDismiss}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <style jsx global>{`
            @keyframes ftShimmer {
              0%   { transform: translateX(-100%); }
              60%  { transform: translateX(200%); }
              100% { transform: translateX(200%); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
