import { query } from './database'
import { can, type Principal } from './contracts'
import { inbox } from './notifications'
import { listBookings } from './bookings'
export async function overview(user: Principal) {
  const metrics: Record<string, number | string> = {}
  if (can(user, 'bookings')) {
    const [r] = await query(
      `SELECT count(*)::int AS "Total bookings",count(*) FILTER(WHERE status='PENDING')::int AS "Pending bookings",count(*) FILTER(WHERE status='CONFIRMED')::int AS "Confirmed bookings",count(*) FILTER(WHERE status='ACTIVE')::int AS "Active rentals",count(*) FILTER(WHERE status='COMPLETED')::int AS "Completed rentals",count(*) FILTER(WHERE status='CANCELLED')::int AS "Cancelled bookings",count(*) FILTER(WHERE status='REJECTED')::int AS "Rejected bookings" FROM bookings`,
    )
    Object.assign(metrics, r)
  }
  if (can(user, 'customers'))
    Object.assign(
      metrics,
      (
        await query('SELECT count(*)::int AS "Total customers" FROM customers')
      )[0],
    )
  if (can(user, 'vehicles') || can(user, 'availability')) {
    const [s] = await query(
      `SELECT count(*)::int AS "Total vehicles",count(*) FILTER(WHERE active AND available AND NOT EXISTS(SELECT 1 FROM occupied_days o WHERE o.vehicle_id=v.slug AND day=(now() AT TIME ZONE 'Asia/Kathmandu')::date))::int AS "Available today" FROM vehicles v`,
    )
    Object.assign(metrics, s, {
      'Unavailable today': s['Total vehicles'] - s['Available today'],
    })
  }
  if (can(user, 'reports')) {
    const rev = await query(
      "SELECT currency,sum(total) AS total FROM bookings WHERE status IN ('CONFIRMED','ACTIVE','COMPLETED') GROUP BY currency",
    )
    metrics['Estimated revenue'] =
      rev
        .map((r) => `${r.currency} ${Number(r.total).toLocaleString('en-US')}`)
        .join(' / ') || 'No confirmed rentals'
  }
  return {
    metrics,
    recentBookings: can(user, 'bookings')
      ? (await listBookings(null)).slice(0, 5)
      : [],
    recentCustomers: can(user, 'customers')
      ? await query(
          'SELECT id,name,email,created_at FROM customers ORDER BY created_at DESC LIMIT 5',
        )
      : [],
    recentNotifications: (await inbox(user, true)).slice(0, 5),
  }
}
export async function reports(from: string, to: string) {
  const range =
    "created_at >= $1::date AT TIME ZONE 'Asia/Kathmandu' AND created_at < ($2::date+1) AT TIME ZONE 'Asia/Kathmandu'"
  const result: Record<string, unknown[]> = {}
  for (const [label, group] of [
    [
      'Bookings by date',
      "to_char(created_at AT TIME ZONE 'Asia/Kathmandu','YYYY-MM-DD')",
    ],
    ['Vehicle performance', 'vehicle_id'],
    ['Rental types', 'mode'],
    ['Rental outcomes', 'status'],
    ['Popular pickup locations', 'location_id'],
  ])
    result[label] = await query(
      `SELECT ${group} AS label,count(*)::int AS rentals,currency,coalesce(sum(total) FILTER(WHERE status IN ('CONFIRMED','ACTIVE','COMPLETED')),0)::bigint AS estimated FROM bookings WHERE ${range} GROUP BY 1,currency ORDER BY rentals DESC,label LIMIT 366`,
      [from, to],
    )
  result['Customer growth'] = await query(
    `SELECT to_char(created_at AT TIME ZONE 'Asia/Kathmandu','YYYY-MM') AS label,count(*)::int AS customers FROM customers WHERE ${range} GROUP BY 1 ORDER BY 1`,
    [from, to],
  )
  return result
}
