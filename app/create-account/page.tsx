import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
export const metadata: Metadata = {
  title: 'Create Account',
  description:
    'Preview the U Drive traveller registration experience. No account is created in demonstration mode.',
  robots: { index: false },
}
export default function CreateAccountPage() {
  return <AuthForm mode="create-account" />
}
