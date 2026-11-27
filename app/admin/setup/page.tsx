import { redirect, notFound } from 'next/navigation'
import { session } from '@/lib/platform/security'
import { query } from '@/lib/platform/database'
import { OwnerSetup } from '@/components/owner-setup'
import '../../workspace.css'
export const metadata = {
  title: 'Owner setup | U Drive',
  robots: { index: false, follow: false },
}
export default async function Setup() {
  if (!(await session())) redirect('/sign-in')
  if (
    (await query("SELECT id FROM users WHERE role='SUPER_ADMIN' LIMIT 1"))
      .length
  )
    notFound()
  const { ownerSetupToken } = await import('@/lib/platform/bootstrap')
  if (!(await ownerSetupToken())) notFound()
  return <OwnerSetup />
}
