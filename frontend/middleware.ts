import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/studio', '/history', '/settings']

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // In demo mode: auto-redirect auth pages to dashboard, allow everything else
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is logged in and trying to access auth pages, redirect to dashboard
  if (session && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If user is not logged in and trying to access protected routes, redirect to login
  if (!session && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
