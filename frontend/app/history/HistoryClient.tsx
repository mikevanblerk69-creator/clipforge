'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { VideoGrid } from '@/components/dashboard/VideoGrid'
import { VideoPlayer } from '@/components/studio/VideoPlayer'
import { useVideoHistory } from '@/hooks/useVideoHistory'
import { useCredits } from '@/hooks/useCredits'
import type { VideoHistoryItem } from '@/lib/api'
import { cn } from '@/lib/utils'

interface HistoryClientProps {
  accessToken: string
  userEmail: string
}

const FILTER_OPTIONS = [
  { value: undefined, label: 'All Videos' },
  { value: 'text2video', label: 'Text → Video' },
  { value: 'image2video', label: 'Image → Video' },
  { value: 'lipsync', label: 'Lip Sync' },
  { value: 'editor', label: 'Editor' },
]

export default function HistoryClient({ accessToken, userEmail }: HistoryClientProps) {
  const { balance } = useCredits(accessToken)
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined)
  const [playingVideo, setPlayingVideo] = useState<VideoHistoryItem | null>(null)

  const { videos, isLoading, total, hasMore, refresh, loadMore, deleteVideo, setTypeFilter } =
    useVideoHistory({ token: accessToken, perPage: 20 })

  const handleFilterChange = (filter: string | undefined) => {
    setActiveFilter(filter)
    setTypeFilter(filter)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header token={accessToken} userEmail={userEmail} creditBalance={balance} />

      <div className="flex flex-1 pt-16">
        <div className="hidden md:flex">
          <SidebarNav />
        </div>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {/* Page header */}
            <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-display text-4xl tracking-wide mb-1">VIDEO HISTORY</h1>
                <p className="text-sm text-muted">
                  {total > 0 ? `${total} video${total === 1 ? '' : 's'} total` : 'Your generated videos'}
                </p>
              </div>
              <button
                onClick={refresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:border-orange/30 transition-all duration-200"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <SlidersHorizontal className="w-4 h-4 text-muted flex-shrink-0" />
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={label}
                    onClick={() => handleFilterChange(value)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
                      activeFilter === value
                        ? 'border-orange bg-orange/10 text-orange'
                        : 'border-border bg-surface-2 text-muted hover:border-orange/30 hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Grid */}
            <VideoGrid
              videos={videos}
              isLoading={isLoading}
              onDelete={deleteVideo}
              onPlay={(video) => setPlayingVideo(video)}
            />

            {/* Load more */}
            {hasMore && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mt-8"
              >
                <button
                  onClick={loadMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm text-muted hover:text-foreground hover:border-orange/30 transition-all duration-200"
                >
                  <ChevronDown className="w-4 h-4" />
                  Load more videos
                </button>
              </motion.div>
            )}

            {/* Loading more indicator */}
            {isLoading && videos.length > 0 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading more...
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Video Lightbox */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPlayingVideo(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPlayer
              url={playingVideo.video_url}
              title={playingVideo.prompt ?? 'Video'}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-muted line-clamp-1">
                {playingVideo.prompt || 'No prompt'}
              </p>
              <button
                onClick={() => setPlayingVideo(null)}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
