'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, RefreshCw, Download, AlertCircle, Upload, Mic, Type, Link2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { ProgressBar } from '@/components/studio/ProgressBar'
import { VideoPlayer } from '@/components/studio/VideoPlayer'
import { useJobPolling } from '@/hooks/useJobPolling'
import { useCredits } from '@/hooks/useCredits'
import { api } from '@/lib/api'
import { formatCredits, CREDIT_COSTS } from '@/lib/credits'
import { cn } from '@/lib/utils'

interface LipSyncClientProps {
  accessToken: string
  userEmail: string
}

type VideoSource = 'upload' | 'url'
type AudioSource = 'upload' | 'text'

const TTS_VOICES = [
  { id: 'alloy', label: 'Alloy', description: 'Neutral, balanced' },
  { id: 'echo', label: 'Echo', description: 'Male, deep' },
  { id: 'fable', label: 'Fable', description: 'British accent' },
  { id: 'nova', label: 'Nova', description: 'Female, warm' },
  { id: 'onyx', label: 'Onyx', description: 'Male, authoritative' },
  { id: 'shimmer', label: 'Shimmer', description: 'Female, soft' },
]

export default function LipSyncClient({ accessToken, userEmail }: LipSyncClientProps) {
  const [videoSource, setVideoSource] = useState<VideoSource>('url')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [audioSource, setAudioSource] = useState<AudioSource>('text')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [ttsText, setTtsText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [jobId, setJobId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  const { balance, deduct, refresh: refreshCredits } = useCredits(accessToken)
  const creditCost = CREDIT_COSTS.lipsync

  const canGenerate =
    balance >= creditCost &&
    (videoSource === 'url' ? videoUrl.trim().length > 0 : !!videoFile) &&
    (audioSource === 'text' ? ttsText.trim().length > 0 : !!audioFile)

  const { status, progress, videoUrl: outputVideoUrl, error, isPolling, reset: resetPolling } =
    useJobPolling({
      jobId,
      token: accessToken,
      onCompleted: (job) => {
        setGeneratedVideoUrl(job.video_url ?? null)
        setHasGenerated(true)
        refreshCredits()
        toast.success('Lip sync complete!', { description: 'Your video has been processed.' })
      },
      onFailed: (err) => {
        toast.error('Lip sync failed', { description: err })
      },
    })

  const handleGenerate = async () => {
    const ok = await deduct(creditCost, 'lipsync')
    if (!ok) return

    setIsSubmitting(true)
    resetPolling()
    setGeneratedVideoUrl(null)

    try {
      const job = await api.lipsync(
        {
          video_url: videoSource === 'url' ? videoUrl.trim() : undefined,
          audio_text: audioSource === 'text' ? ttsText.trim() : undefined,
          voice: audioSource === 'text' ? selectedVoice : undefined,
        },
        accessToken
      )
      setJobId(job.job_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start lip sync'
      toast.error('Failed', { description: msg })
      refreshCredits()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setJobId(null)
    resetPolling()
    setGeneratedVideoUrl(null)
    setHasGenerated(false)
  }

  const handleDownload = () => {
    const url = generatedVideoUrl || outputVideoUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `clipforge-lipsync-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const finalVideoUrl = generatedVideoUrl || outputVideoUrl
  const isGenerating = isPolling && status !== 'completed' && status !== 'failed'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header token={accessToken} userEmail={userEmail} creditBalance={balance} />

      <div className="flex flex-1 pt-16">
        <div className="hidden md:flex">
          <SidebarNav />
        </div>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="font-display text-4xl tracking-wide mb-1">LIP SYNC</h1>
              <p className="text-sm text-muted">
                Sync any audio to any face with AI-powered lip sync technology
              </p>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan/5 border border-cyan/20 mb-6">
              <Info className="w-4 h-4 text-cyan flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted">
                <span className="font-semibold text-cyan">Pro tip:</span> Lip sync works best with
                close-up face shots where the mouth is clearly visible and well-lit.
                Avoid obscured faces, extreme angles, or group shots.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT: Controls */}
              <div className="space-y-5">
                {/* Section 1: Video source */}
                <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-foreground/90 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange/20 text-orange text-[10px] font-bold flex items-center justify-center">1</span>
                    Video Source
                  </h3>

                  {/* Toggle */}
                  <div className="flex gap-2">
                    {([
                      { value: 'url', label: 'Paste URL', icon: Link2 },
                      { value: 'upload', label: 'Upload File', icon: Upload },
                    ] as { value: VideoSource; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setVideoSource(value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
                          videoSource === value
                            ? 'border-orange bg-orange/8 text-orange'
                            : 'border-border bg-surface-2 text-muted hover:border-orange/30'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {videoSource === 'url' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted">Video URL (MP4 or direct link)</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-sm text-foreground placeholder-muted/60 focus:outline-none focus:border-orange focus:shadow-[0_0_0_2px_rgba(255,107,43,0.15)] transition-all duration-200"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-orange/40 hover:bg-orange/3 transition-all duration-200"
                    >
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 100 * 1024 * 1024) {
                              toast.error('Video must be under 100MB')
                              return
                            }
                            setVideoFile(file)
                            toast.success(`Video selected: ${file.name}`)
                          }
                        }}
                      />
                      {videoFile ? (
                        <div className="flex items-center justify-center gap-2 text-green-400">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm font-medium">{videoFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted mx-auto mb-2" />
                          <p className="text-sm text-muted">Click to upload video</p>
                          <p className="text-xs text-muted/60 mt-0.5">MP4, MOV, AVI — Max 100MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Audio source */}
                <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-foreground/90 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange/20 text-orange text-[10px] font-bold flex items-center justify-center">2</span>
                    Audio Source
                  </h3>

                  {/* Toggle */}
                  <div className="flex gap-2">
                    {([
                      { value: 'text', label: 'Text to Speech', icon: Type },
                      { value: 'upload', label: 'Upload Audio', icon: Mic },
                    ] as { value: AudioSource; label: string; icon: React.ElementType }[]).map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setAudioSource(value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
                          audioSource === value
                            ? 'border-cyan bg-cyan/8 text-cyan'
                            : 'border-border bg-surface-2 text-muted hover:border-cyan/30'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {audioSource === 'text' ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted">
                          Text to speak
                          <span className="ml-1">({ttsText.length}/1000)</span>
                        </label>
                        <textarea
                          value={ttsText}
                          onChange={(e) => setTtsText(e.target.value)}
                          placeholder="Type what you want the person to say..."
                          maxLength={1000}
                          rows={4}
                          className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-sm text-foreground placeholder-muted/60 focus:outline-none focus:border-cyan focus:shadow-[0_0_0_2px_rgba(0,212,232,0.15)] transition-all duration-200 resize-none"
                        />
                      </div>

                      {/* Voice selector */}
                      <div className="space-y-2">
                        <label className="text-xs text-muted">Voice</label>
                        <div className="grid grid-cols-2 gap-2">
                          {TTS_VOICES.map((voice) => (
                            <button
                              key={voice.id}
                              onClick={() => setSelectedVoice(voice.id)}
                              className={cn(
                                'flex flex-col p-3 rounded-xl border text-left transition-all duration-200',
                                selectedVoice === voice.id
                                  ? 'border-cyan bg-cyan/8 text-cyan'
                                  : 'border-border bg-surface-2 text-muted hover:border-cyan/30'
                              )}
                            >
                              <span className={cn('text-sm font-semibold', selectedVoice === voice.id ? 'text-cyan' : 'text-foreground')}>
                                {voice.label}
                              </span>
                              <span className="text-[11px] text-muted mt-0.5">{voice.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => audioInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-cyan/40 hover:bg-cyan/3 transition-all duration-200"
                    >
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast.error('Audio must be under 50MB')
                              return
                            }
                            setAudioFile(file)
                            toast.success(`Audio selected: ${file.name}`)
                          }
                        }}
                      />
                      {audioFile ? (
                        <div className="flex items-center justify-center gap-2 text-green-400">
                          <Mic className="w-4 h-4" />
                          <span className="text-sm font-medium">{audioFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Mic className="w-6 h-6 text-muted mx-auto mb-2" />
                          <p className="text-sm text-muted">Click to upload audio</p>
                          <p className="text-xs text-muted/60 mt-0.5">MP3, WAV, M4A — Max 50MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <div className="space-y-3">
                  {balance < creditCost && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Need {formatCredits(creditCost)}, have {formatCredits(balance)}.
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isSubmitting || isGenerating}
                    className={cn(
                      'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-200',
                      canGenerate && !isSubmitting && !isGenerating
                        ? 'bg-orange hover:bg-orange-dark text-white shadow-glow-orange hover:shadow-glow-orange-lg hover:-translate-y-0.5'
                        : 'bg-surface-3 text-muted cursor-not-allowed border border-border'
                    )}
                  >
                    {isSubmitting || isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        {isSubmitting ? 'Starting...' : 'Processing lip sync...'}
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Sync Lips
                        <span className="text-sm font-normal opacity-75">
                          — {formatCredits(creditCost)}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* RIGHT: Output */}
              <div className="space-y-4">
                <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground/80">Output Preview</h2>
                    {hasGenerated && (
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-orange transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try again
                      </button>
                    )}
                  </div>

                  <VideoPlayer
                    url={finalVideoUrl}
                    title="Lip sync result"
                    onDownload={handleDownload}
                  />

                  <AnimatePresence>
                    {(isGenerating || (status && status !== 'completed')) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <ProgressBar progress={progress} status={status} estimatedSeconds={60} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  {finalVideoUrl && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleDownload}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-cyan/30 bg-cyan/5 hover:bg-cyan/10 text-cyan font-semibold rounded-xl transition-all duration-200 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download Video
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
