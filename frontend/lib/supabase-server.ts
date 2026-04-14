import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from './supabase'

// Demo session returned when NEXT_PUBLIC_DEMO_MODE=true
const DEMO_SESSION = {
  user: {
    id: 'demo-user-id',
    email: 'demo@clipforge.ai',
  },
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
  expires_at: 9999999999,
}

function createDemoClient() {
  return {
    auth: {
      getSession: async () => ({
        data: { session: DEMO_SESSION as any },
        error: null,
      }),
      getUser: async () => ({
        data: { user: DEMO_SESSION.user as any },
        error: null,
      }),
    },
  } as any
}

// Server-side Supabase client (for use in Server Components only)
export const createServerClient = () => {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return createDemoClient()
  }
  return createServerComponentClient<Database>({ cookies })
}
