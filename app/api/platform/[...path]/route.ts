import { after } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { database, query } from '@/lib/platform/database'
import {
  checkOrigin,
  clientKey,
  cookieOptions,
  failure,
  jsonBody,
  rateLimit,
  response,
  session,
} from '@/lib/platform/security'
import {
  bookingDetail,
  changeBooking,
  createBooking,
  estimate,
  listBookings,
} from '@/lib/platform/bookings'
import { insist, quoteInput, sections } from '@/lib/platform/contracts'
import { catalog } from '@/lib/platform/catalog'
import { oauthStart } from '@/lib/platform/oauth'
import { authAction } from '@/lib/platform/identity'
import { dispatchOutbox, inbox, markRead } from '@/lib/platform/notifications'
import { newThread, reply, submitReview, threads } from '@/lib/platform/support'
import { adminRead, adminWrite } from '@/lib/platform/admin'
import { startPayment } from '@/lib/platform/payments'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const authRoutes = [
  'register',
  'login',
  'logout',
  'forgot',
  'reset',
  'verify',
  'profile',
  'password',
  'email',
  'verify-again',
  'bootstrap',
  'claim',
]
async function handle(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const paths = (await params).path
    const [group, action, id] = paths
    insist(paths.length <= 3, 404, 'Route not found.')
    const q = new URL(req.url).searchParams
    const user = await session()
    if (req.method === 'GET') {
      if (group === 'session') return response({ user })
      if (group === 'catalog') return response(await catalog())
      if (group === 'quote') {
        await rateLimit('quote:' + clientKey(req), 240, 60)
        return response(
          (
            await estimate(
              await database(),
              quoteInput.parse(Object.fromEntries(q)),
            )
          ).quote,
        )
      }
      insist(user, 401, 'Sign in to continue.')
      if (group === 'admin')
        return response(
          await adminRead(z.enum(sections).parse(action), user, q),
        )
      if (group === 'account') {
        if (action === 'bookings')
          return response(
            id
              ? await bookingDetail(id, user.customer_id)
              : await listBookings(
                  user.customer_id,
                  '',
                  q.get('status') || '',
                  Math.max(
                    0,
                    Math.min(10000, Math.trunc(Number(q.get('page')) || 0)),
                  ),
                  z
                    .enum(['all', 'upcoming', 'active', 'history'])
                    .parse(q.get('view') || 'all'),
                ),
          )
        if (action === 'overview') {
          const [counts] = await query(
            `SELECT count(*)::int AS "Total bookings",count(*) FILTER(WHERE status IN ('CONFIRMED','PENDING') AND pickup_date >= (now() AT TIME ZONE 'Asia/Kathmandu')::date)::int AS "Upcoming rentals",count(*) FILTER(WHERE status='ACTIVE')::int AS "Active rentals",count(*) FILTER(WHERE status='COMPLETED')::int AS "Completed rentals" FROM bookings WHERE customer_id=$1`,
            [user.customer_id],
          )
          return response({
            metrics: counts,
            bookings: (await listBookings(user.customer_id)).slice(0, 5),
          })
        }
        if (action === 'notifications') return response(await inbox(user))
        if (action === 'messages')
          return response(await threads(user.customer_id))
        if (action === 'profile') return response(user)
      }
      insist(false, 404, 'Route not found.')
    }
    checkOrigin(req)
    await rateLimit(
      `${group}:${clientKey(req)}`,
      group === 'auth' ? 100 : 90,
      600,
    )
    const body = await jsonBody(req)
    let result: unknown
    if (group === 'auth') {
      insist(
        req.method === 'POST' && authRoutes.includes(action),
        404,
        'Account action not found.',
      )
      result = await authAction(action, body, user)
    } else if (group === 'oauth' && req.method === 'POST')
      result = await oauthStart(action)
    else if (group === 'bookings' && !action && req.method === 'POST') {
      await rateLimit('booking-hour:' + clientKey(req), 12, 3600)
      const { claim, ...saved } = await createBooking(body, user)
      if (claim)
        (await cookies()).set('udrive_claim', claim, {
          ...cookieOptions(),
          maxAge: 7 * 86400,
        })
      result = saved
    } else if (group === 'support' && !action && req.method === 'POST')
      result = await newThread(body, user)
    else {
      insist(user, 401, 'Sign in to continue.')
      if (group === 'admin')
        result = await adminWrite(
          z.enum(sections).parse(action),
          id,
          body,
          user,
          req.method,
        )
      else if (group === 'account') {
        if (action === 'bookings' && id)
          result = await changeBooking(id, body, user, false)
        else if (action === 'reviews') result = await submitReview(body, user)
        else if (action === 'notifications' && id) {
          await markRead(user, id)
          result = { message: 'Marked as read.' }
        } else if (action === 'messages')
          result = id
            ? await reply(id, body, user, false)
            : await newThread(body, user)
        else if (action === 'checkout' && id)
          result = await startPayment(id, user)
        else insist(false, 404, 'Account operation not found.')
      } else insist(false, 404, 'Route not found.')
    }
    after(async () => {
      try {
        await dispatchOutbox(12)
      } catch {
        console.error('[U Drive] Outbox pending; scheduled worker will retry.')
      }
    })
    return response(result, group === 'bookings' ? 201 : 200)
  } catch (e) {
    return failure(e)
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE }
