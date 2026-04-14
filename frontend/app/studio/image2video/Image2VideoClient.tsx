'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, RefreshCw, Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { SidebarNav } from '@/components/dashboard/SidebarNav'
import { ImageUploader } from '@/components/studio/ImageUploader'
import { PromptInput } from '@/components/studio/PromptInput'
import { AspectRatioPicker } from '@/components/studio/AspectRatioPicker'
import { DurationSelector } from '@/components/studio/DurationSelector'
import { ProgressBar } from '@/components/studio/ProgressBar'
import { VideoPlayer } from '@/components/studio/VideoPlayer'
import { useJobPolling } from '@/hooks/useJobPolling'
import { useCredits } from '@/hooks/useCredits'
import { api } from '@/lib/api'
import { getCreditCost, formatCredits } from '@/lib/credits'
import { cn } from '@/lib/utils'

interface Image2VideoClientProps {
  accessToken: string
  userEmail: string
}

export default function Image2VideoClient({ accessToken, userEmail }: Image2VideoClientProps) {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [motionPrompt, setMotionPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [duration, setDuration] = useState<5 | 10>(5)
  const [jobId, setJobId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const { balance, deduct, refresh: refreshCredits } = useCredits(accessToken)
  const creditCost = getCreditCost('image2video', duration)
  const canGenerate = balance >= creditCost && !!imageFile

  const { status, progress, videoUrl, error, isPolling, reset: resetPolling } =
    useJobPolling({
      jobId,
      token: accessToken,
      onCompleted: (job) => {
        setGeneratedVideoUrl(job.video_url ?? null)
        setHasGenerated(true)
        refreshCredits()
        toast.success('Video generated!', { description: 'Your image is now in motion.' })
      },
      onFailed: (err) => {
        toast.error('Generation failed', { description: err })
      },
    })

  const handleImageUpload = (file: File, preview: string) => {
    setImageFile(file)
    setImagePreview(preview)
    setUploadedImageUrl(null) // Reset server URL; will upload on submit
  }

  const handleClearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setUploadedImageUrl(null)
  }

  const handleGenerate = async () => {
    if (!imageFile) {
      toast.error('Please upload an image first')
      return
    }

    const ok = await deduct(creditCost, `image2video_${duration}s`)
    if (!ok) return

    setIsSubmitting(true)
    resetPolling()
    setGeneratedVideoUrl(null)

    try {
      // Upload image first
      setIsUploading(true)
      let imageUrl = uploadedImageUrl

      if (!imageUrl) {
        toast.info('Uploading image...')
        const uploadResult = await api.uploadImage(imageFile, accessToken)
        imageUrl = uploadResult.url
        setUploadedImageUrl(imageUrl)
      }
      setIsUploading(false)

      // Submit generation job
      const job = await api.image2video(
        {
          image_url: imageUrl,
          motion_prompt: motionPrompt.trim() || undefined,
          aspect_ratio: aspectRatio,
          duration,
        },
        accessToken
      )
      setJobId(job.job_id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start generation'
      toast.error('Generation failed', { description: msg })
      refreshCredits()
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  const handleGenerateAnother = () => {
    setJobId(null)
    resetPolling()
    setGeneratedVideoUrl(null)
    setHasGenerated(false)
  }

  const handleDownload = () => {
    const url = generatedVideoUrl || videoUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `clipforge-img2vid-${Date.now()}.mp4`
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
            <div className="mb-8">
              <h1 className="font-display text-4xl tracking-wide mb-1">
                IMAGE TO VIDEO
              </h1>
              <p className="text-sm text-muted">
                Upload any image and watch AI bring it to life with natural motion
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT: Controls */}
              <div className="space-y-5">
                <div className="p-6 bg-surface border border-border rounded-2xl space-y-5">
                  <ImageUploader
                    onUpload={handleImageUpload}
                    value={imagePreview}
                    onClear={handleClearImage}
                  />

                  <PromptInput
                    value={motionPrompt}
                    onChange={setMotionPrompt}
                    label="Motion Prompt"
                    placeholder="Camera slowly zooms in, leaves gently swaying in the breeze..."
                    maxLength={300}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} />
                    <DurationSelector
                      value={duration}
                      onChange={setDuration}
                      type="image2video"
                    />
                  </div>

                  {/* Tips */}
                  <div className="p-3.5 rounded-xl bg-cyan/5 border border-cyan/15 text-xs text-muted space-y-1">
                    <p className="font-semibold text-cyan/80 mb-1.5">Motion prompt tips:</p>
                    <ul className="space-y-1 list-disc list-inside leading-relaxed">
                      <li>Camera panning, zooming, orbiting</li>
                      <li>Environmental effects (wind, rain, fire)</li>
                      <li>Subtle subject movement for realism</li>
                      <li>Leave empty for automatic motion</li>
                    </ul>
                  </div>
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
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Uploading image...
                      </>
                    ) : isSubmitting ? (
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
                        Animate Image
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
                        onClick={handleGenerateAnother}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-orange transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Try again
                      </button>
                    )}
                  </div>

                  <VideoPlayer
                    url={finalVideoUrl}
                    title="Animated image"
                    onDownload={handleDownload}
                  />

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
                          estimatedSeconds={45}
                        />
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
