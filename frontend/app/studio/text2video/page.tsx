import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import Text2VideoClient from './Text2VideoClient'

export default async function Text2VideoPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <Text2VideoClient
      accessToken={session.access_token}
      userEmail={session.user.email ?? ''}
    />
  )
}
