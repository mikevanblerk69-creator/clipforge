'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCredits, CREDIT_PACKAGES } from '@/lib/credits'

interface CreditBadgeProps {
  balance: number
  className?: string
}

export function CreditBadge({ balance, className }: CreditBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false)

  const isLow = balance <= 10
  const isCritical = balance <= 5
  const isEmpty = balance === 0

  const badgeColor = isEmpty
    ? 'border-red-500/50 bg-red-500/10 text-red-400'
    : isCritical
    ? 'border-red-400/40 bg-red-400/10 text-red-300'
    : isLow
    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
    : 'border-orange/30 bg-orange/10 text-orange'

  const glowClass = isEmpty || isCritical
    ? 'shadow-[0_0_12px_rgba(239,68,68,0.3)]'
    : isLow
    ? 'shadow-[0_0_12px_rgba(234,179,8,0.3)]'
    : 'shadow-[0_0_12px_rgba(255,107,43,0.3)]'

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold transition-all duration-200 hover:scale-105',
          badgeColor,
          glowClass,
          className
        )}
        title="Click to get more credits"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>{balance.toLocaleString()}</span>
      </button>

      {/* Get Credits Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false)
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-card"
            >
              {/* Close */}
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Get More Credits</h2>
                    <p className="text-sm text-muted">
                      Current balance:{' '}
                      <span className={isLow ? 'text-yellow-400' : 'text-orange'}>
                        {formatCredits(balance)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CREDIT_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    className={cn(
                      'relative p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02]',
                      pkg.popular
                        ? 'border-orange/50 bg-orange/5 glow-orange'
                        : 'border-border bg-surface-2 hover:border-orange/30'
                    )}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        POPULAR
                      </span>
                    )}
                    <div className="text-xl font-bold text-foreground mb-0.5">
                      {pkg.credits.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted mb-2">{pkg.label}</div>
                    <div className="text-sm font-semibold text-orange">${pkg.price}</div>
                  </button>
                ))}
              </div>

              {/* CTA */}
              <button className="w-full py-3 bg-orange hover:bg-orange-dark text-white font-semibold rounded-xl transition-all duration-200 glow-orange flex items-center justify-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Purchase Credits
              </button>

              <p className="text-center text-xs text-muted mt-3">
                Credits never expire. Secure payment via Stripe.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
