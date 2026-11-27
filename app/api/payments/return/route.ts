import { verifyPayment } from '@/lib/platform/payments'
import {
  failure,
  publicOrigin,
  rateLimit,
  clientKey,
} from '@/lib/platform/security'
export async function GET(req: Request) {
  try {
    await rateLimit('payment-return:' + clientKey(req), 40, 60)
    await verifyPayment(
      (new URL(req.url).searchParams.get('pidx') || '').slice(0, 120),
    )
    return Response.redirect(`${publicOrigin()}/account?tab=bookings`, 303)
  } catch (e) {
    return failure(e)
  }
}
