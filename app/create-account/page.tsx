import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth-form'
import { pageMetadata } from '@/lib/site-metadata'
export const metadata: Metadata = pageMetadata('/create-account')
export default function CreateAccountPage() {
  return <AuthForm mode="create-account" />
}
