import type { Metadata } from 'next'
import { TokenHydrator } from '@/components/TokenHydrator'
import { verifySession } from '@/lib/dal'

export const metadata: Metadata = {
  title: 'Thread Message - TROO AI',
}

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  await verifySession()
  return (
    <div className="w-full h-screen p-2">
      <TokenHydrator />
      {children}
    </div>
  )
}

export default DashboardLayout;
