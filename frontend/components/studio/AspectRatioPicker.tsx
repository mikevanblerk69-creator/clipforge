'use client'

import { cn } from '@/lib/utils'

type AspectRatio = '16:9' | '9:16' | '1:1'

interface AspectRatioOption {
  value: AspectRatio
  label: string
  sublabel: string
  preview: { width: number; height: number }
}

const OPTIONS: AspectRatioOption[] = [
  {
    value: '16:9',
    label: '16:9',
    sublabel: 'Landscape',
    preview: { width: 48, height: 27 },
  },
  {
    value: '9:16',
    label: '9:16',
    sublabel: 'Portrait',
    preview: { width: 27, height: 48 },
  },
  {
    value: '1:1',
    label: '1:1',
    sublabel: 'Square',
    preview: { width: 38, height: 38 },
  },
]

interface AspectRatioPickerProps {
  value: AspectRatio
  onChange: (value: AspectRatio) => void
  className?: string
}

export function AspectRatioPicker({ value, onChange, className }: AspectRatioPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground/90">Aspect Ratio</label>
      <div className="flex gap-2">
        {OPTIONS.map((option) => {
          const isSelected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200',
                isSelected
                  ? 'border-orange bg-orange/8 shadow-[0_0_12px_rgba(255,107,43,0.15)]'
                  : 'border-border bg-surface-2 hover:border-orange/30'
              )}
            >
              {/* Visual preview rectangle */}
              <div className="flex items-center justify-center h-12">
                <div
                  className={cn(
                    'rounded-sm border-2 transition-colors',
                    isSelected ? 'border-orange bg-orange/20' : 'border-muted bg-surface-3'
                  )}
                  style={{
                    width: `${option.preview.width}px`,
                    height: `${option.preview.height}px`,
                  }}
                />
              </div>

              <div className="text-center">
                <div
                  className={cn(
                    'text-xs font-bold transition-colors',
                    isSelected ? 'text-orange' : 'text-foreground'
                  )}
                >
                  {option.label}
                </div>
                <div className="text-[10px] text-muted">{option.sublabel}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
