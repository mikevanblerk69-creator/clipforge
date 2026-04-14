'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api, type JobResponse } from '@/lib/api'

interface UseJobPollingOptions {
  jobId: string | null
  token: string | null
  pollInterval?: number
  onCompleted?: (job: JobResponse) => void
  onFailed?: (error: string) => void
}

interface UseJobPollingReturn {
  status: JobResponse['status'] | null
  progress: number
  videoUrl: string | null
  thumbnailUrl: string | null
  error: string | null
  isPolling: boolean
  estimatedSeconds: number | null
  reset: () => void
}

export function useJobPolling({
  jobId,
  token,
  pollInterval = 3000,
  onCompleted,
  onFailed,
}: UseJobPollingOptions): UseJobPollingReturn {
  const [status, setStatus] = useState<JobResponse['status'] | null>(null)
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  const reset = useCallback(() => {
    clearPolling()
    setStatus(null)
    setProgress(0)
    setVideoUrl(null)
    setThumbnailUrl(null)
    setError(null)
    setEstimatedSeconds(null)
  }, [clearPolling])

  const poll = useCallback(async () => {
    if (!jobId || !token) return

    try {
      const job = await api.getJobStatus(jobId, token)

      if (!isMountedRef.current) return

      setStatus(job.status)
      setProgress(job.progress ?? 0)

      if (job.estimated_seconds) {
        setEstimatedSeconds(job.estimated_seconds)
      }

      if (job.status === 'completed') {
        setVideoUrl(job.video_url ?? null)
        setThumbnailUrl(job.thumbnail_url ?? null)
        setProgress(100)
        clearPolling()
        onCompleted?.(job)
      } else if (job.status === 'failed') {
        setError(job.error ?? 'Generation failed. Please try again.')
        clearPolling()
        onFailed?.(job.error ?? 'Generation failed')
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Polling error:', err)
      // Don't stop polling on transient errors — just log
    }
  }, [jobId, token, clearPolling, onCompleted, onFailed])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!jobId || !token) {
      clearPolling()
      return
    }

    // Initial poll immediately
    setIsPolling(true)
    setStatus('queued')
    setProgress(0)
    poll()

    // Then poll on interval
    intervalRef.current = setInterval(poll, pollInterval)

    return () => {
      clearPolling()
    }
  }, [jobId, token, pollInterval, poll, clearPolling])

  return {
    status,
    progress,
    videoUrl,
    thumbnailUrl,
    error,
    isPolling,
    estimatedSeconds,
    reset,
  }
}
