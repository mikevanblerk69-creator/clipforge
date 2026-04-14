'use client'

import { Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCreditCost } from '@/lib/credits'

type Duration = 5 | 10
type Quality = 'standard' | 'pro'

interface DurationSelectorProps {
  value: Duration
  onChange: (value: Duration) => void
  quality?: Quality
  type?: 'text2video' | 'image2video'
  className?: string
}

export function DurationSelector({
  value,
  onChange,
  quality = 'standard',
  type = 'text2video',
  className,
}: DurationSelectorProps) {
  const options: { duration: Duration; label: string; description: string }[] = [
    {
      duration: 5,
      label: '5 seconds',
      description: 'Quick clip',
    },
    {
      duration: 10,
      label: '10 seconds',
      description: 'Full scene',
    },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground/90 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-muted" />
        Duration
      </label>
      <div className="flex gap-2">
        {options.map(({ duration, label, description }) => {
          const isSelected = value === duration
          const creditCost = getCreditCost(type, duration, quality)

          return (
            <button
              key={duration}
              type="button"
              onClick={() => onChange(duration)}
              className={cn(
                'flex-1 flex flex-col gap-2 p-3.5 rounded-xl border text-left transition-all duration-200',
                isSelected
                  ? 'border-orange bg-orange/8 shadow-[0_0_12px_rgba(255,107,43,0.15)]'
                  : 'border-border bg-surface-2 hover:border-orange/30'
              )}
            >
              <div
                className={cn(
                  'text-sm font-semibold transition-colors',
                  isSelected ? 'text-orange' : 'text-foreground'
                )}
              >
                {label}
              </div>
              <div className="text-[11px] text-muted">{description}</div>
              <div className="flex items-center gap-1 text-xs font-medium text-cyan">
                <Zap className="w-3 h-3" />
                {creditCost} credits
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
