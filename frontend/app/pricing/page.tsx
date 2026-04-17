'use client'

/**
 * ClipForge Pricing Page — PayFast (ZAR) + Stripe (USD).
 *
 * Currency toggle: South African users pay in ZAR via PayFast;
 * international users pay in USD via Stripe Checkout.
 *
 * PayFast flow:
 *   1. POST /payments/create-payment → signed form params
 *   2. Build hidden <form> → submit directly to PayFast
 *
 * Stripe flow:
 *   1. POST /payments/stripe/create-checkout → {checkout_url}
 *   2. window.location.href = checkout_url   (Stripe-hosted page)
 */

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Zap,
  Film,
  Clapperboard,
  Check,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Lock,
  Star,
  Sparkles,
  Globe,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PayFastParams {
  action_url: string
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  m_payment_id: string
  amount: string
  item_name: string
  signature: string
  [key: string]: string
}

// ─── Package config ──────────────────────────────────────────────────────────

const ZAR_PACKAGES = [
  {
    key: 'starter',
    label: 'Starter',
    tagline: 'Perfect for trying ClipForge',
    amount: 99,
    credits: 10,
    icon: Zap,
    costPerVideo: 'R9.90 / video',
    popular: false,
    glowColor: 'rgba(6, 182, 212, 0.25)',
    borderFrom: '#06b6d4',
    ctaClass: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20',
    features: [
      '10 HD video generations',
      'Text-to-video & image-to-video',
      'Lip sync',
      'Commercial licence',
      'Credits never expire',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    tagline: 'Best value for regular creators',
    amount: 199,
    credits: 25,
    icon: Film,
    costPerVideo: 'R7.96 / video',
    popular: true,
    glowColor: 'rgba(249, 115, 22, 0.4)',
    borderFrom: '#f97316',
    ctaClass: 'bg-orange hover:bg-orange/90 text-black font-bold shadow-lg shadow-orange/30',
    features: [
      '25 HD video generations',
      'Text-to-video & image-to-video',
      'Lip sync',
      'Commercial licence',
      'Credits never expire',
      'Priority rendering queue',
    ],
  },
  {
    key: 'studio',
    label: 'Studio',
    tagline: 'High-volume production studio',
    amount: 399,
    credits: 60,
    icon: Clapperboard,
    costPerVideo: 'R6.65 / video',
    popular: false,
    glowColor: 'rgba(139, 92, 246, 0.25)',
    borderFrom: '#8b5cf6',
    ctaClass: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20',
    features: [
      '60 HD video generations',
      'Text-to-video & image-to-video',
      'Lip sync',
      'Commercial licence',
      'Credits never expire',
      'Priority rendering queue',
      'Bulk generation mode',
    ],
  },
]

const USD_PACKAGES = [
  {
    key: 'starter',
    label: 'Starter',
    tagline: 'Perfect for trying ClipForge',
    price_usd: 9,
    credits: 100,
    icon: Zap,
    costPerVideo: '$0.09 / credit',
    popular: false,
    glowColor: 'rgba(6, 182, 212, 0.25)',
    borderFrom: '#06b6d4',
    ctaClass: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20',
    features: [
      '100 credits',
      'Text-to-video & image-to-video',
      'Lip sync',
      'Commercial licence',
      'Credits never expire',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    tagline: 'Best value for regular creators',
    price_usd: 29,
    credits: 350,
    icon: Film,
    costPerVideo: '$0.083 / credit',
    popular: true,
    glowColor: 'rgba(249, 115, 22, 0.4)',
    borderFrom: '#f97316',
    ctaClass: 'bg-orange hover:bg-orange/90 text-black font-bold shadow-lg shadow-orange/30',
    features: [
      '350 credits',
      'Text-to-video & image-to-video',
      'Lip sync',
      'Commercial licence',
      'Credits never expire',
      'Priority rendering queue',
    ],
  },
  {
    key: 'studio',
    label: 'Studio',
    tagline: 'High-volume production studio',
    price_usd: 79,
    credits: 1000,
    icon: Clapperboard,
    costPerVideo: '$0.079 / credit',
    popular: false,
    glowColor: 'rgba(139, 92, 246, 0.25)',
    borderFrom: '#8b5cf6',
    ctaClass: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20',
    features: [
      '1,000 credits',
      'Text-to-video & image-to-video',
      'Lip sync',
      'Commercial licence',
      'Credits never expire',
      'Priority rendering queue',
      'Bulk generation mode',
    ],
  },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Countdown banner ────────────────────────────────────────────────────────

function getNextSundayMidnight(): Date {
  const now = new Date()
  const day = now.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilSunday)
  next.setHours(24, 0, 0, 0)
  return next
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(target.getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  const total   = Math.max(diff, 0)
  const days    = Math.floor(total / 86_400_000)
  const hours   = Math.floor((total % 86_400_000) / 3_600_000)
  const minutes = Math.floor((total % 3_600_000) / 60_000)
  const seconds = Math.floor((total % 60_000) / 1_000)
  return { days, hours, minutes, seconds, expired: total <= 0 }
}

function LimitedTimeBanner() {
  const [target] = useState(() => getNextSundayMidnight())
  const { days, hours, minutes, seconds, expired } = useCountdown(target)
  if (expired) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4"
      style={{
        background: 'linear-gradient(135deg, #92400e 0%, #b45309 30%, #d97706 60%, #f59e0b 100%)',
        boxShadow: '0 4px 32px rgba(245,158,11,0.35)',
      }}
    >
      <div className="flex items-center gap-3 z-10">
        <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">⚡</span>
        </div>
        <div>
          <p className="text-sm font-extrabold text-white">Launch Special — 20% extra credits this week only!</p>
          <p className="text-xs text-amber-100/70 mt-0.5">
            Buy any plan and get <strong>+20% bonus credits</strong> automatically added to your account.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 z-10 flex-shrink-0">
        <span className="text-xs text-amber-100/60 mr-1">Ends in</span>
        {[{ val: days, label: 'd' }, { val: hours, label: 'h' }, { val: minutes, label: 'm' }, { val: seconds, label: 's' }].map(({ val, label }) => (
          <div key={label} className="flex flex-col items-center">
            <span className="w-10 text-center rounded-lg text-lg font-extrabold tabular-nums py-1" style={{ background: 'rgba(0,0,0,0.3)', color: 'white' }}>
              {pad(val)}
            </span>
            <span className="text-[10px] text-amber-100/50 mt-0.5">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Inner component ─────────────────────────────────────────────────────────

type Currency = 'ZAR' | 'USD'

function PricingInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClientComponentClient()

  const [currency, setCurrency]             = useState<Currency>('USD')
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [token, setToken]                   = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  const paymentSuccess   = searchParams.get('payment') === 'success'
  const paymentCancelled = searchParams.get('payment') === 'cancelled'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
      setSessionChecked(true)
    })
  }, [supabase])

  // ── PayFast (ZAR) ────────────────────────────────────────────────────────

  const submitToPayFast = useCallback((params: PayFastParams) => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = params.action_url
    const skip = new Set(['action_url'])
    for (const [key, value] of Object.entries(params)) {
      if (skip.has(key)) continue
      const input = document.createElement('input')
      input.type  = 'hidden'
      input.name  = key
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  }, [])

  const handlePayFast = useCallback(async (packageKey: string) => {
    setError(null)
    if (!sessionChecked) return
    if (!token) { router.push(`/auth/signin?redirect=/pricing`); return }
    setLoadingPackage(packageKey)
    try {
      const res = await fetch(`${API_BASE}/payments/create-payment?package_key=${packageKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail ?? `Server error ${res.status}`)
      }
      submitToPayFast(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoadingPackage(null)
    }
  }, [token, sessionChecked, router, submitToPayFast])

  // ── Stripe (USD) ─────────────────────────────────────────────────────────

  const handleStripe = useCallback(async (packageKey: string) => {
    setError(null)
    if (!sessionChecked) return
    if (!token) { router.push(`/auth/signin?redirect=/pricing`); return }
    setLoadingPackage(packageKey)
    try {
      const res = await fetch(`${API_BASE}/payments/stripe/create-checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_key: packageKey }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail ?? `Server error ${res.status}`)
      }
      const { checkout_url } = await res.json()
      window.location.href = checkout_url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoadingPackage(null)
    }
  }, [token, sessionChecked, router])

  const handleBuyNow = currency === 'ZAR' ? handlePayFast : handleStripe
  const packages     = currency === 'ZAR' ? ZAR_PACKAGES  : USD_PACKAGES

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1e 40%, #0a0a0f 100%)' }}
    >
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute -right-64 top-1/3 h-[500px] w-[500px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="font-display text-xl font-bold tracking-wider">
            CLIP<span className="text-orange-500">FORGE</span>
          </span>
          <div className="w-24" />
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">

        <LimitedTimeBanner />

        {/* Status banners */}
        {paymentSuccess && (
          <div className="mb-10 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-300 backdrop-blur-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Payment confirmed!</p>
              <p className="mt-0.5 text-sm text-emerald-300/70">
                Credits are being added — this usually takes a few seconds.
              </p>
            </div>
          </div>
        )}
        {paymentCancelled && (
          <div className="mb-10 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-300 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">Payment cancelled — no charge was made.</p>
          </div>
        )}

        {/* Hero */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-400">
            <Sparkles className="h-3 w-3" />
            Simple, transparent pricing
          </div>
          <h1 className="mb-5 bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Buy once.
            <br />
            Generate forever.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-white/50">
            No subscriptions. No monthly fees. Credits never expire.
          </p>
        </div>

        {/* Currency toggle */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <Globe className="h-4 w-4 text-white/40" />
          <span className="text-sm text-white/40">Pay in:</span>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(['USD', 'ZAR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150 ${
                  currency === c
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {c === 'USD' ? '🌍 USD' : '🇿🇦 ZAR'}
              </button>
            ))}
          </div>
          <span className="text-xs text-white/30">
            {currency === 'ZAR' ? 'via PayFast' : 'via Stripe'}
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Package cards */}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
          {packages.map((pkg) => {
            const Icon      = pkg.icon
            const isLoading = loadingPackage === pkg.key
            const isDisabled = loadingPackage !== null
            const priceLabel = currency === 'ZAR'
              ? `R${(pkg as typeof ZAR_PACKAGES[0]).amount}`
              : `$${(pkg as typeof USD_PACKAGES[0]).price_usd}`
            const creditLabel = currency === 'ZAR'
              ? `${pkg.credits} videos`
              : `${pkg.credits.toLocaleString()} credits`

            return (
              <div
                key={pkg.key}
                className="group relative flex flex-col rounded-3xl p-px transition-transform duration-300 hover:-translate-y-1"
                style={{
                  background: pkg.popular
                    ? `linear-gradient(135deg, ${pkg.borderFrom}80, ${pkg.borderFrom}20, transparent)`
                    : `linear-gradient(135deg, ${pkg.borderFrom}40, transparent, ${pkg.borderFrom}20)`,
                  boxShadow: pkg.popular
                    ? `0 0 40px ${pkg.glowColor}, 0 0 80px ${pkg.glowColor.replace('0.4', '0.15')}`
                    : `0 0 20px ${pkg.glowColor}`,
                }}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-orange-500/40">
                      <Star className="h-3 w-3 fill-current" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div
                  className="flex flex-1 flex-col rounded-3xl p-7"
                  style={{
                    background: pkg.popular
                      ? 'linear-gradient(135deg, #1a0f00 0%, #120a00 100%)'
                      : 'linear-gradient(135deg, #0d0d14 0%, #0a0a0f 100%)',
                  }}
                >
                  <div className="mb-6 flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ background: pkg.glowColor, boxShadow: `0 0 16px ${pkg.glowColor}` }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{pkg.label}</h2>
                      <p className="text-xs text-white/40">{pkg.tagline}</p>
                    </div>
                  </div>

                  <div className="mb-1">
                    <span className="text-5xl font-extrabold text-white">{priceLabel}</span>
                    <span className="ml-2 text-sm text-white/40">once-off</span>
                  </div>
                  <p className="mb-6 text-sm font-semibold" style={{ color: pkg.borderFrom }}>
                    {creditLabel} · {pkg.costPerVideo}
                  </p>

                  <div className="mb-5 h-px bg-white/5" />

                  <ul className="mb-7 flex-1 space-y-3">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <div
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ background: pkg.glowColor }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-white/60">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleBuyNow(pkg.key)}
                    disabled={isDisabled}
                    className={`
                      relative flex w-full items-center justify-center gap-2.5 overflow-hidden
                      rounded-2xl px-5 py-4 text-sm font-semibold transition-all duration-200
                      disabled:cursor-not-allowed disabled:opacity-60
                      ${pkg.ctaClass}
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Buy Now · {priceLabel}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* AppSumo CTA */}
        <div className="mt-10 flex items-center justify-center">
          <Link
            href="/redeem"
            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            <span className="text-base">🎉</span>
            Got an AppSumo lifetime deal code? Redeem it here
          </Link>
        </div>

        {/* Trust strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-white/40">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            {currency === 'ZAR' ? 'Secured by PayFast (PCI-DSS Level 1)' : 'Secured by Stripe (PCI-DSS Level 1)'}
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-cyan-400" />
            Card details never touch our servers
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-orange-400" />
            Credits never expire
          </span>
          <span className="flex items-center gap-2">
            <Film className="h-4 w-4 text-violet-400" />
            Commercial use on all plans
          </span>
        </div>

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="mb-10 text-center text-3xl font-bold text-white">Common questions</h2>
          <div className="mx-auto grid max-w-3xl gap-3">
            {[
              { q: 'When do my credits arrive?', a: 'Credits are added within seconds of payment confirmation. If it takes longer than 5 minutes, contact support.' },
              { q: 'Do credits expire?', a: 'Never. Credits stay on your account indefinitely.' },
              { q: 'What resolution are the generated videos?', a: 'All videos are generated in HD (up to 1080p) using state-of-the-art AI models.' },
              { q: 'Can I use the videos commercially?', a: 'Yes. Every plan includes a full commercial use licence.' },
              { q: 'Is my payment secure?', a: currency === 'ZAR' ? 'PayFast is a PCI-DSS Level 1 certified gateway. ClipForge never stores your card details.' : 'Stripe is a PCI-DSS Level 1 certified gateway trusted by millions of businesses worldwide. ClipForge never stores your card details.' },
            ].map(({ q, a }) => (
              <details key={q} className="group cursor-pointer rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-5 transition-colors hover:bg-white/[0.05]">
                <summary className="list-none font-semibold text-white/80 group-open:text-white">{q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-white/40">{a}</p>
              </details>
            ))}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>}>
      <PricingInner />
    </Suspense>
  )
}
