import { TokenForm } from '@/components/account-token-form'
import '../workspace.css'
export const metadata = {
  title: 'Verify email | U Drive',
  robots: { index: false, follow: false },
}
export default function Verify() {
  return <TokenForm verify />
}
