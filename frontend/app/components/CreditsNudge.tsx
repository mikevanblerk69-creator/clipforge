'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function CreditsNudge({ credits }: { credits: number }) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (credits <= 3 && !dismissed) setVisible(true)
    else setVisible(false)
  }, [credits, dismissed])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/40 rounded-2xl p-4 w-72 shadow-2xl shadow-red-500/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-sm font-semibold text-white">
              {credits === 0 ? 'No credits left' : `Only ${credits} credit${credits === 1 ? '' : 's'} left`}
            </span>
          </div>
          <button onClick={() => { setDismissed(true); setVisible(false) }} className="text-white/30 hover:text-white/70 text-lg leading-none">×</button>
        </div>

        <div className="w-full h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all"
            style={{ width: `${Math.min((credits / 10) * 100, 100)}%` }}
          />
        </div>

        <p className="text-xs text-white/50 mb-3">Top up now to keep generating videos without interruption.</p>

        <Link
          href="/pricing"
          className="block w-full text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-violet-500/20"
        >
          Upgrade Now ⚡
        </Link>
      </div>

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}
