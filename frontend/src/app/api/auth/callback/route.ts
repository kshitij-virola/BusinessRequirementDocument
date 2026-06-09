import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSession } from '@/lib/session'

const popupHtml = (script: string) => `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>Signing in…</title></head>
  <body>
    <script>${script}</script>
  </body>
</html>`

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl
  const token  = searchParams.get('token')
  const userId = searchParams.get('userId')
  const role   = searchParams.get('role')

  if (!token || !userId || !role) {
    const html = popupHtml(`
      var msg = { type: 'oauth_error' };
      if (window.opener) {
        window.opener.postMessage(msg, window.location.origin);
        window.close();
      } else {
        window.location.href = '/login?error=oauth_failed';
      }
    `)
    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  }

  await createSession(userId, role)

  const cookieStore = await cookies()
  cookieStore.set('troo_at', token, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60,
    path:     '/',
  })

  const dest = role === 'admin' || role === 'superadmin' ? '/admin/dashboard' : '/dashboard'
  const html = popupHtml(`
    var msg = { type: 'oauth_success', role: ${JSON.stringify(role)} };
    if (window.opener) {
      window.opener.postMessage(msg, window.location.origin);
      setTimeout(function() { window.close(); }, 100);
    } else {
      window.location.href = ${JSON.stringify(dest)};
    }
  `)
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
