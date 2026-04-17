'use client'
import { useEffect, useState } from 'react'

function getTimeUntilSunday() {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7)
  sunday.setHours(23, 59, 59, 0)
  const diff = sunday.getTime() - now.getTime()
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export default function LaunchOfferBanner() {
  const [time, setTime] = useState(getTimeUntilSunday())
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeUntilSunday()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!visible) return null

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b border-amber-500/30 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-amber-400 text-lg">⚡</span>
          <span className="text-amber-200 font-semibold text-sm">
            Launch Special — <span className="text-white">+20% bonus credits</span> on every plan
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Ends in:</span>
          {[
            { label: 'D', val: time.days },
            { label: 'H', val: time.hours },
            { label: 'M', val: time.minutes },
            { label: 'S', val: time.seconds },
          ].map(({ label, val }) => (
            <div key={label} className="flex flex-col items-center bg-black/30 rounded-lg px-2 py-1 min-w-[36px]">
              <span className="text-white font-mono font-bold text-sm">{pad(val)}</span>
              <span className="text-white/30 text-[10px]">{label}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setVisible(false)} className="text-white/30 hover:text-white/60 text-sm ml-2">✕</button>
      </div>
    </div>
  )
}
