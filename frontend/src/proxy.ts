import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decryptForProxy } from '@/lib/session-proxy'

const protectedRoutes = ['/dashboard', '/workspaces', '/projects', '/billing', '/analytics', '/settings']
const adminRoutes = ['/admin']
const publicRoutes = ['/login', '/signup', '/forgot-password', '/']

export const proxy = async (req: NextRequest) => {
  if (req.headers.get('next-action')) return NextResponse.next()

  const path = req.nextUrl.pathname

  const isProtectedRoute = protectedRoutes.some((r) => path === r || path.startsWith(r + '/'))
  const isAdminRoute = adminRoutes.some((r) => path === r || path.startsWith(r + '/'))
  const isPublicRoute = publicRoutes.includes(path)

  const sessionCookie = req.cookies.get('session')?.value
  const session = await decryptForProxy(sessionCookie)

  if ((isProtectedRoute || isAdminRoute) && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isAdminRoute && session?.role !== 'admin' && session?.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (isPublicRoute && session?.userId && path !== '/') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
}
