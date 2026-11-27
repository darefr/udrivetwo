import { redirect, notFound } from 'next/navigation'
import { session } from '@/lib/platform/security'
import { can } from '@/lib/platform/contracts'
import { AdminDesk } from '@/components/workspace/admin'
import '../workspace.css'
export const metadata = {
  title: 'Rental desk | U Drive Kathmandu',
  description: 'Authorized U Drive operations workspace.',
  robots: { index: false, follow: false },
}
export default async function Admin() {
  const user = await session()
  if (!user) redirect('/sign-in')
  if (!can(user, 'overview')) notFound()
  return <AdminDesk />
}
