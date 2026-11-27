import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
export const metadata: Metadata = {
  title: 'Password Recovery',
  description:
    'Preview the password recovery form for U Drive traveller accounts.',
  robots: { index: false },
}
export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot-password" />
}
