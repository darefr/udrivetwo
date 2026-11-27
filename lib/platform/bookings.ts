import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import {
  bookingInput,
  quoteInput,
  insist,
  transitions,
  statuses,
  text,
  email,
  phone,
  slug,
  date,
  type Principal,
  type Quote,
  type Status,
} from './contracts'
import { daysBetween, todayInNepal } from '../trip'
import { audit, query, settings, tx, type Sql } from './database'
import { digest, token } from './security'
import { bookingEvent } from './notifications'
export async function estimate(
  sql: Sql,
  d: z.infer<typeof quoteInput>,
  except: string | null = null,
): Promise<{ quote: Quote; location: string }> {
  const cfg = await settings(sql)
  const days = daysBetween(d.start, d.end)
  insist(
    d.start >= todayInNepal() && days >= 1 && days <= cfg.maxDays,
    422,
    `Choose 1–${cfg.maxDays} rental days, starting today or later in Nepal.`,
  )
  const [v] = await sql.rows(
    'SELECT * FROM vehicles WHERE slug=$1 AND active AND available FOR SHARE',
    [d.vehicle],
  )
  insist(
    v && v.specs.modes.includes(d.mode),
    409,
    'This vehicle or rental type is not available.',
  )
  const [l] = await sql.rows(
    'SELECT slug FROM locations WHERE name=$1 AND active',
    [d.pickup],
  )
  insist(l, 422, 'Choose an active pickup location.')
  const occupied = await sql.rows(
    'SELECT day FROM occupied_days WHERE vehicle_id=$1 AND day>=$2::date AND day<$3::date AND booking_id IS DISTINCT FROM $4 LIMIT 1',
    [d.vehicle, d.start, d.end, except ?? 'no-booking'],
  )
  insist(
    !occupied.length,
    409,
    'This vehicle is already booked or blocked for those dates.',
  )
  const rate =
    (d.mode === 'with-driver' ? v.driver_rate : v.self_rate) ?? v.daily_rate
  const subtotal = days * rate
  let discount = 0
  if (d.offer) {
    const [o] = await sql.rows(
      'SELECT percent FROM offers WHERE code=$1 AND active AND starts_on<=$2::date AND ends_on>=($3::date-1)',
      [d.offer, d.start, d.end],
    )
    insist(o, 422, 'This offer is not valid for your rental dates.')
    discount = Math.floor((subtotal * o.percent) / 100)
  }
  const delivery = d.delivery === 'delivery' ? cfg.deliveryFee : 0
  return {
    location: l.slug,
    quote: {
      days,
      rate,
      subtotal,
      delivery,
      additional: cfg.extraFee,
      discount,
      total: subtotal - discount + delivery + cfg.extraFee,
      currency: cfg.currency,
      driverQuoted: d.mode === 'with-driver' && v.driver_rate == null,
    },
  }
}
export async function createBooking(data: unknown, who: Principal | null) {
  const d = bookingInput.parse(data)
  insist(
    (d.delivery !== 'delivery' && d.pickup !== 'Other location in Nepal') ||
      d.address.length >= 4,
    422,
    'Enter a delivery address or landmark.',
  )
  const fingerprint = digest(JSON.stringify([who?.id || 'guest', d]))
  return tx(async (sql) => {
    await sql.rows('SELECT pg_advisory_xact_lock(hashtext($1))', [d.requestKey])
    const [old] = await sql.rows(
      'SELECT id,status,quote,fingerprint FROM bookings WHERE request_key=$1',
      [d.requestKey],
    )
    if (old) {
      insist(
        old.fingerprint === fingerprint,
        409,
        'This request identifier has already been used.',
      )
      return {
        id: old.id,
        status: old.status,
        quote: old.quote as Quote,
        claim: null,
      }
    }
    const { quote, location } = await estimate(sql, d)
    insist(
      d.expectedTotal === undefined || d.expectedTotal === quote.total,
      409,
      'The estimate changed. Review the latest price before submitting.',
    )
    const customer =
      who?.customer_id ??
      (
        await sql.rows(
          'INSERT INTO customers(name,email,phone) VALUES($1,$2,$3) RETURNING id',
          [d.name, d.email, d.phone],
        )
      )[0].id
    const id =
      'UD-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()
    const claim = who ? null : token()
    await sql.rows(
      `INSERT INTO bookings(id,customer_id,vehicle_id,location_id,mode,pickup_date,return_date,delivery,address,return_point,contact_name,contact_email,contact_phone,message,wa_consent,quote,total,currency,offer_code,request_key,fingerprint,guest_claim_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        id,
        customer,
        d.vehicle,
        location,
        d.mode,
        d.start,
        d.end,
        d.delivery,
        d.address,
        d.returnPoint,
        d.name,
        d.email,
        d.phone,
        d.message,
        d.waConsent,
        JSON.stringify(quote),
        quote.total,
        quote.currency,
        d.offer || null,
        d.requestKey,
        fingerprint,
        claim ? digest(claim) : null,
      ],
    )
    await sql.rows(
      'INSERT INTO payments(booking_id,due,currency) VALUES($1,$2,$3)',
      [id, quote.total, quote.currency],
    )
    await bookingEvent(sql, id, 'NEW', who?.id ?? null)
    await audit(sql, who?.id ?? null, 'BOOKING_REQUESTED', 'booking', id)
    return { id, status: 'PENDING', quote, claim }
  })
}
const bookingFields = `b.id,b.status,b.mode,b.vehicle_id,b.location_id,b.contact_name,b.contact_email,b.contact_phone,b.customer_id,b.pickup_date::text AS start,b.return_date::text AS "end",b.delivery,b.address,b.return_point,b.message,b.quote,b.total,b.currency,b.offer_code,b.created_at,b.updated_at,b.version,v.name AS vehicle,l.name AS pickup,p.status AS payment_status`
const joins =
  'FROM bookings b JOIN vehicles v ON v.slug=b.vehicle_id JOIN locations l ON l.slug=b.location_id JOIN payments p ON p.booking_id=b.id'
export async function listBookings(
  customer: string | null,
  search = '',
  status = '',
  page = 0,
  view = 'all',
) {
  return query(
    `SELECT ${bookingFields} ${joins} WHERE ($1::text IS NULL OR b.customer_id=$1) AND ($2='' OR b.status=$2) AND ($3='' OR concat_ws(' ',b.id,b.contact_name,b.contact_email,v.name) ILIKE $3) AND ($5='all' OR $5='active' AND b.status='ACTIVE' OR $5='upcoming' AND b.status IN ('PENDING','CONFIRMED') AND b.pickup_date>=(now() AT TIME ZONE 'Asia/Kathmandu')::date OR $5='history' AND b.status IN ('COMPLETED','CANCELLED','REJECTED')) ORDER BY b.created_at DESC LIMIT 50 OFFSET $4`,
    [customer, status, search ? '%' + search + '%' : '', page * 50, view],
  )
}
export async function bookingDetail(id: string, customer: string | null) {
  const [b] = await query(
    `SELECT ${bookingFields}${customer ? '' : ',b.internal_note'} ${joins} WHERE b.id=$1 AND ($2::text IS NULL OR b.customer_id=$2)`,
    [id, customer],
  )
  insist(b, 404, 'Booking not found.')
  b.history = await query(
    'SELECT event,status,created_at FROM booking_history WHERE booking_id=$1 ORDER BY id',
    [id],
  )
  return b
}
const editInput = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(statuses).optional(),
    note: text(0, 2000).optional(),
    rental: quoteInput
      .extend({
        name: text(2, 100),
        email,
        phone,
        address: text(0, 240),
        returnPoint: text(0, 240),
        message: text(0, 600),
      })
      .optional(),
  })
  .strict()
export async function changeBooking(
  id: string,
  data: unknown,
  user: Principal,
  staff: boolean,
) {
  const d = editInput.parse(data)
  return tx(async (sql) => {
    const [b] = await sql.rows(
      'SELECT * FROM bookings WHERE id=$1 AND ($2::text IS NULL OR customer_id=$2) FOR UPDATE',
      [id, staff ? null : user.customer_id],
    )
    insist(b, 404, 'Booking not found.')
    insist(
      b.version === d.version,
      409,
      'This rental changed. Refresh the details and try again.',
    )
    insist(
      staff || (d.status === 'CANCELLED' && d.note === undefined && !d.rental),
      403,
      'Only cancellation is available for this booking.',
    )
    if (d.rental) {
      insist(
        ['PENDING', 'CONFIRMED'].includes(b.status),
        409,
        'Only pending or confirmed rentals can be edited.',
      )
      const [p] = await sql.rows(
        'SELECT * FROM payments WHERE booking_id=$1 FOR UPDATE',
        [id],
      )
      insist(
        p.received === 0 && !p.provider_ref && !p.provider,
        409,
        'Reconcile the existing payment before changing the rental.',
      )
      const r = d.rental
      insist(
        (r.delivery !== 'delivery' && r.pickup !== 'Other location in Nepal') ||
          r.address.length >= 4,
        422,
        'Enter a handover address.',
      )
      const { quote, location } = await estimate(sql, r, id)
      await sql.rows(
        'UPDATE bookings SET vehicle_id=$2,location_id=$3,mode=$4,pickup_date=$5,return_date=$6,delivery=$7,address=$8,return_point=$9,contact_name=$10,contact_email=$11,contact_phone=$12,message=$13,quote=$14,total=$15,currency=$16,offer_code=$17 WHERE id=$1',
        [
          id,
          r.vehicle,
          location,
          r.mode,
          r.start,
          r.end,
          r.delivery,
          r.address,
          r.returnPoint,
          r.name,
          r.email,
          r.phone,
          r.message,
          JSON.stringify(quote),
          quote.total,
          quote.currency,
          r.offer || null,
        ],
      )
      await sql.rows(
        'UPDATE payments SET due=$2,currency=$3,updated_at=now() WHERE booking_id=$1',
        [id, quote.total, quote.currency],
      )
      await bookingEvent(sql, id, 'MODIFIED', user.id)
    }
    if (d.status && d.status !== b.status) {
      if (d.status === 'CANCELLED') {
        const [p] = await sql.rows(
          'SELECT received,provider,status FROM payments WHERE booking_id=$1 FOR UPDATE',
          [id],
        )
        insist(
          !p.received && !(p.provider === 'khalti' && p.status === 'PENDING'),
          409,
          'Contact the desk to reconcile the payment before cancellation.',
        )
      }
      insist(
        transitions[b.status as Status].includes(d.status),
        409,
        'That booking status change is not allowed.',
      )
      await sql.rows('UPDATE bookings SET status=$2 WHERE id=$1', [
        id,
        d.status,
      ])
      await bookingEvent(sql, id, d.status, user.id)
    }
    if (d.note !== undefined)
      await sql.rows('UPDATE bookings SET internal_note=$2 WHERE id=$1', [
        id,
        d.note,
      ])
    await sql.rows(
      'UPDATE bookings SET version=version+1,updated_at=now() WHERE id=$1',
      [id],
    )
    await audit(sql, user.id, 'BOOKING_UPDATED', 'booking', id, {
      previousStatus: b.status,
      status: d.status ?? b.status,
      datesOrDetailsChanged: !!d.rental,
      internalNoteChanged: d.note !== undefined,
    })
    return { message: 'Booking updated.' }
  })
}
export async function blockDates(data: unknown, user: Principal) {
  const d = z
    .object({ vehicle: slug, start: date, end: date, reason: text(2, 300) })
    .parse(data)
  insist(
    d.start >= todayInNepal() &&
      daysBetween(d.start, d.end) > 0 &&
      daysBetween(d.start, d.end) <= 365,
    422,
    'Choose a valid date range of up to 365 days.',
  )
  return tx(async (sql) => {
    const [r] = await sql.rows(
      'INSERT INTO availability_blocks(vehicle_id,starts_on,ends_on,reason,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [d.vehicle, d.start, d.end, d.reason, user.id],
    )
    await audit(sql, user.id, 'DATES_BLOCKED', 'block', r.id, {
      vehicle: d.vehicle,
      start: d.start,
      end: d.end,
    })
    return r
  })
}
