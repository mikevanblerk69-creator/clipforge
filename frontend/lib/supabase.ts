import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          credits: number
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          credits?: number
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          credits?: number
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          type: 'text2video' | 'image2video' | 'lipsync' | 'editor'
          status: 'queued' | 'processing' | 'completed' | 'failed'
          prompt: string | null
          settings: Record<string, unknown>
          video_url: string | null
          thumbnail_url: string | null
          credits_used: number
          error: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          user_id: string
          type: string
          status?: string
          prompt?: string | null
          settings?: Record<string, unknown>
          credits_used?: number
        }
        Update: {
          status?: string
          video_url?: string | null
          thumbnail_url?: string | null
          error?: string | null
          completed_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Client-side Supabase client (for use in 'use client' components)
export const createClient = () => createClientComponentClient<Database>()
