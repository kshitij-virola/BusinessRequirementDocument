'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { SWRConfig } from 'swr'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { store } from '@/store'

const swrConfig = {
  // Never retry on error — the Axios interceptor already handles
  // 401 → token refresh → redirect. SWR retrying only floods the server.
  shouldRetryOnError: false,

  // Don't background-refresh stale data automatically.
  // Data is re-fetched only when mutate() / invalidate() is called explicitly.
  revalidateIfStale: false,

  // Don't re-fetch when the browser tab regains focus.
  revalidateOnFocus: false,

  // Don't re-fetch when the network reconnects.
  revalidateOnReconnect: false,

  // Deduplicate identical SWR keys in a 10-second window.
  // Prevents React Strict Mode's double-invoke from sending two requests.
  dedupingInterval: 10_000,
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  const storeRef = useRef<typeof store>(store)
  const queryClientRef = useRef<QueryClient>(new QueryClient())
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClientRef.current}>
        <Provider store={storeRef.current}>
          <SWRConfig value={swrConfig}>
            {children}
          </SWRConfig>
        </Provider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default Providers;
