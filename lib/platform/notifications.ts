import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  devDirectory,
  localMode,
  query,
  settings,
  tx,
  type Sql,
  type Row,
} from './database'
import { rights, type Principal, type Section } from './contracts'
export async function notify(
  sql: Sql,
  target: { user?: string; permission?: Section },
  kind: string,
  title: string,
  body: string,
  link: string,
  booking: string | null = null,
) {
  await sql.rows(
    'INSERT INTO notifications(user_id,permission,kind,title,body,link,booking_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [
      target.user ?? null,
      target.permission ?? null,
      kind,
      title,
      body,
      link,
      booking,
    ],
  )
}
export async function enqueue(
  sql: Sql,
  channel: 'email' | 'whatsapp',
  recipient: string,
  kind: string,
  subject: string,
  body: string,
  booking: string | null = null,
) {
  if (!recipient) return
  await sql.rows(
    'INSERT INTO outbox(channel,recipient,kind,subject,body,booking_id) VALUES($1,$2,$3,$4,$5,$6)',
    [channel, recipient, kind, subject, body, booking],
  )
}
export const eventNames: Record<string, string> = {
  NEW: 'Booking received',
  CONFIRMED: 'Booking confirmed',
  REJECTED: 'Booking declined',
  CANCELLED: 'Booking cancelled',
  ACTIVE: 'Your rental is active',
  COMPLETED: 'Rental completed',
  MODIFIED: 'Booking updated',
  REMINDER: 'Upcoming rental reminder',
}
export async function bookingEvent(
  sql: Sql,
  id: string,
  event: string,
  actor: string | null,
) {
  const [b] = await sql.rows(
    `SELECT b.*,to_char(b.pickup_date,'YYYY-MM-DD') AS start,to_char(b.return_date,'YYYY-MM-DD') AS finish,c.user_id,v.name AS car,l.name AS pickup FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN vehicles v ON v.slug=b.vehicle_id JOIN locations l ON l.slug=b.location_id WHERE b.id=$1`,
    [id],
  )
  const cfg = await settings(sql)
  const subject = eventNames[event] || 'Booking update'
  const body = `${subject} · ${id}\n${b.car} · ${b.mode === 'self-drive' ? 'Self Drive' : 'With Driver'}\n${b.start} to ${b.finish} · ${b.pickup}\nHandover: ${b.delivery}${b.address ? ' · ' + b.address : ''}\nEstimated amount: ${b.currency} ${b.total.toLocaleString('en-US')}\nStatus: ${b.status}`
  const staff = `${body}\nCustomer: ${b.contact_name}\nPhone: ${b.contact_phone}\nEmail: ${b.contact_email}`
  await sql.rows(
    'INSERT INTO booking_history(booking_id,actor_id,event,status) VALUES($1,$2,$3,$4)',
    [id, actor, event, b.status],
  )
  if (b.user_id)
    await notify(
      sql,
      { user: b.user_id },
      event,
      subject,
      body,
      `/account?tab=bookings&id=${id}`,
      id,
    )
  await notify(
    sql,
    { permission: 'bookings' },
    event,
    subject,
    body,
    `/admin?tab=bookings&id=${id}`,
    id,
  )
  if (cfg.emailEnabled) {
    await enqueue(
      sql,
      'email',
      b.contact_email,
      event,
      `${subject} · ${id}`,
      `Hello ${b.contact_name},\n\n${body}\n\n${cfg.company}\n${cfg.whatsapp}`,
      id,
    )
    await enqueue(
      sql,
      'email',
      cfg.email ||
        process.env.ADMIN_EMAIL ||
        (localMode() ? 'desk@udrive.test' : ''),
      event,
      `Rental desk: ${subject} · ${id}`,
      staff,
      id,
    )
  }
  if (cfg.whatsappEnabled) {
    await enqueue(sql, 'whatsapp', cfg.whatsapp, event, subject, staff, id)
    if (b.wa_consent)
      await enqueue(sql, 'whatsapp', b.contact_phone, event, subject, body, id)
  }
}
export async function inbox(user: Principal, staff = false) {
  return query(
    `SELECT n.id,n.kind,n.title,n.body,n.link,n.booking_id,n.created_at,(r.read_at IS NOT NULL) AS read FROM notifications n LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=$1 WHERE ${staff ? 'n.permission=ANY($2::text[])' : 'n.user_id=$1'} ORDER BY n.created_at DESC LIMIT 200`,
    staff ? [user.id, rights[user.role]] : [user.id],
  )
}
export async function markRead(user: Principal, id: string) {
  await query(
    'INSERT INTO notification_reads(notification_id,user_id) SELECT id,$1 FROM notifications WHERE id=$2 AND (user_id=$1 OR permission=ANY($3::text[])) ON CONFLICT DO NOTHING',
    [user.id, id, rights[user.role]],
  )
}
export interface DeliveryAdapter {
  deliver(job: Row): Promise<'SENT' | 'DEV_CAPTURED'>
}
const capture: DeliveryAdapter = {
  async deliver(j) {
    if (!localMode()) throw new Error('Delivery provider not configured')
    const dir = path.join(devDirectory(), 'mailbox')
    await mkdir(dir, { recursive: true, mode: 0o700 })
    await writeFile(
      path.join(dir, `${j.id}.json`),
      JSON.stringify(
        {
          id: j.id,
          channel: j.channel,
          to: j.recipient,
          subject: j.subject,
          body: j.body,
          mode: 'development — not delivered',
        },
        null,
        2,
      ),
      { mode: 0o600 },
    )
    return 'DEV_CAPTURED'
  },
}
const smtp: DeliveryAdapter = {
  async deliver(j) {
    const { createTransport } = await import('nodemailer')
    const url = new URL(process.env.SMTP_URL!)
    if (!localMode() && url.protocol !== 'smtps:')
      throw new Error('Production SMTP requires implicit TLS')
    const transport = createTransport(url.href, {
      from: process.env.EMAIL_FROM,
    })
    await transport.sendMail({
      to: j.recipient,
      subject: j.subject,
      text: j.body,
      messageId: `<${j.id}@udrive.local>`,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    return 'SENT'
  },
}
const whatsapp: DeliveryAdapter = {
  async deliver(j) {
    const version = process.env.WHATSAPP_GRAPH_VERSION
    const number = process.env.WHATSAPP_PHONE_NUMBER_ID
    const template = process.env.WHATSAPP_TEMPLATE
    if (
      !/^v\d+\.0$/.test(version || '') ||
      !/^\d+$/.test(number || '') ||
      !template
    )
      throw new Error('WhatsApp provider not configured')
    const r = await fetch(
      `https://graph.facebook.com/${version}/${number}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: j.recipient.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: template,
            language: { code: process.env.WHATSAPP_LANGUAGE || 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: j.subject },
                  {
                    type: 'text',
                    text: j.body.replace(/\s+/g, ' ').slice(0, 1000),
                  },
                ],
              },
            ],
          },
        }),
        signal: AbortSignal.timeout(10000),
      },
    )
    if (!r.ok) throw new Error('WhatsApp provider declined delivery')
    return 'SENT'
  },
}
export async function dispatchOutbox(limit = 20) {
  const lease = randomUUID()
  const jobs = await tx((sql) =>
    sql.rows(
      `UPDATE outbox SET lease=$1,status='PROCESSING',attempts=attempts+1,next_attempt=now()+interval '5 minutes' WHERE id IN (SELECT id FROM outbox WHERE status IN ('QUEUED','RETRY','PROCESSING') AND next_attempt<=now() ORDER BY created_at LIMIT $2 FOR UPDATE SKIP LOCKED) RETURNING *`,
      [lease, limit],
    ),
  )
  for (const j of jobs) {
    try {
      const a =
        j.channel === 'email'
          ? process.env.SMTP_URL
            ? smtp
            : capture
          : process.env.WHATSAPP_ACCESS_TOKEN
            ? whatsapp
            : capture
      const state = await a.deliver(j)
      await query(
        "UPDATE outbox SET status=$3,lease=NULL,last_error=NULL,body=CASE WHEN kind IN ('reset','email','verify') THEN '[single-use account link redacted]' ELSE body END WHERE id=$1 AND lease=$2",
        [j.id, lease, state],
      )
    } catch {
      await tx(async (sql) => {
        await sql.rows(
          "UPDATE outbox SET status=$3,lease=NULL,last_error='Provider unavailable; check configuration.',next_attempt=now()+$4*interval '1 minute' WHERE id=$1 AND lease=$2",
          [
            j.id,
            lease,
            j.attempts >= 6 ? 'FAILED' : 'RETRY',
            Math.min(60, 2 ** j.attempts),
          ],
        )
        if (j.attempts === 6)
          await notify(
            sql,
            { permission: 'settings' },
            'SYSTEM',
            'Delivery needs attention',
            `${j.channel} delivery failed after six attempts.`,
            '/admin?tab=notifications',
          )
      })
    }
  }
  return jobs.length
}
export async function runJobs() {
  await tx(async (sql) => {
    const cfg = await settings(sql)
    const expired = await sql.rows(
      "UPDATE bookings SET status='CANCELLED',updated_at=now(),version=version+1 WHERE id IN (SELECT id FROM bookings WHERE status='PENDING' AND created_at<now()-$1*interval '1 hour' ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED) RETURNING id",
      [cfg.holdHours],
    )
    for (const b of expired) {
      await bookingEvent(sql, b.id, 'CANCELLED', null)
      await sql.rows(
        "INSERT INTO activity_log(action,entity,entity_id) VALUES('PENDING_HOLD_EXPIRED','booking',$1)",
        [b.id],
      )
    }
    const pending = await sql.rows(
      `INSERT INTO reminders(booking_id,pickup_date) SELECT id,pickup_date FROM bookings WHERE status='CONFIRMED' AND pickup_date=(now() AT TIME ZONE 'Asia/Kathmandu')::date+1 ON CONFLICT DO NOTHING RETURNING booking_id`,
    )
    for (const b of pending)
      await bookingEvent(sql, b.booking_id, 'REMINDER', null)
    for (const table of [
      'sessions',
      'verification_tokens',
      'oauth_attempts',
      'rate_limits',
    ])
      await sql.rows(`DELETE FROM ${table} WHERE expires_at<now()`)
  })
  return { processed: await dispatchOutbox() }
}
