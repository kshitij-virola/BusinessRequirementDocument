import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/session'

/**
 * GET /api/auth/clear-session
 *
 * Called by the Axios interceptor when token refresh fails.
 * Deletes the Next.js session cookie so proxy.ts stops redirecting
 * the user back to /dashboard, then issues a hard redirect to /login.
 */
export const GET = async () => {
  await deleteSession()
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100')
  )
}
