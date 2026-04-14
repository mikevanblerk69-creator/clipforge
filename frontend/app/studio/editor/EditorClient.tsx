'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Scissors,
  Type,
  Droplets,
  Download,
  Link2,
  Upload,
  Info,
  Construction,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { VideoPlayer } from '@/components/studio/VideoPlayer'
import { useCredits } from '@/hooks/useCredits'
import { cn } from '@/lib/utils'

interface EditorClientProps {
  accessToken: string
  userEmail: string
}

type TextPosition = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export default function EditorClient({ accessToken, userEmail }: EditorClientProps) {
  const { balance } = useCredits(accessToken)

  // Video source
  const [videoSource, setVideoSource] = useState<'url' | 'upload'>('url')
  const [videoUrl, setVideoUrl] = useState('')
  const [activeVideoUrl, setActiveVideoUrl] = useState('')

  // Trim
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)

  // Text overlay
  const [overlayText, setOverlayText] = useState('')
  const [textPosition, setTextPosition] = useState<TextPosition>('bottom-center')
  const [fontSize, setFontSize] = useState(24)
  const [textColor, setTextColor] = useState('#FFFFFF')

  // Watermark
  const [addWatermark, setAddWatermark] = useState(false)

  const handleLoadVideo = () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL')
      return
    }
    setActiveVideoUrl(videoUrl.trim())
    toast.success('Video loaded')
  }

  const handleExport = () => {
    toast.info('Full editor processing coming in v2', {
      description: 'Basic overlay export will be available in the next update.',
      duration: 5000,
    })
  }

  const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'center', label: 'Center' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-center', label: 'Bottom Center' },
    { value: 'bottom-right', label: 'Bottom Right' },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header token={accessToken} userEmail={userEmail} creditBalance={balance} />

      <div className="flex flex-1 pt-16">
        <div className="hidden md:flex">
          <SidebarNav />
        </div>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-display text-4xl tracking-wide mb-1 flex items-center gap-3">
                  VIDEO EDITOR
                  <span className="text-xs font-sans font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full tracking-normal">
                    BETA
                  </span>
                </h1>
                <p className="text-sm text-muted">
                  Trim, add text overlays, and export your videos
                </p>
              </div>
            </div>

            {/* Coming soon banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-orange/5 border border-orange/20 mb-6"
            >
              <Construction className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange mb-0.5">
                  Full editor processing coming in v2
                </p>
                <p className="text-xs text-muted">
                  Current version: design and preview your edits. Export functionality with full processing
                  (trim, text burn-in, watermark) will be available in the next major update.
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Video Source */}
              <div className="lg:col-span-1 space-y-4">
                {/* Video Source Selector */}
                <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Play className="w-4 h-4 text-orange" />
                    Video Source
                  </h3>

                  <div className="flex gap-2">
                    {([
                      { value: 'url', label: 'URL', icon: Link2 },
                      { value: 'upload', label: 'Upload', icon: Upload },
                    ] as { value: 'url' | 'upload'; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setVideoSource(value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-all duration-200',
                          videoSource === value
                            ? 'border-orange bg-orange/8 text-orange'
                            : 'border-border bg-surface-2 text-muted hover:border-orange/30'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {videoSource === 'url' ? (
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-xl text-sm text-foreground placeholder-muted/60 focus:outline-none focus:border-orange transition-all duration-200"
                      />
                      <button
                        onClick={handleLoadVideo}
                        className="w-full py-2 bg-orange/10 hover:bg-orange/20 text-orange text-sm font-medium rounded-xl transition-all duration-200 border border-orange/20"
                      >
                        Load Video
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                      <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                      <p className="text-xs text-muted">Upload coming soon</p>
                    </div>
                  )}
                </div>

                {/* Trim Controls */}
                <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-cyan" />
                    Trim
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <label>Start point</label>
                        <span className="font-mono">{trimStart}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={trimEnd - 1}
                        value={trimStart}
                        onChange={(e) => setTrimStart(Number(e.target.value))}
                        className="w-full accent-orange"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <label>End point</label>
                        <span className="font-mono">{trimEnd}%</span>
                      </div>
                      <input
                        type="range"
                        min={trimStart + 1}
                        max={100}
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(Number(e.target.value))}
                        className="w-full accent-orange"
                      />
                    </div>

                    {/* Visual trim bar */}
                    <div className="h-2 rounded-full bg-surface-3 relative overflow-hidden">
                      <div
                        className="absolute h-full bg-gradient-to-r from-orange to-cyan rounded-full"
                        style={{ left: `${trimStart}%`, width: `${trimEnd - trimStart}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted text-center">
                      Keeping {trimEnd - trimStart}% of video
                    </p>
                  </div>
                </div>

                {/* Text Overlay */}
                <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Type className="w-4 h-4 text-purple-400" />
                    Text Overlay
                  </h3>

                  <input
                    type="text"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    placeholder="Enter overlay text..."
                    maxLength={80}
                    className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-xl text-sm text-foreground placeholder-muted/60 focus:outline-none focus:border-purple-500/60 transition-all duration-200"
                  />

                  {/* Position */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted">Position</label>
                    <select
                      value={textPosition}
                      onChange={(e) => setTextPosition(e.target.value as TextPosition)}
                      className="w-full px-3 py-2 bg-surface-2 border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-purple-500/60 transition-all duration-200"
                    >
                      {TEXT_POSITIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Font size */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted">Font size: {fontSize}px</label>
                      <input
                        type="range"
                        min={12}
                        max={72}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    {/* Color */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
                        />
                        <span className="text-xs font-mono text-muted">{textColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Watermark toggle */}
                <div className="p-5 bg-surface border border-border rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Droplets className="w-4 h-4 text-muted" />
                      <div>
                        <p className="text-sm font-medium">ClipForge Watermark</p>
                        <p className="text-xs text-muted">Add branding to exported video</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setAddWatermark(!addWatermark)}
                      className={cn(
                        'relative w-10 h-5.5 rounded-full transition-colors duration-200',
                        addWatermark ? 'bg-orange' : 'bg-surface-3 border border-border'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                          addWatermark ? 'left-5.5' : 'left-0.5'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* CENTER + RIGHT: Preview */}
              <div className="lg:col-span-2 space-y-4">
                {/* Video Preview */}
                <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold">Preview</h3>

                  <div className="relative">
                    <VideoPlayer url={activeVideoUrl || null} />

                    {/* Text overlay preview */}
                    {overlayText && activeVideoUrl && (
                      <div
                        className={cn(
                          'absolute pointer-events-none px-3 py-1 rounded',
                          textPosition.includes('top') ? 'top-3' : textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-12',
                          textPosition.includes('left') ? 'left-3' : textPosition.includes('right') ? 'right-3' : 'left-1/2 -translate-x-1/2'
                        )}
                        style={{
                          fontSize: `${Math.min(fontSize, 32)}px`,
                          color: textColor,
                          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                          fontWeight: 'bold',
                        }}
                      >
                        {overlayText}
                      </div>
                    )}
                  </div>
                </div>

                {/* Export */}
                <div className="p-5 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold">Export Settings</h3>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-surface-2 rounded-xl border border-border">
                      <span className="text-xs text-muted block mb-0.5">Trim</span>
                      <span className="font-medium">{trimStart}% → {trimEnd}%</span>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-xl border border-border">
                      <span className="text-xs text-muted block mb-0.5">Text overlay</span>
                      <span className="font-medium">{overlayText ? `"${overlayText.slice(0, 15)}..."` : 'None'}</span>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-xl border border-border">
                      <span className="text-xs text-muted block mb-0.5">Text position</span>
                      <span className="font-medium capitalize">{textPosition.replace('-', ' ')}</span>
                    </div>
                    <div className="p-3 bg-surface-2 rounded-xl border border-border">
                      <span className="text-xs text-muted block mb-0.5">Watermark</span>
                      <span className={cn('font-medium', addWatermark ? 'text-orange' : 'text-muted')}>
                        {addWatermark ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange/5 border border-orange/15">
                    <Info className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted">
                      Full export processing (trim + overlay burn-in) is coming in v2.
                      Click Export to preview your settings — the processed video will be available soon.
                    </p>
                  </div>

                  <button
                    onClick={handleExport}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange/10 hover:bg-orange/20 text-orange font-bold rounded-xl transition-all duration-200 border border-orange/20 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export Video (Preview Settings)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
