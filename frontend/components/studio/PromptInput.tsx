'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  maxLength?: number
  showNegativePrompt?: boolean
  negativePrompt?: string
  onNegativePromptChange?: (value: string) => void
  className?: string
  required?: boolean
}

export function PromptInput({
  value,
  onChange,
  label = 'Prompt',
  placeholder = 'Describe your video scene in detail...',
  maxLength = 500,
  showNegativePrompt = false,
  negativePrompt = '',
  onNegativePromptChange,
  className,
  required,
}: PromptInputProps) {
  const [negativeOpen, setNegativeOpen] = useState(false)
  const charCount = value.length
  const isNearLimit = charCount > maxLength * 0.85
  const isAtLimit = charCount >= maxLength

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground/90">
          {label}
          {required && <span className="text-orange ml-1">*</span>}
        </label>
        <span
          className={cn(
            'text-xs tabular-nums transition-colors',
            isAtLimit
              ? 'text-red-400'
              : isNearLimit
              ? 'text-yellow-400'
              : 'text-muted'
          )}
        >
          {charCount}/{maxLength}
        </span>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
          className={cn(
            'w-full bg-surface-2 border rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted/60 resize-none transition-all duration-200 outline-none leading-relaxed',
            isAtLimit
              ? 'border-red-500/60 focus:border-red-500'
              : 'border-border focus:border-orange focus:shadow-[0_0_0_2px_rgba(255,107,43,0.15)]'
          )}
          style={{ minHeight: '120px' }}
        />

        {isAtLimit && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Limit reached</span>
          </div>
        )}
      </div>

      {/* Negative Prompt Toggle */}
      {showNegativePrompt && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setNegativeOpen(!negativeOpen)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
          >
            {negativeOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Negative Prompt{' '}
            <span className="text-muted/60">(optional — what to avoid)</span>
          </button>

          {negativeOpen && (
            <div className="mt-2">
              <textarea
                value={negativePrompt}
                onChange={(e) => onNegativePromptChange?.(e.target.value)}
                placeholder="blurry, low quality, distorted faces, watermark..."
                rows={2}
                maxLength={200}
                className="w-full bg-surface-2 border border-border focus:border-cyan focus:shadow-[0_0_0_2px_rgba(0,212,232,0.15)] rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted/60 resize-none transition-all duration-200 outline-none leading-relaxed"
              />
              <p className="text-xs text-muted mt-1">
                Describe elements you want to exclude from the video.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onChange(prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted hover:border-orange/40 hover:text-orange hover:bg-orange/5 transition-all duration-200"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  'Cinematic drone shot over mountain range at sunset',
  'Neon-lit city street in the rain, cyberpunk style',
  'Time-lapse of storm clouds rolling over ocean',
  'Close-up of fire crackling in slow motion',
]
