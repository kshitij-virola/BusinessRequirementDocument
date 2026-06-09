'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { store } from '@/store'

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const storeRef = useRef<typeof store>(store)
  return <Provider store={storeRef.current}>{children}</Provider>
}
export default StoreProvider