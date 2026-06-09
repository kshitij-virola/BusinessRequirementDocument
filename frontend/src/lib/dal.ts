import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSession } from './session'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  return { isAuth: true, userId: session.userId, role: session.role }
})

export const verifyAdminSession = cache(async () => {
  const session = await getSession()
  if (!session?.userId) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'superadmin') redirect('/dashboard')
  return { isAuth: true, userId: session.userId, role: session.role }
})
