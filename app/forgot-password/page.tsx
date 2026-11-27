import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { pageMetadata } from '@/lib/site-metadata'
export const metadata: Metadata = pageMetadata('/forgot-password')
export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot-password" />
}
