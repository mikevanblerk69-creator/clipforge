'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Model {
  id: string
  label: string
  emoji: string
  description: string
  badge?: string
}

const MODELS: Model[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    emoji: '🎬',
    description: 'Film-quality footage with dramatic lighting',
    badge: 'Popular',
  },
  {
    id: 'anime',
    label: 'Anime',
    emoji: '⛩️',
    description: 'Japanese animation style with vibrant colors',
  },
  {
    id: 'realistic',
    label: 'Realistic',
    emoji: '📷',
    description: 'Photorealistic visuals, true to life',
  },
  {
    id: 'abstract',
    label: 'Abstract',
    emoji: '🌀',
    description: 'Artistic, surreal and creative visuals',
  },
]

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground/90">
        Style
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MODELS.map((model) => {
          const isSelected = value === model.id
          return (
            <motion.button
              key={model.id}
              type="button"
              onClick={() => onChange(model.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative p-3.5 rounded-xl border text-left transition-all duration-200 group',
                isSelected
                  ? 'border-orange bg-orange/8 shadow-[0_0_16px_rgba(255,107,43,0.2)]'
                  : 'border-border bg-surface-2 hover:border-orange/30 hover:bg-surface-3'
              )}
            >
              {/* Popular badge */}
              {model.badge && (
                <span className="absolute top-2 right-2 text-[9px] font-bold bg-orange/20 text-orange px-1.5 py-0.5 rounded-full">
                  {model.badge}
                </span>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange shadow-[0_0_8px_rgba(255,107,43,0.8)]" />
              )}

              <span className="text-2xl mb-2 block">{model.emoji}</span>
              <div
                className={cn(
                  'text-sm font-semibold mb-0.5 transition-colors',
                  isSelected ? 'text-orange' : 'text-foreground'
                )}
              >
                {model.label}
              </div>
              <div className="text-[11px] text-muted leading-tight">
                {model.description}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
