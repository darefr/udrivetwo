import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
export const metadata: Metadata = {
  title: 'Sign In',
  description:
    'U Drive traveller account sign-in preview. You can explore the fleet and prepare a booking without an account.',
  robots: { index: false },
}
export default function SignInPage() {
  return <AuthForm mode="sign-in" />
}
