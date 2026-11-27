import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { session } from '@/lib/platform/security'
import { CustomerDesk } from '@/components/workspace/customer'
import '../workspace.css'
export const metadata = {
  title: 'My account | U Drive Kathmandu',
  description:
    'Manage your U Drive rental requests, profile and support conversations.',
  robots: { index: false, follow: false },
}
export default async function Account() {
  if (!(await session())) redirect('/sign-in')
  return (
    <CustomerDesk
      claim={!!(await cookies()).get('udrive_claim')}
      checkout={
        process.env.PAYMENT_PROVIDER === 'khalti' &&
        !!process.env.KHALTI_SECRET_KEY
      }
    />
  )
}
