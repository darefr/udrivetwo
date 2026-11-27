import { z } from 'zod'
import { audit, query, tx, settings } from './database'
import {
  can,
  permit,
  insist,
  text,
  slug,
  date,
  safeImage,
  roles,
  settingsInput,
  vehicleInput,
  type Principal,
  type Section,
} from './contracts'
import { vehicles, calendar } from './catalog'
import {
  blockDates,
  bookingDetail,
  changeBooking,
  listBookings,
} from './bookings'
import { inbox, notify, markRead, dispatchOutbox } from './notifications'
import { reply, threads } from './support'
import { overview, reports } from './reports'
import { addRentalDays, todayInNepal } from '../trip'
export async function adminRead(
  area: Section,
  user: Principal,
  q: URLSearchParams,
) {
  permit(user, area)
  const search = (q.get('search') || '').slice(0, 150)
  const id = q.get('id')?.slice(0, 100)
  const page = Math.min(
    10000,
    Math.max(0, Math.floor(Number(q.get('page')) || 0)),
  )
  const from = date.parse(q.get('from') || todayInNepal().slice(0, 7) + '-01'),
    to = date.parse(q.get('to') || addRentalDays(from, 31))
  insist(
    to >= from && to <= addRentalDays(from, 365),
    422,
    'Choose a date range of up to one year.',
  )
  switch (area) {
    case 'overview':
      return overview(user)
    case 'reports':
      return { groups: await reports(from, to) }
    case 'bookings':
      return {
        rows: await listBookings(null, search, q.get('status') || '', page),
        detail: id ? await bookingDetail(id, null) : null,
      }
    case 'vehicles':
    case 'pricing':
      return {
        rows: (await vehicles(true)).filter((v) =>
          v.name.toLowerCase().includes(search.toLowerCase()),
        ),
        areas: await query(
          'SELECT slug,name FROM locations WHERE active ORDER BY sort_order',
        ),
        fees: await settings().then((s) => ({
          deliveryFee: s.deliveryFee,
          extraFee: s.extraFee,
        })),
      }
    case 'customers': {
      const rows = await query(
        "SELECT id,name,email,phone,enabled,created_at FROM customers WHERE concat_ws(' ',name,email,phone) ILIKE $1 ORDER BY created_at DESC LIMIT 50 OFFSET $2",
        ['%' + search + '%', page * 50],
      )
      let detail = null
      if (id) {
        const [c] = await query(
          'SELECT id,name,email,phone,enabled,note,created_at FROM customers WHERE id=$1',
          [id],
        )
        insist(c, 404, 'Customer not found.')
        detail = { ...c, bookings: await listBookings(id) }
      }
      return { rows, detail }
    }
    case 'availability': {
      const cars = await vehicles(true)
      const v = q.get('vehicle') || cars[0]?.slug
      return {
        vehicles: cars.map((x) => ({
          slug: x.slug,
          name: x.name,
          available: x.available,
        })),
        vehicle: v,
        days: v ? await calendar(v, from, addRentalDays(to, 1)) : [],
        rows: v
          ? await query(
              'SELECT id,vehicle_id,starts_on::text,ends_on::text,reason FROM availability_blocks WHERE vehicle_id=$1 AND starts_on<=$3::date AND ends_on>$2::date ORDER BY starts_on',
              [v, from, to],
            )
          : [],
      }
    }
    case 'payments':
      return {
        rows: await query(
          'SELECT id,booking_id,status,currency,due,received,provider,transaction_ref,updated_at FROM payments WHERE booking_id ILIKE $1 ORDER BY updated_at DESC LIMIT 50 OFFSET $2',
          ['%' + search + '%', page * 50],
        ),
      }
    case 'reviews':
      return {
        rows: await query(
          'SELECT r.*,u.name AS customer,v.name AS vehicle FROM reviews r JOIN users u ON u.id=r.user_id JOIN vehicles v ON v.slug=r.vehicle_id ORDER BY r.created_at DESC LIMIT 100',
        ),
      }
    case 'locations':
      return {
        rows: await query('SELECT * FROM locations ORDER BY sort_order,name'),
      }
    case 'offers':
      return {
        rows: await query(
          'SELECT code,description,percent,starts_on::text,ends_on::text,active FROM offers ORDER BY starts_on DESC',
        ),
      }
    case 'notifications':
      return {
        rows: await inbox(user, true),
        deliveries: can(user, 'settings')
          ? await query(
              'SELECT id,kind,channel,status,attempts,last_error,created_at FROM outbox ORDER BY created_at DESC LIMIT 50',
            )
          : [],
      }
    case 'messages':
      return { rows: await threads(null) }
    case 'settings':
      return { settings: await settings() }
    case 'users':
      return {
        rows: await query(
          "SELECT id,name,email,role,enabled FROM users WHERE concat_ws(' ',name,email) ILIKE $1 ORDER BY created_at DESC LIMIT 50 OFFSET $2",
          ['%' + search + '%', page * 50],
        ),
      }
    case 'activity':
      return {
        rows: await query(
          "SELECT a.id,a.action,a.entity,a.entity_id,a.detail,a.created_at,coalesce(u.name,'System / guest') AS actor FROM activity_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 50 OFFSET $1",
          [page * 50],
        ),
      }
  }
}
export async function adminWrite(
  area: Section,
  id: string | undefined,
  raw: unknown,
  user: Principal,
  method: string,
) {
  permit(user, area)
  const collections = ['vehicles', 'offers', 'locations', 'availability']
  const actions = ['notifications', 'messages', 'payments']
  const valid =
    method === 'DELETE'
      ? !!id && ['vehicles', 'locations', 'availability'].includes(area)
      : method === 'POST'
        ? !!id
          ? actions.includes(area)
          : collections.includes(area)
        : method === 'PATCH'
          ? area === 'settings'
            ? !id
            : !!id &&
              [
                'vehicles',
                'offers',
                'locations',
                'availability',
                'bookings',
                'customers',
                'users',
                'pricing',
                'reviews',
              ].includes(area)
          : false
  insist(valid, 405, 'Unsupported operation for this resource.')
  if (area === 'bookings' && id) return changeBooking(id, raw, user, true)
  if (area === 'messages' && id) return reply(id, raw, user, true)
  if (area === 'notifications' && id) {
    if (id === 'retry') {
      permit(user, 'settings')
      const { job } = z.object({ job: z.uuid() }).parse(raw)
      await tx(async (sql) => {
        await sql.rows(
          "UPDATE outbox SET status='QUEUED',attempts=0,next_attempt=now() WHERE id=$1 AND status IN ('FAILED','RETRY')",
          [job],
        )
        await audit(sql, user.id, 'DELIVERY_REQUEUED', 'outbox', job)
      })
      return { processed: await dispatchOutbox() }
    }
    await markRead(user, id)
    return { message: 'Marked as read.' }
  }
  if (area === 'payments' && id && method === 'POST') {
    const { recordReceipt } = await import('./receipts')
    return recordReceipt(id, raw, user)
  }
  if (area === 'availability' && method === 'POST' && !id)
    return blockDates(raw, user)
  return tx(async (sql) => {
    const targets: Partial<Record<Section, [string, string]>> = {
      vehicles: ['vehicles', 'slug'],
      pricing: ['vehicles', 'slug'],
      locations: ['locations', 'slug'],
      reviews: ['reviews', 'id'],
      offers: ['offers', 'code'],
      availability:
        method === 'DELETE'
          ? ['availability_blocks', 'id']
          : ['vehicles', 'slug'],
    }
    const target = targets[area]
    if (id && target)
      insist(
        (
          await sql.rows(
            `SELECT 1 FROM ${target[0]} WHERE ${target[1]}=$1 FOR UPDATE`,
            [id],
          )
        ).length,
        404,
        'Record not found.',
      )
    let key = id ?? ''
    let action =
      method === 'DELETE' ? 'DEACTIVATED' : id ? 'UPDATED' : 'CREATED'
    switch (area) {
      case 'vehicles': {
        if (method === 'DELETE') {
          insist(id, 422, 'Vehicle required.')
          await sql.rows(
            'UPDATE vehicles SET active=false,updated_at=now() WHERE slug=$1',
            [id],
          )
          break
        }
        const v = vehicleInput.parse(raw)
        insist(
          !id || id === v.slug,
          422,
          'Vehicle identifiers cannot be renamed.',
        )
        const [previous] = await sql.rows(
          'SELECT specs FROM vehicles WHERE slug=$1 FOR UPDATE',
          [v.slug],
        )
        insist(
          id ? previous : !previous,
          id ? 404 : 409,
          id ? 'Vehicle not found.' : 'That vehicle identifier exists.',
        )
        const specs = {
          ...previous?.specs,
          bodyType: v.bodyType,
          tier: v.tier,
          seats: v.seats,
          doors: v.doors,
          transmission: v.transmission,
          fuel: v.fuel,
          overview: v.overview,
          features: v.features,
          modes: v.modes,
        }
        const p = [
          v.slug,
          v.name,
          v.brand,
          v.model,
          JSON.stringify(specs),
          v.location,
          v.daily_rate,
          v.self_rate,
          v.driver_rate,
          v.available,
          v.active,
          v.featured,
          v.popular,
          v.sort_order,
        ]
        if (id)
          await sql.rows(
            'UPDATE vehicles SET name=$2,brand=$3,model=$4,specs=$5,location=$6,daily_rate=$7,self_rate=$8,driver_rate=$9,available=$10,active=$11,featured=$12,popular=$13,sort_order=$14,updated_at=now() WHERE slug=$1',
            p,
          )
        else
          await sql.rows(
            'INSERT INTO vehicles(slug,name,brand,model,specs,location,daily_rate,self_rate,driver_rate,available,active,featured,popular,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',
            p,
          )
        await sql.rows('DELETE FROM vehicle_images WHERE vehicle_id=$1', [
          v.slug,
        ])
        for (const [i, img] of v.gallery.entries())
          await sql.rows(
            'INSERT INTO vehicle_images(vehicle_id,path,label,sort_order) VALUES($1,$2,$3,$4)',
            [v.slug, img.image, img.label, i],
          )
        key = v.slug
        if (!v.available)
          await notify(
            sql,
            { permission: 'availability' },
            'AVAILABILITY',
            'Vehicle unavailable',
            v.name,
            '/admin?tab=availability',
          )
        break
      }
      case 'pricing': {
        insist(id, 422, 'Vehicle required.')
        const d = vehicleInput
          .pick({ daily_rate: true, self_rate: true, driver_rate: true })
          .parse(raw)
        await sql.rows(
          'UPDATE vehicles SET daily_rate=$2,self_rate=$3,driver_rate=$4,updated_at=now() WHERE slug=$1',
          [id, d.daily_rate, d.self_rate, d.driver_rate],
        )
        break
      }
      case 'availability': {
        insist(id, 422, 'Choose a vehicle or block.')
        if (method === 'DELETE') {
          const r = await sql.rows(
            'DELETE FROM availability_blocks WHERE id=$1 RETURNING id',
            [id],
          )
          insist(r.length, 404, 'Date block not found.')
          action = 'UNBLOCKED'
        } else {
          const { available } = z.object({ available: z.boolean() }).parse(raw)
          await sql.rows(
            'UPDATE vehicles SET available=$2,updated_at=now() WHERE slug=$1',
            [id, available],
          )
          await notify(
            sql,
            { permission: 'availability' },
            'AVAILABILITY',
            'Availability changed',
            `${id}: ${available ? 'available' : 'unavailable'}`,
            '/admin?tab=availability',
          )
        }
        break
      }
      case 'customers': {
        const d = z
          .object({ note: text(0, 2000), enabled: z.boolean() })
          .strict()
          .parse(raw)
        const [c] = await sql.rows(
          'SELECT c.id,c.user_id,c.enabled,u.role FROM customers c LEFT JOIN users u ON u.id=c.user_id WHERE c.id=$1',
          [id],
        )
        insist(c, 404, 'Customer not found.')
        insist(
          !c.role || c.role === 'CUSTOMER',
          403,
          'Manage staff through the Users section.',
        )
        if (c.enabled !== d.enabled)
          insist(
            can(user, 'bookings'),
            403,
            'Support staff may add notes but may not suspend accounts.',
          )
        await sql.rows('UPDATE customers SET note=$2,enabled=$3 WHERE id=$1', [
          id,
          d.note,
          d.enabled,
        ])
        if (!d.enabled && c.user_id)
          await sql.rows('DELETE FROM sessions WHERE user_id=$1', [c.user_id])
        break
      }
      case 'reviews': {
        const d = z
          .object({
            state: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN']),
            body: text(10, 2000),
            featured: z.boolean(),
          })
          .strict()
          .parse(raw)
        await sql.rows(
          'UPDATE reviews SET state=$2,body=$3,featured=$4 WHERE id=$1',
          [id, d.state, d.body, d.featured],
        )
        break
      }
      case 'locations': {
        if (method === 'DELETE') {
          await sql.rows('UPDATE locations SET active=false WHERE slug=$1', [
            id,
          ])
          break
        }
        const d = z
          .object({
            slug,
            name: text(1, 100),
            active: z.boolean(),
            sort_order: z.coerce.number().int().min(0).max(10000),
            details: z
              .object({
                category: text(1, 100),
                tagline: text(1, 160),
                description: text(1, 3000),
                stops: z.array(text(1, 140)).max(30),
                advice: text(1, 2000),
                image: safeImage,
                imageAlt: text(1, 240),
              })
              .nullable(),
          })
          .strict()
          .parse(raw)
        insist(
          !id || id === d.slug,
          422,
          'Location identifiers cannot be renamed.',
        )
        const p = [
          d.slug,
          d.name,
          d.active,
          d.sort_order,
          JSON.stringify(d.details ?? {}),
        ]
        await sql.rows(
          id
            ? 'UPDATE locations SET name=$2,active=$3,sort_order=$4,details=$5 WHERE slug=$1'
            : 'INSERT INTO locations(slug,name,active,sort_order,details) VALUES($1,$2,$3,$4,$5)',
          p,
        )
        key = d.slug
        break
      }
      case 'offers': {
        const d = z
          .object({
            code: z.string().regex(/^[A-Z0-9-]{1,30}$/),
            description: text(2, 300),
            percent: z.coerce.number().int().min(1).max(100),
            starts_on: date,
            ends_on: date,
            active: z.boolean(),
          })
          .strict()
          .parse(raw)
        insist(!id || id === d.code, 422, 'Offer codes cannot be renamed.')
        await sql.rows(
          id
            ? 'UPDATE offers SET description=$2,percent=$3,starts_on=$4,ends_on=$5,active=$6 WHERE code=$1'
            : 'INSERT INTO offers(code,description,percent,starts_on,ends_on,active) VALUES($1,$2,$3,$4,$5,$6)',
          [d.code, d.description, d.percent, d.starts_on, d.ends_on, d.active],
        )
        key = d.code
        break
      }
      case 'settings': {
        const d = settingsInput.parse(raw)
        insist(
          Intl.supportedValuesOf('currency').includes(d.currency),
          422,
          'Choose a valid ISO currency.',
        )
        await sql.rows('UPDATE settings SET value=$1 WHERE id=1', [
          JSON.stringify(d),
        ])
        action = 'UPDATED'
        break
      }
      case 'users': {
        const d = z
          .object({ role: z.enum(roles), enabled: z.boolean() })
          .strict()
          .parse(raw)
        insist(
          id && id !== user.id,
          403,
          'You cannot change your own role or status here.',
        )
        await sql.rows('SELECT pg_advisory_xact_lock(862006)')
        const [target] = await sql.rows(
          'SELECT id,role FROM users WHERE id=$1 FOR UPDATE',
          [id],
        )
        insist(target, 404, 'User not found.')
        if (
          target.role === 'SUPER_ADMIN' &&
          (d.role !== 'SUPER_ADMIN' || !d.enabled)
        )
          insist(
            (
              await sql.rows(
                "SELECT id FROM users WHERE role='SUPER_ADMIN' AND enabled AND id<>$1",
                [id],
              )
            ).length,
            409,
            'Keep at least one enabled owner.',
          )
        await sql.rows('UPDATE users SET role=$2,enabled=$3 WHERE id=$1', [
          id,
          d.role,
          d.enabled,
        ])
        await sql.rows('DELETE FROM sessions WHERE user_id=$1', [id])
        break
      }
      default:
        insist(false, 405, 'This operation is not supported.')
    }
    await audit(sql, user.id, action, area, key)
    return { message: 'Changes saved.', id: key }
  })
}
