import { verifyAdminSession } from '@/lib/dal'
import AdminShell from '@/components/admin/AdminShell'

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const { role } = await verifyAdminSession()
  return <AdminShell role={role}>{children}</AdminShell>
}

export default AdminLayout
