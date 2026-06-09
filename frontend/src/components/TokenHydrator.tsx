'use client'
import { useEffect } from 'react'
import axios from 'axios'
import { mutate } from 'swr'
import { tokenStore, API_BASE } from '@/lib/api/client'
import type { ApiResponse } from '@/lib/api/types'

/**
 * Runs once on mount. If no access token is in localStorage/cookie, attempts
 * a silent token refresh using the httpOnly refresh cookie. On success stores
 * the new token and revalidates all SWR caches so the page data loads.
 */
export const TokenHydrator = () => {
  useEffect(() => {
    if (tokenStore.get()) return  // Token already present — nothing to do

    axios
      .post<ApiResponse<{ accessToken: string }>>(
        `${API_BASE}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        tokenStore.set(data.data.accessToken)
        // Revalidate every SWR key so all hooks reload with the new token
        mutate(() => true)
      })
      .catch(() => {
        // No valid refresh cookie — the proxy will redirect to /login
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
