const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobResponse {
  job_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  video_url?: string | null
  thumbnail_url?: string | null
  error?: string | null
  credits_used?: number
  estimated_seconds?: number
}

export interface Text2VideoRequest {
  prompt: string
  negative_prompt?: string
  style?: string
  aspect_ratio?: '16:9' | '9:16' | '1:1'
  duration?: 5 | 10
  quality?: 'standard' | 'pro'
}

export interface Image2VideoRequest {
  image_url: string
  motion_prompt?: string
  aspect_ratio?: '16:9' | '9:16' | '1:1'
  duration?: 5 | 10
}

export interface LipSyncRequest {
  video_url?: string
  video_upload_url?: string
  audio_url?: string
  audio_text?: string
  voice?: string
}

export interface CreditsResponse {
  balance: number
  total_used: number
}

export interface VideoHistoryItem {
  id: string
  type: 'text2video' | 'image2video' | 'lipsync' | 'editor'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  prompt: string | null
  video_url: string | null
  thumbnail_url: string | null
  credits_used: number
  created_at: string
  completed_at: string | null
}

export interface HistoryResponse {
  videos: VideoHistoryItem[]
  total: number
}

export interface StatsResponse {
  total_videos: number
  credits_used: number
  credits_remaining: number
  hours_generated: number
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...fetchOptions } = options ?? {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    let detail: unknown
    try {
      detail = await response.json()
    } catch {
      detail = await response.text()
    }
    throw new ApiError(
      response.status,
      `API Error ${response.status}: ${response.statusText}`,
      detail
    )
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json() as Promise<T>
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const api = {
  // Text to Video — backend: POST /api/v1/video/text2video
  async text2video(data: Text2VideoRequest, token: string): Promise<JobResponse> {
    return apiFetch<JobResponse>('/api/v1/video/text2video', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    })
  },

  // Image to Video — backend: POST /api/v1/video/image2video
  async image2video(data: Image2VideoRequest, token: string): Promise<JobResponse> {
    return apiFetch<JobResponse>('/api/v1/video/image2video', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    })
  },

  // Lip Sync — backend: POST /api/v1/lipsync
  async lipsync(data: LipSyncRequest, token: string): Promise<JobResponse> {
    return apiFetch<JobResponse>('/api/v1/lipsync', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    })
  },

  // Get job status — backend: GET /api/v1/jobs/{job_id}
  async getJobStatus(jobId: string, token: string): Promise<JobResponse> {
    return apiFetch<JobResponse>(`/api/v1/jobs/${jobId}`, { token })
  },

  // Get credit balance — backend: GET /api/v1/credits
  async getCredits(token: string): Promise<CreditsResponse> {
    return apiFetch<CreditsResponse>('/api/v1/credits', { token })
  },

  // Get video history — backend: GET /api/v1/history
  async getHistory(
    token: string,
    page = 1,
    perPage = 20,
    type?: string
  ): Promise<HistoryResponse> {
    const offset = (page - 1) * perPage
    const params = new URLSearchParams({
      limit: String(perPage),
      offset: String(offset),
    })
    if (type) params.set('type', type)
    return apiFetch<HistoryResponse>(`/api/v1/history?${params}`, { token })
  },

  // Delete a video — backend: DELETE /api/v1/history/{id}
  async deleteVideo(id: string, token: string): Promise<void> {
    return apiFetch<void>(`/api/v1/history/${id}`, {
      method: 'DELETE',
      token,
    })
  },

  // Get user stats — backend: GET /api/v1/stats
  async getStats(token: string): Promise<StatsResponse> {
    return apiFetch<StatsResponse>('/api/v1/stats', { token })
  },

  // Upload image for image2video
  async uploadImage(file: File, token: string): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_BASE}/api/v1/upload/image`, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to upload image')
    }

    return response.json()
  },
}

export { ApiError }
