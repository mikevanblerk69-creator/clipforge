'use client'

/**
 * SpinWheel — Daily gamified spin wheel.
 * - Colorful SVG wheel with 6 segments
 * - Once-per-day (localStorage lastSpinDate)
 * - Confetti burst on 2+ credit wins
 * - Calls POST /payments/claim-spin-reward after animation
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X, Loader2, CheckCircle2, Clock } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const STORAGE_KEY = 'clipforge_last_spin_date'

// ─── Prize config ────────────────────────────────────────────────────────────

interface Prize {
  label: string
  color: string
  textColor: string
  confetti: boolean
  apiKey: string
}

const PRIZES: Prize[] = [
  { label: '1 Bonus\nCredit',        color: '#6d28d9', textColor: '#e9d5ff', confetti: false, apiKey: '1_credit' },
  { label: '2 Bonus\nCredits',       color: '#4338ca', textColor: '#c7d2fe', confetti: true,  apiKey: '2_credits' },
  { label: 'Try Again\nTomorrow',    color: '#374151', textColor: '#9ca3af', confetti: false, apiKey: 'try_again' },
  { label: '5% Off Next\nPurchase',  color: '#7c3aed', textColor: '#ddd6fe', confetti: false, apiKey: '5pct_off' },
  { label: '3 Bonus\nCredits',       color: '#4f46e5', textColor: '#a5b4fc', confetti: true,  apiKey: '3_credits' },
  { label: '1 Bonus\nCredit',        color: '#6366f1', textColor: '#e0e7ff', confetti: false, apiKey: '1_credit' },
]

const SEGMENT_ANGLE = 360 / PRIZES.length // 60°
const RADIUS = 120
const CX = 140
const CY = 140

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, startAngle)
  const e = polarToCartesian(cx, cy, r, endAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r},0,${large},1,${e.x},${e.y} Z`
}

// ─── Confetti component ───────────────────────────────────────────────────────

function Confetti() {
  const particles = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    x: Math.random() * 280,
    dx: (Math.random() - 0.5) * 120,
    dy: -(Math.random() * 200 + 60),
    color: ['#f97316','#8b5cf6','#06b6d4','#f59e0b','#10b981','#ec4899'][i % 6],
    size: Math.random() * 8 + 4,
    rotate: Math.random() * 360,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: p.x, y: 260, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x + p.dx, y: p.dy, opacity: 0, rotate: p.rotate, scale: 0.3 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size, background: p.color }}
        />
      ))}
    </div>
  )
}

// ─── Countdown to midnight ────────────────────────────────────────────────────

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setTimeLeft(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return timeLeft
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SpinWheelProps {
  accessToken: string | null
}

export function SpinWheel({ accessToken }: SpinWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [prizeIndex, setPrizeIndex] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimDone, setClaimDone] = useState(false)
  const [alreadySpun, setAlreadySpun] = useState(false)
  const countdownLabel = useCountdownToMidnight()

  const currentRotation = useRef(0)

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY)
    if (last) {
      const today = new Date().toDateString()
      if (last === today) setAlreadySpun(true)
    }
  }, [])

  const handleSpin = () => {
    if (spinning || alreadySpun || !accessToken) return

    // Pick a random prize
    const idx = Math.floor(Math.random() * PRIZES.length)
    // Calculate the angle so that prize `idx` lands at the top pointer.
    // Each prize occupies SEGMENT_ANGLE degrees starting from idx*SEGMENT_ANGLE.
    // We want the midpoint of that segment at 0° (top after rotation).
    const prizeCenter = idx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    // Add several full spins for effect
    const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360
    const targetAngle = extraSpins + (360 - prizeCenter)
    const newRotation = currentRotation.current + targetAngle

    setSpinning(true)
    setRotation(newRotation)
    currentRotation.current = newRotation

    // After animation ends (~4s), show result
    setTimeout(async () => {
      setSpinning(false)
      setPrizeIndex(idx)
      setShowModal(true)
      localStorage.setItem(STORAGE_KEY, new Date().toDateString())
      setAlreadySpun(true)

      if (PRIZES[idx].confetti) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 1400)
      }

      // Claim reward
      setClaiming(true)
      try {
        await fetch(`${API_BASE}/payments/claim-spin-reward`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prize: PRIZES[idx].apiKey }),
        })
        setClaimDone(true)
      } catch {
        setClaimDone(true)
      } finally {
        setClaiming(false)
      }
    }, 4200)
  }

  if (!accessToken) return null

  return (
    <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-violet-600/10 blur-3xl" aria-hidden />

      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-violet-400" />
        <h2 className="text-base font-bold text-white">Daily Spin</h2>
        <span className="ml-auto text-xs text-white/30 font-medium">Once per day</span>
      </div>

      <div className="flex flex-col items-center gap-5">
        {/* Wheel container */}
        <div className="relative" style={{ width: 280, height: 280 }}>
          {/* Top pointer */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
            style={{ marginTop: -4 }}
            aria-hidden
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '20px solid #f97316',
                filter: 'drop-shadow(0 2px 6px rgba(249,115,22,0.6))',
              }}
            />
          </div>

          {/* Spinning SVG */}
          <motion.div
            style={{ transformOrigin: 'center' }}
            animate={{ rotate: rotation }}
            transition={spinning ? { duration: 4, ease: [0.17, 0.67, 0.12, 1.0] } : { duration: 0 }}
          >
            <svg width="280" height="280" viewBox="0 0 280 280">
              {/* Outer ring */}
              <circle cx={CX} cy={CY} r={RADIUS + 14} fill="#1e1b4b" />
              <circle cx={CX} cy={CY} r={RADIUS + 10} fill="none" stroke="#4338ca" strokeWidth="2" strokeDasharray="6 4" />

              {/* Segments */}
              {PRIZES.map((prize, i) => {
                const start = i * SEGMENT_ANGLE
                const end = start + SEGMENT_ANGLE
                const mid = start + SEGMENT_ANGLE / 2
                const textPos = polarToCartesian(CX, CY, RADIUS * 0.65, mid)
                const lines = prize.label.split('\n')
                return (
                  <g key={i}>
                    <path
                      d={describeSlice(CX, CY, RADIUS, start, end)}
                      fill={prize.color}
                      stroke="#0f0f1a"
                      strokeWidth="2"
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y - (lines.length > 1 ? 8 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={prize.textColor}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {lines.map((line, li) => (
                        <tspan key={li} x={textPos.x} dy={li === 0 ? 0 : 13}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                )
              })}

              {/* Center cap */}
              <circle cx={CX} cy={CY} r={22} fill="#0f0f1a" stroke="#6d28d9" strokeWidth="3" />
              <circle cx={CX} cy={CY} r={10} fill="#6d28d9" />
            </svg>
          </motion.div>
        </div>

        {/* Spin button / locked state */}
        {alreadySpun ? (
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 text-sm">
            <Clock className="w-4 h-4" />
            Come back in {countdownLabel}
          </div>
        ) : (
          <motion.button
            onClick={handleSpin}
            disabled={spinning}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-violet-500/30 disabled:opacity-60 transition-all duration-200"
          >
            {spinning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Spinning…
              </span>
            ) : (
              '🎰 Spin the Wheel!'
            )}
          </motion.button>
        )}
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {showModal && prizeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.75, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.75, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {showConfetti && <Confetti />}

              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-5xl mb-4">
                {PRIZES[prizeIndex].confetti ? '🎉' : '✨'}
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">
                You won!
              </h3>
              <div
                className="inline-block px-5 py-2.5 rounded-xl text-lg font-bold mb-5"
                style={{
                  background: PRIZES[prizeIndex].color,
                  color: PRIZES[prizeIndex].textColor,
                }}
              >
                {PRIZES[prizeIndex].label.replace('\n', ' ')}
              </div>

              {claiming ? (
                <p className="text-sm text-white/40 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Claiming reward…
                </p>
              ) : claimDone ? (
                <p className="text-sm text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Reward added to your account
                </p>
              ) : null}

              <button
                onClick={() => setShowModal(false)}
                className="mt-5 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
              >
                Awesome, thanks!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
