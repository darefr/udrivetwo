import { z } from 'zod'
import { audit, query, tx } from './database'
import { email, insist, text, type Principal } from './contracts'
import { enqueue, notify } from './notifications'
export async function newThread(data: unknown, user: Principal | null) {
  const d = z
    .object({
      name: text(2, 100),
      email,
      topic: text(2, 100),
      message: text(10, 2000),
      booking: text(1, 60).optional(),
    })
    .strict()
    .parse(data)
  return tx(async (sql) => {
    if (d.booking)
      insist(
        user &&
          (
            await sql.rows(
              'SELECT id FROM bookings WHERE id=$1 AND customer_id=$2',
              [d.booking, user.customer_id],
            )
          ).length,
        404,
        'Booking not found.',
      )
    const [t] = await sql.rows(
      'INSERT INTO threads(customer_id,booking_id,name,email,topic) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [user?.customer_id ?? null, d.booking ?? null, d.name, d.email, d.topic],
    )
    await sql.rows(
      'INSERT INTO messages(thread_id,sender_id,body) VALUES($1,$2,$3)',
      [t.id, user?.id ?? null, d.message],
    )
    await notify(
      sql,
      { permission: 'messages' },
      'MESSAGE',
      'New support enquiry',
      d.topic,
      `/admin?tab=messages&id=${t.id}`,
      d.booking,
    )
    return { id: t.id, message: 'Your message has reached the rental desk.' }
  })
}
export async function threads(customer: string | null) {
  return query(
    `SELECT t.*,COALESCE((SELECT json_agg(json_build_object('body',m.body,'staff',m.staff,'created_at',m.created_at) ORDER BY m.created_at) FROM messages m WHERE m.thread_id=t.id),'[]') AS conversation FROM threads t WHERE ($1::text IS NULL OR t.customer_id=$1) ORDER BY t.updated_at DESC LIMIT 100`,
    [customer],
  )
}
export async function reply(
  id: string,
  data: unknown,
  user: Principal,
  staff: boolean,
) {
  const { message } = z.object({ message: text(1, 2000) }).parse(data)
  return tx(async (sql) => {
    const [t] = await sql.rows(
      'SELECT t.*,c.user_id FROM threads t LEFT JOIN customers c ON c.id=t.customer_id WHERE t.id=$1 AND ($2::text IS NULL OR t.customer_id=$2)',
      [id, staff ? null : user.customer_id],
    )
    insist(t, 404, 'Conversation not found.')
    await sql.rows(
      'INSERT INTO messages(thread_id,sender_id,staff,body) VALUES($1,$2,$3,$4)',
      [id, user.id, staff, message],
    )
    await sql.rows('UPDATE threads SET updated_at=now() WHERE id=$1', [id])
    if (staff) {
      if (t.user_id)
        await notify(
          sql,
          { user: t.user_id },
          'MESSAGE',
          'Reply from U Drive',
          t.topic,
          `/account?tab=support&id=${id}`,
          t.booking_id,
        )
      await enqueue(
        sql,
        'email',
        t.email,
        'SUPPORT',
        `U Drive: ${t.topic}`,
        message,
      )
      await audit(sql, user.id, 'SUPPORT_REPLY', 'thread', id)
    } else
      await notify(
        sql,
        { permission: 'messages' },
        'MESSAGE',
        'New customer reply',
        t.topic,
        `/admin?tab=messages&id=${id}`,
        t.booking_id,
      )
    return { message: 'Reply saved.' }
  })
}
export async function submitReview(data: unknown, user: Principal) {
  const d = z
    .object({
      booking: text(1, 60),
      rating: z.coerce.number().int().min(1).max(5),
      body: text(10, 2000),
    })
    .strict()
    .parse(data)
  return tx(async (sql) => {
    const [b] = await sql.rows(
      "SELECT vehicle_id FROM bookings WHERE id=$1 AND customer_id=$2 AND status='COMPLETED'",
      [d.booking, user.customer_id],
    )
    insist(b, 403, 'Reviews are available after your own completed rental.')
    const [r] = await sql.rows(
      'INSERT INTO reviews(booking_id,user_id,vehicle_id,rating,body) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [d.booking, user.id, b.vehicle_id, d.rating, d.body],
    )
    await notify(
      sql,
      { permission: 'reviews' },
      'REVIEW',
      'Review awaiting approval',
      `A ${d.rating}-star review was submitted.`,
      `/admin?tab=reviews&id=${r.id}`,
      d.booking,
    )
    return { message: 'Thank you. Your review is awaiting moderation.' }
  })
}
