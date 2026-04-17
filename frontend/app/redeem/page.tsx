'use client'

/**
 * /redeem — AppSumo Lifetime Deal code redemption page.
 *
 * Flow:
 *  1. User enters their AppSumo code (e.g. CF-XXXX-XXXX)
 *  2. POST /payments/stripe/redeem-appsumo
 *  3. On success → show credits granted + link to dashboard
 *
 * Each code grants 2,400 lifetime credits (50 credits/month × 48 months).
 * Customers who bought multiple codes redeem each one separately.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Zap,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Gift,
  Shield,
  Film,
} from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function RedeemPage() {
  const router   = useRouter()
  const supabase = createClientComponentClient()

  const [code, setCode]           = useState('')
  const [token, setToken]         = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<{ credits: number; message: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null)
      setSessionChecked(true)
    })
  }, [supabase])

  const handleRedeem = useCallback(async () => {
    setError(null)
    if (!sessionChecked) return
    if (!token) {
      router.push('/auth/signin?redirect=/redeem')
      return
    }
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Please enter your AppSumo code.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/payments/stripe/redeem-appsumo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: trimmed }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error((data as { detail?: string }).detail ?? `Error ${res.status}`)
      }

      setSuccess({
        credits: (data as { credits_granted: number }).credits_granted,
        message: (data as { message: string }).message,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [code, token, sessionChecked, router])

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1e 40%, #0a0a0f 100%)' }}
    >
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[500px] w-[500px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }} />
        <div className="absolute -right-64 bottom-0 h-[500px] w-[500px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      {/* Back link */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/pricing" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Pricing
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-display text-3xl font-bold tracking-wider">
            CLIP<span className="text-orange-500">FORGE</span>
          </span>
        </div>

        {success ? (
          /* ── Success state ──────────────────────────────────────────────── */
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center backdrop-blur-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="mb-2 text-2xl font-extrabold text-white">You&apos;re in!</h1>
            <p className="mb-6 text-white/60 leading-relaxed">{success.message}</p>

            <div className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-6 py-4">
              <div className="text-4xl font-extrabold text-orange-400">
                {success.credits.toLocaleString()}
              </div>
              <div className="text-sm text-white/50 mt-1">lifetime credits added</div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3 text-xs text-white/50">
              {[
                { icon: Zap, label: 'Text-to-video' },
                { icon: Film, label: 'Image-to-video' },
                { icon: Shield, label: 'Lip sync' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.03] py-3">
                  <Icon className="h-4 w-4 text-orange-400" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-400 hover:-translate-y-0.5"
            >
              <Zap className="h-4 w-4" />
              Start Creating Now
            </Link>

            <p className="mt-4 text-xs text-white/30">
              Got more codes? Come back and redeem each one separately.
            </p>
          </div>

        ) : (
          /* ── Redemption form ────────────────────────────────────────────── */
          <div
            className="rounded-3xl p-px"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.5) 0%, rgba(249,115,22,0.1) 50%, transparent 100%)',
              boxShadow: '0 0 40px rgba(249,115,22,0.15)',
            }}
          >
            <div className="rounded-3xl p-8" style={{ background: 'linear-gradient(135deg, #1a0f00 0%, #0a0a0f 100%)' }}>

              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30">
                  <Gift className="h-7 w-7 text-amber-400" />
                </div>
                <h1 className="mb-2 text-2xl font-extrabold text-white">Redeem AppSumo Code</h1>
                <p className="text-sm text-white/50 leading-relaxed">
                  Enter your AppSumo lifetime deal code below.
                  Each code unlocks <strong className="text-white">2,400 lifetime credits</strong>.
                </p>
              </div>

              {/* What you get */}
              <div className="mb-7 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                  What you get
                </p>
                <ul className="space-y-2">
                  {[
                    '2,400 lifetime credits per code',
                    'Text-to-video generation',
                    'Image-to-video animation',
                    'Lip sync with TTS',
                    'Commercial licence included',
                    'Stack multiple codes for more credits',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5 text-orange-400" />
                      </div>
                      <span className="text-white/60">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Input */}
              <div className="mb-4">
                <label htmlFor="code" className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/50">
                  AppSumo Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleRedeem()}
                  placeholder="CF-XXXX-XXXX-XXXX"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-mono text-white placeholder-white/20 outline-none transition-all focus:border-orange-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-orange-500/30"
                  disabled={loading}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {/* CTA */}
              <button
                onClick={handleRedeem}
                disabled={loading || !code.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:bg-orange-400 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating…
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    Redeem Code
                  </>
                )}
              </button>

              <p className="mt-5 text-center text-xs text-white/30">
                Not an AppSumo customer?{' '}
                <Link href="/pricing" className="text-orange-400 hover:text-orange-300">
                  Buy a plan here
                </Link>
              </p>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
