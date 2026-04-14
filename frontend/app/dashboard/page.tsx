import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <DashboardClient
      userEmail={session.user.email ?? ''}
      accessToken={session.access_token}
      userId={session.user.id}
    />
  )
}
