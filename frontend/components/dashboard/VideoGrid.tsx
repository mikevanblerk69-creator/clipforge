'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Play,
  Trash2,
  Download,
  Film,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import type { VideoHistoryItem } from '@/lib/api'

interface VideoGridProps {
  videos: VideoHistoryItem[]
  isLoading?: boolean
  onDelete?: (id: string) => void
  onPlay?: (video: VideoHistoryItem) => void
  className?: string
}

const TYPE_LABELS: Record<string, string> = {
  text2video: 'Text → Video',
  image2video: 'Image → Video',
  lipsync: 'Lip Sync',
  editor: 'Editor',
}

const TYPE_COLORS: Record<string, string> = {
  text2video: 'bg-orange/10 text-orange border-orange/20',
  image2video: 'bg-cyan/10 text-cyan border-cyan/20',
  lipsync: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  editor: 'bg-green-500/10 text-green-400 border-green-500/20',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  queued: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'text-muted',
  processing: 'text-cyan',
  completed: 'text-green-400',
  failed: 'text-red-400',
}

function VideoCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-surface border border-border">
      <div className="aspect-video shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-2/3 rounded shimmer" />
        <div className="h-2.5 w-1/2 rounded shimmer" />
        <div className="h-2.5 w-1/3 rounded shimmer" />
      </div>
    </div>
  )
}

function VideoCard({
  video,
  onDelete,
  onPlay,
}: {
  video: VideoHistoryItem
  onDelete?: (id: string) => void
  onPlay?: (video: VideoHistoryItem) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const StatusIcon = STATUS_ICONS[video.status] || CheckCircle
  const typeColor = TYPE_COLORS[video.type] || TYPE_COLORS.text2video

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    await onDelete?.(video.id)
    setDeleting(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-xl overflow-hidden bg-surface border border-border hover:border-orange/20 transition-all duration-200 group hover:shadow-card-hover"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-surface-2 overflow-hidden">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.prompt || 'Generated video'}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-8 h-8 text-surface-3" />
          </div>
        )}

        {/* Status overlay */}
        {video.status !== 'completed' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5">
              <StatusIcon
                className={cn(
                  'w-6 h-6',
                  STATUS_COLORS[video.status],
                  video.status === 'processing' && 'animate-spin'
                )}
              />
              <span className={cn('text-xs font-medium', STATUS_COLORS[video.status])}>
                {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
              </span>
            </div>
          </div>
        )}

        {/* Play overlay (completed videos) */}
        {video.status === 'completed' && video.video_url && (
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
          >
            <button
              onClick={() => onPlay?.(video)}
              className="w-12 h-12 rounded-full bg-orange/80 hover:bg-orange flex items-center justify-center transition-all duration-200 shadow-glow-orange"
            >
              <Play className="w-5 h-5 text-white ml-0.5" />
            </button>
          </motion.div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', typeColor)}>
            {TYPE_LABELS[video.type] || video.type}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Prompt */}
        <p className="text-xs text-foreground/80 line-clamp-2 mb-2 leading-relaxed min-h-[2.5rem]">
          {video.prompt || <span className="text-muted italic">No prompt</span>}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>{formatDateTime(video.created_at)}</span>
          <span className="flex items-center gap-1 text-cyan">
            ⚡ {video.credits_used}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {video.status === 'completed' && video.video_url && (
            <a
              href={video.video_url}
              download
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-surface-2 hover:bg-orange/10 hover:text-orange border border-border hover:border-orange/30 text-xs font-medium text-muted transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-red-500/10 hover:text-red-400 border border-border hover:border-red-500/30 text-xs font-medium text-muted transition-all duration-200 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function VideoGrid({
  videos,
  isLoading,
  onDelete,
  onPlay,
  className,
}: VideoGridProps) {
  if (isLoading && videos.length === 0) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!isLoading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
          <Film className="w-7 h-7 text-muted" />
        </div>
        <h3 className="text-base font-semibold mb-1">No videos yet</h3>
        <p className="text-sm text-muted">Start creating to see your videos here!</p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onDelete={onDelete}
          onPlay={onPlay}
        />
      ))}
    </div>
  )
}
