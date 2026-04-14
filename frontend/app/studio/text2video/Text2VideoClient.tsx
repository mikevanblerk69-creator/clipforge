'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, RefreshCw, Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { PromptInput } from '@/components/studio/PromptInput'
import { ModelSelector } from '@/components/studio/ModelSelector'
import { AspectRatioPicker } from '@/components/studio/AspectRatioPicker'
import { DurationSelector } from '@/components/studio/DurationSelector'
import { ProgressBar } from '@/components/studio/ProgressBar'
import { VideoPlayer } from '@/components/studio/VideoPlayer'
import { useJobPolling } from '@/hooks/useJobPolling'
import { useCredits } from '@/hooks/useCredits'
import { api } from '@/lib/api'
import { getCreditCost, formatCredits } from '@/lib/credits'
import { cn } from '@/lib/utils'

interface Text2VideoClientProps {
  accessToken: string
  userEmail: string
}

export default function Text2VideoClient({ accessToken, userEmail }: Text2VideoClientProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [style, setStyle] = useState('cinematic')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [duration, setDuration] = useState<5 | 10>(5)
  const [quality, setQuality] = useState<'standard' | 'pro'>('standard')
  const [jobId, setJobId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const { balance, deduct, refresh: refreshCredits } = useCredits(accessToken)

  const creditCost = getCreditCost('text2video', duration, quality)
  const canGenerate = balance >= creditCost && prompt.trim().length >= 5

  const { status, progress, videoUrl, error, isPolling, reset: resetPolling } =
    useJobPolling({
      jobId,
      token: accessToken,
      onCompleted: (job) => {
        setGeneratedVideoUrl(job.video_url ?? null)
        setHasGenerated(true)
        refreshCredits()
        toast.success('Video generated!', {
          description: 'Your cinematic video is ready.',
          duration: 5000,
        })
      },
      onFailed: (err) => {
        toast.error('Generation failed', { description: err })
      },
    })

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }
    if (prompt.trim().length < 5) {
      toast.error('Prompt is too short — be more descriptive!')
      return
    }

    const ok = await deduct(creditCost, `text2video_${duration}s_${quality}`)
    if (!ok) return

    setIsSubmitting(true)
    resetPolling()
    setGeneratedVideoUrl(null)

    try {
      const job = await api.text2video(
        {
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          style,
          aspect_ratio: aspectRatio,
          duration,
          quality,
        },
        accessToken
      )
      setJobId(job.job_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start generation'
      toast.error('Generation failed', { description: msg })
      // Refund credits
      refreshCredits()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateAnother = () => {
    setJobId(null)
    resetPolling()
    setGeneratedVideoUrl(null)
    setHasGenerated(false)
    setPrompt('')
  }

  const handleDownload = () => {
    const url = generatedVideoUrl || videoUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `clipforge-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const finalVideoUrl = generatedVideoUrl || videoUrl
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
            {/* Page header */}
            <div className="mb-8">
              <h1 className="font-display text-4xl tracking-wide mb-1">
                TEXT TO VIDEO
              </h1>
              <p className="text-sm text-muted">
                Describe your scene and let AI generate cinematic footage
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* ── LEFT PANEL: Controls ── */}
              <div className="space-y-6">
                <div className="p-6 bg-surface border border-border rounded-2xl space-y-6">
                  <PromptInput
                    value={prompt}
                    onChange={setPrompt}
                    label="Video Prompt"
                    placeholder="A cinematic aerial shot gliding over a misty mountain range at golden hour, fog rolling through the valleys..."
                    maxLength={500}
                    showNegativePrompt
                    negativePrompt={negativePrompt}
                    onNegativePromptChange={setNegativePrompt}
                    required
                  />

                  <ModelSelector value={style} onChange={setStyle} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} />
                    <DurationSelector
                      value={duration}
                      onChange={setDuration}
                      quality={quality}
                    />
                  </div>

                  {/* Quality toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground/90">Quality</label>
                    <div className="flex gap-2">
                      {(['standard', 'pro'] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuality(q)}
                          className={cn(
                            'flex-1 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200 capitalize',
                            quality === q
                              ? 'border-orange bg-orange/8 text-orange'
                              : 'border-border bg-surface-2 text-muted hover:border-orange/30'
                          )}
                        >
                          {q}
                          {q === 'pro' && (
                            <span className="ml-1.5 text-[10px] bg-orange/20 text-orange px-1.5 py-0.5 rounded-full">
                              +{getCreditCost('text2video', duration, 'pro') - getCreditCost('text2video', duration, 'standard')}cr
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <div className="space-y-3">
                  {balance < creditCost && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Insufficient credits. Need {formatCredits(creditCost)}, have {formatCredits(balance)}.
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
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Starting generation...
                      </>
                    ) : isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Generate Video
                        <span className="text-sm font-normal opacity-75">
                          — {formatCredits(creditCost)}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── RIGHT PANEL: Output ── */}
              <div className="space-y-4">
                <div className="p-6 bg-surface border border-border rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-foreground/80">Output Preview</h2>
                    {hasGenerated && (
                      <button
                        onClick={handleGenerateAnother}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-orange transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        New generation
                      </button>
                    )}
                  </div>

                  {/* Video player */}
                  <VideoPlayer
                    url={finalVideoUrl}
                    title={prompt || 'Generated video'}
                    onDownload={handleDownload}
                  />

                  {/* Progress */}
                  <AnimatePresence>
                    {(isGenerating || (status && status !== 'completed')) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <ProgressBar
                          progress={progress}
                          status={status}
                          estimatedSeconds={30}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Generation Failed</p>
                        <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Download button (when done) */}
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

                  {/* Empty state hints */}
                  {!jobId && !finalVideoUrl && !isGenerating && (
                    <div className="space-y-2 text-xs text-muted">
                      <p className="font-semibold text-foreground/60">Tips for better results:</p>
                      <ul className="space-y-1 list-disc list-inside leading-relaxed">
                        <li>Be specific about camera movements (e.g., &ldquo;slow pan left&rdquo;)</li>
                        <li>Describe lighting conditions (golden hour, neon lights, overcast)</li>
                        <li>Include style references (cinematic, documentary, fantasy)</li>
                        <li>Mention time of day, weather, and atmosphere</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Generation history hint */}
                {hasGenerated && (
                  <p className="text-xs text-center text-muted">
                    Video saved to your{' '}
                    <a href="/history" className="text-orange hover:underline">
                      history
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
