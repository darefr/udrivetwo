import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  database,
  query,
  tx,
  initialize,
  type Database,
} from '../lib/platform/database'
import { createIdentity } from '../lib/platform/identity'
import { hashPassword, checkPassword } from '../lib/platform/security'
import {
  bookingDetail,
  createBooking,
  changeBooking,
  blockDates,
  estimate,
} from '../lib/platform/bookings'
import { adminRead, adminWrite } from '../lib/platform/admin'
import {
  dispatchOutbox,
  inbox,
  markRead,
  runJobs,
} from '../lib/platform/notifications'
import { startPayment } from '../lib/platform/payments'
import {
  newThread,
  reply,
  submitReview,
  threads,
} from '../lib/platform/support'
import { publishedReviews, vehicles } from '../lib/platform/catalog'
import { addRentalDays, todayInNepal } from '../lib/trip'
import type { Principal } from '../lib/platform/contracts'
let db: Database, owner: Principal, customer: Principal, other: Principal
const day = (n: number) => addRentalDays(todayInNepal(), n)
async function identity(name: string): Promise<Principal> {
  const addr = name.toLowerCase() + '@example.test'
  const id = await tx((sql) => createIdentity(sql, name, addr, null))
  const [c] = await query('SELECT id FROM customers WHERE user_id=$1', [id])
  return {
    id,
    email: addr,
    name,
    email_verified: true,
    customer_id: c.id,
    role: 'CUSTOMER',
    phone: '+9779800000000',
  }
}
const request = (start: number, end: number) => ({
  vehicle: 'byd-atto-3',
  mode: 'self-drive' as const,
  pickup: 'Kathmandu',
  start: day(start),
  end: day(end),
  delivery: 'pickup' as const,
  offer: '',
  name: 'Test Traveller',
  email: 'customer@example.test',
  phone: '+9779800000000',
  requestKey: randomUUID(),
})
before(async () => {
  for (const key of [
    'DATABASE_URL',
    'SMTP_URL',
    'WHATSAPP_ACCESS_TOKEN',
    'KHALTI_SECRET_KEY',
    'VERCEL',
    'VERCEL_ENV',
  ])
    delete process.env[key]
  process.env.UDRIVE_MODE = 'test'
  process.env.UDRIVE_DATA_DIR = await mkdtemp(join(tmpdir(), 'udrive-domain-'))
  db = await database()
  owner = await identity('Owner')
  owner.role = 'SUPER_ADMIN'
  await query("UPDATE users SET role='SUPER_ADMIN' WHERE id=$1", [owner.id])
  customer = await identity('Customer')
  other = await identity('Other')
})
after(async () => {
  await db?.close()
})
test('migration is repeatable and preserves the four original vehicles', async () => {
  await initialize(db)
  assert.equal((await vehicles()).length, 4)
})
test('passwords use independently salted slow hashes', async () => {
  const value = randomBytes(18).toString('hex')
  const a = await hashPassword(value),
    b = await hashPassword(value)
  assert.notEqual(a, b)
  assert(await checkPassword(value, a))
  assert.equal(await checkPassword('different', a), false)
})
test('simultaneous requests allocate a vehicle day only once', async () => {
  const result = await Promise.allSettled([
    createBooking(request(10, 13), customer),
    createBooking(request(11, 14), other),
  ])
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1)
  assert.equal(result.filter((r) => r.status === 'rejected').length, 1)
})
test('atomic idempotent retry does not duplicate payment or notifications', async () => {
  const d = request(20, 23)
  const [a, b] = await Promise.all([
    createBooking(d, customer),
    createBooking(d, customer),
  ])
  assert.equal(a.id, b.id)
  assert.equal(
    (await query('SELECT id FROM payments WHERE booking_id=$1', [a.id])).length,
    1,
  )
  assert.equal(
    (await query('SELECT id FROM notifications WHERE booking_id=$1', [a.id]))
      .length,
    2,
  )
  assert.equal(
    (await query('SELECT status FROM payments WHERE booking_id=$1', [a.id]))[0]
      .status,
    'PENDING',
  )
  await assert.rejects(createBooking({ ...d, name: 'Changed' }, customer))
  await assert.rejects(bookingDetail(a.id, other.customer_id))
  assert(
    !('internal_note' in (await bookingDetail(a.id, customer.customer_id))),
  )
  assert((await bookingDetail(a.id, customer.customer_id)).history.length)
})
test('blocks, bookings and adjacent returns share one unique ledger', async () => {
  const d = request(30, 32),
    a = await createBooking(d, customer)
  await assert.rejects(
    blockDates(
      {
        vehicle: d.vehicle,
        start: day(31),
        end: day(33),
        reason: 'Maintenance',
      },
      owner,
    ),
  )
  const block = await blockDates(
    { vehicle: d.vehicle, start: day(32), end: day(34), reason: 'Inspection' },
    owner,
  )
  await assert.rejects(createBooking(request(33, 35), other))
  await adminWrite('availability', block.id, {}, owner, 'DELETE')
  assert((await createBooking(request(32, 34), other)).id)
  await changeBooking(
    a.id,
    { version: 1, status: 'CANCELLED' },
    customer,
    false,
  )
  assert((await createBooking({ ...d, requestKey: randomUUID() }, other)).id)
})
test('quote, offer, delivery and mode rates are calculated on server', async () => {
  await adminWrite(
    'pricing',
    'byd-atto-3',
    { daily_rate: 9000, self_rate: 8500, driver_rate: 11000 },
    owner,
    'PATCH',
  )
  await adminWrite(
    'offers',
    undefined,
    {
      code: 'ROAD10',
      description: 'Ten percent off',
      percent: 10,
      starts_on: day(1),
      ends_on: day(90),
      active: true,
    },
    owner,
    'POST',
  )
  const q = await estimate(db, {
    ...request(40, 42),
    mode: 'with-driver',
    offer: 'ROAD10',
  })
  assert.equal(q.quote.total, 19800)
  assert.equal(q.quote.driverQuoted, false)
  await assert.rejects(
    createBooking({ ...request(40, 42), expectedTotal: 1 }, customer),
  )
  await assert.rejects(
    createBooking({ ...request(40, 42), total: 1 }, customer),
  )
  await assert.rejects(
    createBooking({ ...request(40, 42), email: 'invalid' }, customer),
  )
})
test('state changes, stale edits, review eligibility and moderation', async () => {
  const b = await createBooking(request(50, 53), customer)
  await assert.rejects(
    submitReview(
      { booking: b.id, rating: 5, body: 'Helpful rental desk.' },
      customer,
    ),
  )
  await assert.rejects(
    changeBooking(b.id, { version: 1, status: 'COMPLETED' }, owner, true),
  )
  await changeBooking(
    b.id,
    { version: 1, status: 'CONFIRMED', note: 'Desk-only memo' },
    owner,
    true,
  )
  await assert.rejects(
    changeBooking(b.id, { version: 1, status: 'CANCELLED' }, owner, true),
  )
  await changeBooking(b.id, { version: 2, status: 'ACTIVE' }, owner, true)
  await changeBooking(b.id, { version: 3, status: 'COMPLETED' }, owner, true)
  await assert.rejects(
    submitReview(
      { booking: b.id, rating: 5, body: 'Helpful rental desk.' },
      other,
    ),
  )
  await submitReview(
    { booking: b.id, rating: 5, body: 'Helpful rental desk.' },
    customer,
  )
  assert.equal((await publishedReviews()).length, 0)
  const [r] = await query('SELECT id FROM reviews WHERE booking_id=$1', [b.id])
  await adminWrite(
    'reviews',
    r.id,
    { state: 'APPROVED', featured: true, body: 'Helpful rental desk.' },
    owner,
    'PATCH',
  )
  assert.equal((await publishedReviews()).length, 1)
  assert((await inbox(customer)).some((n) => n.kind === 'COMPLETED'))
  assert(
    (await query('SELECT id FROM activity_log WHERE entity_id=$1', [b.id]))
      .length >= 4,
  )
})
test('notification reads are isolated and support threads enforce ownership', async () => {
  const notes = await inbox(customer)
  await markRead(other, notes[0].id)
  assert(!(await inbox(customer))[0].read)
  await markRead(customer, notes[0].id)
  assert((await inbox(customer))[0].read)
  const t = await newThread(
    {
      name: customer.name,
      email: customer.email,
      topic: 'Pickup',
      message: 'Where is the pickup point?',
    },
    customer,
  )
  await assert.rejects(reply(t.id, { message: 'Wrong account' }, other, false))
  await reply(t.id, { message: 'Meet at the agreed point.' }, owner, true)
  assert.equal((await threads(customer.customer_id))[0].conversation.length, 2)
  assert.equal((await threads(other.customer_id)).length, 0)
})
test('role checks protect reads and mutations, including internal reports', async () => {
  await assert.rejects(adminRead('bookings', customer, new URLSearchParams()))
  await assert.rejects(
    adminWrite(
      'users',
      other.id,
      { role: 'SUPER_ADMIN', enabled: true },
      { ...owner, role: 'SUPPORT_STAFF' },
      'PATCH',
    ),
  )
  const limited = await adminRead(
    'overview',
    { ...owner, role: 'FLEET_MANAGER' },
    new URLSearchParams(),
  )
  assert.deepEqual((limited as any).recentBookings, [])
  await assert.rejects(
    adminWrite(
      'users',
      owner.id,
      { role: 'CUSTOMER', enabled: false },
      owner,
      'PATCH',
    ),
  )
})
test('partial receipts are capped, idempotent, audited and refundable', async () => {
  const { recordReceipt } = await import('../lib/platform/receipts')
  const b = await createBooking(request(80, 82), customer)
  await changeBooking(b.id, { version: 1, status: 'CONFIRMED' }, owner, true)
  const [p] = await query('SELECT id FROM payments WHERE booking_id=$1', [b.id])
  const entry = {
    direction: 'RECEIPT',
    method: 'Cash',
    reference: randomUUID(),
    amount: 3000,
    confirmed: true,
  }
  await recordReceipt(p.id, entry, owner)
  await recordReceipt(p.id, entry, owner)
  assert.equal(
    (await query('SELECT status FROM payments WHERE id=$1', [p.id]))[0].status,
    'PARTIAL',
  )
  await assert.rejects(
    recordReceipt(
      p.id,
      { ...entry, reference: randomUUID(), amount: 10000000 },
      owner,
    ),
  )
  await assert.rejects(
    changeBooking(b.id, { version: 2, status: 'CANCELLED' }, customer, false),
  )
  await recordReceipt(
    p.id,
    { ...entry, reference: randomUUID(), direction: 'REFUND' },
    owner,
  )
  assert.equal(
    (await query('SELECT status FROM payments WHERE id=$1', [p.id]))[0].status,
    'REFUNDED',
  )
})
test('unconfigured payment provider never reports a successful charge', async () => {
  const b = await createBooking(request(60, 62), customer)
  await assert.rejects(startPayment(b.id, customer))
  const [p] = await query(
    'SELECT received,status FROM payments WHERE booking_id=$1',
    [b.id],
  )
  assert.deepEqual(p, { received: 0, status: 'PENDING' })
})
test('reminders are deduplicated and development delivery is explicitly captured', async () => {
  const b = await createBooking(request(1, 3), customer)
  await changeBooking(b.id, { version: 1, status: 'CONFIRMED' }, owner, true)
  await runJobs()
  await runJobs()
  assert.equal(
    (
      await query(
        "SELECT id FROM booking_history WHERE booking_id=$1 AND event='REMINDER'",
        [b.id],
      )
    ).length,
    1,
  )
  await dispatchOutbox(200)
  const [{ n }] = await query(
    "SELECT count(*)::int AS n FROM outbox WHERE status='DEV_CAPTURED'",
  )
  assert(n > 0)
  assert(!(await query("SELECT id FROM outbox WHERE status='SENT'")).length)
})
