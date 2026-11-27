import { z } from 'zod'
import { tx, audit } from './database'
import { insist, permit, text, type Principal } from './contracts'
import { notify } from './notifications'
export async function recordReceipt(id: string, raw: unknown, user: Principal) {
  permit(user, 'payments')
  const d = z
    .object({
      direction: z.enum(['RECEIPT', 'REFUND']),
      method: z.enum(['Bank transfer', 'Cash']),
      reference: text(3, 100),
      amount: z.coerce.number().int().min(1).max(500000000),
      confirmed: z.literal(true),
    })
    .strict()
    .parse(raw)
  return tx(async (sql) => {
    const [p] = await sql.rows(
      'SELECT p.*,b.status AS rental_status,c.user_id FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN customers c ON c.id=b.customer_id WHERE p.id=$1 FOR UPDATE OF p,b',
      [id],
    )
    insist(p, 404, 'Payment record not found.')
    const [previous] = await sql.rows(
      'SELECT * FROM payment_receipts WHERE external_reference=$1',
      [d.reference],
    )
    if (previous) {
      insist(
        previous.payment_id === id &&
          previous.amount === d.amount &&
          previous.direction === d.direction &&
          previous.method === d.method,
        409,
        'This receipt reference is already in use.',
      )
      return {
        message: 'Receipt already recorded. No duplicate entry was made.',
      }
    }
    insist(
      !p.provider || p.provider === 'desk',
      409,
      'Online gateway settlements must be verified by the gateway.',
    )
    insist(
      d.direction === 'REFUND' ||
        ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(p.rental_status),
      409,
      'Confirm the rental before recording receipts.',
    )
    const total = p.received + (d.direction === 'REFUND' ? -d.amount : d.amount)
    insist(
      total >= 0 && total <= p.due,
      422,
      'Amount exceeds the outstanding balance or refundable receipts.',
    )
    const status =
      total === 0 ? 'REFUNDED' : total === p.due ? 'PAID' : 'PARTIAL'
    await sql.rows(
      'INSERT INTO payment_receipts(payment_id,actor_id,direction,method,external_reference,amount) VALUES($1,$2,$3,$4,$5,$6)',
      [id, user.id, d.direction, d.method, d.reference, d.amount],
    )
    await sql.rows(
      "UPDATE payments SET provider='desk',received=$2,status=$3,updated_at=now() WHERE id=$1",
      [id, total, status],
    )
    await audit(sql, user.id, 'OFFLINE_' + d.direction, 'payment', id, {
      reference: d.reference,
      amount: d.amount,
      currency: p.currency,
      status,
    })
    if (p.user_id)
      await notify(
        sql,
        { user: p.user_id },
        'PAYMENT',
        'Rental payment record updated',
        `${p.booking_id}: ${status}. Recorded balance: ${p.currency} ${total}.`,
        `/account?tab=bookings&id=${p.booking_id}`,
        p.booking_id,
      )
    return {
      message:
        'External receipt recorded. No funds were charged or refunded by this website.',
    }
  })
}
