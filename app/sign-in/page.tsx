import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { pageMetadata } from '@/lib/site-metadata'
export const metadata: Metadata = pageMetadata('/sign-in')
export default function SignInPage() {
  return <AuthForm mode="sign-in" />
}
