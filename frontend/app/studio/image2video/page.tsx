import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import Image2VideoClient from './Image2VideoClient'

export default async function Image2VideoPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <Image2VideoClient
      accessToken={session.access_token}
      userEmail={session.user.email ?? ''}
    />
  )
}
