import type { Metadata } from 'next'
import { SidebarWrapper } from '@/components/dashboard/SidebarWrapper'
import { TokenHydrator } from '@/components/TokenHydrator'
import { verifySession } from '@/lib/dal'

export const metadata: Metadata = {
  title: 'Dashboard - TROO AI',
}

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  await verifySession()
  return (
    <SidebarWrapper>
      <TokenHydrator />
      {children}
    </SidebarWrapper>
  )
}

export default DashboardLayout;
