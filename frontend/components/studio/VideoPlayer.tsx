'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Film,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  url?: string | null
  title?: string
  onDownload?: () => void
  className?: string
}

export function VideoPlayer({ url, title, onDownload, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null)

  const handlePlayPause = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100
    setProgress(pct)
  }

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = pct * videoRef.current.duration
  }

  const handleMuteToggle = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleFullscreen = () => {
    if (!videoRef.current) return
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen()
    }
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
      return
    }
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = title ? `${title}.mp4` : 'clipforge-video.mp4'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 2500)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // No video — placeholder state
  if (!url) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-2 aspect-video',
          className
        )}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="w-16 h-16 rounded-full bg-surface-3 border border-border flex items-center justify-center mb-4"
        >
          <Film className="w-7 h-7 text-muted" />
        </motion.div>
        <p className="text-sm text-muted">Your generated video will appear here</p>
        <p className="text-xs text-muted/60 mt-1">Set your prompt and click Generate</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden bg-black border border-border group',
        className
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={url}
        className="w-full aspect-video object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onClick={handlePlayPause}
      />

      {/* Controls overlay */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent"
      >
        {/* Title */}
        {title && (
          <div className="absolute top-3 left-3 right-3">
            <p className="text-xs font-medium text-white/70 truncate">{title}</p>
          </div>
        )}

        {/* Download button (top right) */}
        <button
          onClick={handleDownload}
          className="absolute top-3 right-3 p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-orange/20 transition-all duration-200"
          title="Download video"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Bottom controls */}
        <div className="px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div
            className="h-1 rounded-full bg-white/20 cursor-pointer group/progress relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange to-cyan transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            {/* Scrubber handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-orange/30 flex items-center justify-center transition-all duration-200 text-white"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              {/* Mute */}
              <button
                onClick={handleMuteToggle}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Time */}
              <span className="text-xs text-white/60 tabular-nums">
                {formatTime((progress / 100) * duration)} / {formatTime(duration)}
              </span>
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 text-white"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Center play button (when paused) */}
      {!isPlaying && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-orange/80 backdrop-blur-sm flex items-center justify-center shadow-glow-orange hover:bg-orange transition-all duration-200">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </motion.button>
      )}
    </div>
  )
}
