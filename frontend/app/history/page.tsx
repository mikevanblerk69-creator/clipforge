import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <HistoryClient
      accessToken={session.access_token}
      userEmail={session.user.email ?? ''}
    />
  )
}
