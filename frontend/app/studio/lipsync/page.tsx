import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import LipSyncClient from './LipSyncClient'

export default async function LipSyncPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <LipSyncClient
      accessToken={session.access_token}
      userEmail={session.user.email ?? ''}
    />
  )
}
