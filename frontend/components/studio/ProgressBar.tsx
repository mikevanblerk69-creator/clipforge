'use client'

import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | null

interface ProgressBarProps {
  progress: number
  status: JobStatus
  estimatedSeconds?: number | null
  className?: string
}

const STATUS_CONFIG: Record<
  Exclude<JobStatus, null>,
  { label: string; color: string; icon: React.ElementType; description: string }
> = {
  queued: {
    label: 'Queued',
    color: 'text-muted',
    icon: Clock,
    description: 'Your job is in the queue...',
  },
  processing: {
    label: 'Processing',
    color: 'text-cyan',
    icon: Loader2,
    description: 'AI is generating your video...',
  },
  completed: {
    label: 'Complete',
    color: 'text-green-400',
    icon: CheckCircle,
    description: 'Your video is ready!',
  },
  failed: {
    label: 'Failed',
    color: 'text-red-400',
    icon: XCircle,
    description: 'Generation failed. Please try again.',
  },
}

function getProgressLabel(progress: number, status: JobStatus): string {
  if (status === 'queued') return 'Waiting in queue...'
  if (status === 'completed') return 'Done!'
  if (status === 'failed') return 'Failed'
  if (progress < 20) return 'Initializing model...'
  if (progress < 40) return 'Analyzing prompt...'
  if (progress < 60) return 'Generating frames...'
  if (progress < 80) return 'Applying style...'
  if (progress < 95) return 'Finalizing video...'
  return 'Almost done...'
}

export function ProgressBar({
  progress,
  status,
  estimatedSeconds,
  className,
}: ProgressBarProps) {
  if (!status) return null

  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const label = getProgressLabel(progress, status)
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'w-4 h-4',
              config.color,
              status === 'processing' && 'animate-spin'
            )}
          />
          <span className={cn('text-sm font-semibold', config.color)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-right">
          <span className="text-sm font-mono text-muted">
            {clampedProgress}%
          </span>
          {estimatedSeconds && status === 'processing' && (
            <span className="text-xs text-muted/60">
              ~{estimatedSeconds}s remaining
            </span>
          )}
        </div>
      </div>

      {/* Progress track */}
      <div className="relative h-2.5 rounded-full bg-surface-3 overflow-hidden">
        {/* Background shimmer (during processing) */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite] bg-[length:200%_100%]" />
        )}

        {/* Fill bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            status === 'completed'
              ? 'bg-green-500'
              : status === 'failed'
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-orange to-cyan'
          )}
        >
          {/* Shimmer overlay on fill */}
          {status === 'processing' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
          )}
        </motion.div>
      </div>

      {/* Status description */}
      <motion.p
        key={label}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-muted"
      >
        {label}
      </motion.p>

      {/* Processing steps (visual) */}
      {(status === 'processing' || status === 'queued') && (
        <div className="flex items-center gap-1.5">
          {[10, 30, 50, 70, 90].map((step) => (
            <div
              key={step}
              className={cn(
                'h-1 flex-1 rounded-full transition-all duration-500',
                clampedProgress >= step
                  ? 'bg-orange/70'
                  : clampedProgress >= step - 10
                  ? 'bg-orange/30 animate-pulse'
                  : 'bg-surface-3'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
