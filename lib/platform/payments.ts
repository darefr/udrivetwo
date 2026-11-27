import { z } from 'zod'
import { tx, audit, query } from './database'
import { insist, type Principal } from './contracts'
import { publicOrigin } from './security'
import { notify } from './notifications'
export interface PaymentProvider {
  start(id: string, minorUnits: number): Promise<{ ref: string; url: string }>
  verify(ref: string): Promise<{
    ref: string
    amount: number
    state: string
    transaction: string | null
  }>
}
async function khalti(method: string, body: object) {
  insist(
    process.env.PAYMENT_PROVIDER === 'khalti' && process.env.KHALTI_SECRET_KEY,
    503,
    'Online payments are not enabled. No money has been taken.',
  )
  const host =
    process.env.KHALTI_ENV === 'production' ? 'khalti.com' : 'dev.khalti.com'
  const r = await fetch(`https://${host}/api/v2/epayment/${method}/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  })
  const value = await r.json()
  insist(
    r.ok ||
      (method === 'lookup' &&
        ['Expired', 'User canceled', 'Refunded', 'Partially Refunded'].includes(
          value.status,
        )),
    502,
    'The payment provider could not verify this request. Contact the rental desk before retrying.',
  )
  return value
}
export const paymentProvider: PaymentProvider = {
  async start(id, amount) {
    const d = await khalti('initiate', {
      purchase_order_id: id,
      purchase_order_name: `U Drive rental ${id}`,
      amount,
      website_url: publicOrigin(),
      return_url: `${publicOrigin()}/api/payments/return`,
    })
    const url = new URL(d.payment_url)
    insist(
      url.protocol === 'https:' &&
        ['pay.khalti.com', 'test-pay.khalti.com'].includes(url.hostname),
      502,
      'Unexpected checkout address.',
    )
    return { ref: z.string().min(1).parse(d.pidx), url: url.href }
  },
  async verify(ref) {
    const d = await khalti('lookup', { pidx: ref })
    return {
      ref: d.pidx,
      amount: d.total_amount,
      state: d.status,
      transaction: d.transaction_id ?? null,
    }
  },
}
export async function startPayment(id: string, user: Principal) {
  insist(
    process.env.PAYMENT_PROVIDER === 'khalti' && process.env.KHALTI_SECRET_KEY,
    503,
    'Online payments are not enabled. No money has been taken.',
  )
  const p = await tx(async (sql) => {
    const [p] = await sql.rows(
      `SELECT p.*,b.status AS rental_status FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE b.id=$1 AND b.customer_id=$2 FOR UPDATE`,
      [id, user.customer_id],
    )
    insist(p, 404, 'Rental not found.')
    insist(
      p.rental_status === 'CONFIRMED' &&
        p.currency === 'NPR' &&
        p.due > 0 &&
        p.received === 0 &&
        p.status === 'PENDING',
      409,
      'This rental is not eligible for checkout.',
    )
    if (p.checkout_url) return p
    insist(
      !p.provider,
      409,
      'Checkout is already being prepared. Contact the desk if it does not appear.',
    )
    await sql.rows("UPDATE payments SET provider='khalti' WHERE id=$1", [p.id])
    return p
  })
  if (p.checkout_url) return { url: p.checkout_url }
  const checkout = await paymentProvider.start(id, p.due * 100)
  await query(
    'UPDATE payments SET provider_ref=$2,checkout_url=$3,updated_at=now() WHERE id=$1',
    [p.id, checkout.ref, checkout.url],
  )
  return { url: checkout.url }
}
export async function verifyPayment(ref: string) {
  const [p] = await query('SELECT * FROM payments WHERE provider_ref=$1', [ref])
  insist(p, 404, 'Unknown payment reference.')
  const r = await paymentProvider.verify(ref)
  insist(
    r.ref === ref && r.amount === p.due * 100,
    409,
    'Provider amount or reference mismatch.',
  )
  const state =
    r.state === 'Completed'
      ? 'PAID'
      : r.state === 'Refunded'
        ? 'REFUNDED'
        : ['Expired', 'User canceled'].includes(r.state)
          ? 'FAILED'
          : null
  if (!state) return
  insist(
    state !== 'PAID' || !!r.transaction,
    409,
    'Missing verified transaction.',
  )
  await tx(async (sql) => {
    const [before] = await sql.rows(
      'SELECT status FROM payments WHERE id=$1 FOR UPDATE',
      [p.id],
    )
    if (
      before.status === state ||
      before.status === 'REFUNDED' ||
      (before.status === 'PAID' && state !== 'REFUNDED')
    )
      return
    await sql.rows(
      'UPDATE payments SET status=$2,received=$3,transaction_ref=coalesce($4,transaction_ref),updated_at=now() WHERE id=$1',
      [p.id, state, state === 'PAID' ? p.due : 0, r.transaction],
    )
    await audit(sql, null, 'PAYMENT_VERIFIED', 'payment', p.id, { state })
    await notify(
      sql,
      { permission: 'payments' },
      'PAYMENT',
      'Payment status verified',
      `${p.booking_id}: ${state}`,
      '/admin?tab=payments',
      p.booking_id,
    )
  })
}
