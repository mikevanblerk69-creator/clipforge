'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api, type VideoHistoryItem } from '@/lib/api'

interface UseVideoHistoryOptions {
  token: string | null
  type?: string
  initialPage?: number
  perPage?: number
}

interface UseVideoHistoryReturn {
  videos: VideoHistoryItem[]
  isLoading: boolean
  error: string | null
  total: number
  page: number
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  deleteVideo: (id: string) => Promise<void>
  setTypeFilter: (type: string | undefined) => void
}

export function useVideoHistory({
  token,
  type,
  initialPage = 1,
  perPage = 20,
}: UseVideoHistoryOptions): UseVideoHistoryReturn {
  const [videos, setVideos] = useState<VideoHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(initialPage)
  const [typeFilter, setTypeFilter] = useState<string | undefined>(type)

  const fetchHistory = useCallback(
    async (pageNum: number, append = false) => {
      if (!token) return

      setIsLoading(true)
      setError(null)

      try {
        const data = await api.getHistory(token, pageNum, perPage, typeFilter)
        setTotal(data.total)

        if (append) {
          setVideos((prev) => [...prev, ...data.videos])
        } else {
          setVideos(data.videos)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load history'
        setError(msg)
        toast.error('Failed to load videos', { description: msg })
      } finally {
        setIsLoading(false)
      }
    },
    [token, typeFilter, perPage]
  )

  const refresh = useCallback(async () => {
    setPage(1)
    await fetchHistory(1, false)
  }, [fetchHistory])

  const loadMore = useCallback(async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await fetchHistory(nextPage, true)
  }, [page, fetchHistory])

  const deleteVideo = useCallback(
    async (id: string) => {
      if (!token) return

      try {
        await api.deleteVideo(id, token)
        setVideos((prev) => prev.filter((v) => v.id !== id))
        setTotal((prev) => prev - 1)
        toast.success('Video deleted')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete video'
        toast.error('Delete failed', { description: msg })
      }
    },
    [token]
  )

  // Re-fetch when token or type filter changes
  useEffect(() => {
    setPage(1)
    fetchHistory(1, false)
  }, [token, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = videos.length < total

  return {
    videos,
    isLoading,
    error,
    total,
    page,
    hasMore,
    refresh,
    loadMore,
    deleteVideo,
    setTypeFilter,
  }
}
