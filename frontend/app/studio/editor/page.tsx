import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import EditorClient from './EditorClient'

export default async function EditorPage() {
  const supabase = createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <EditorClient
      accessToken={session.access_token}
      userEmail={session.user.email ?? ''}
    />
  )
}
