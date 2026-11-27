import { cache } from 'react'
import { query } from './database'
import type { Destination, Review, Vehicle } from '../rental-data'
export type LiveVehicle = Vehicle & {
  brand: string
  model: string
  doors: number
  location: string
  active: boolean
  available: boolean
  featured: boolean
  popular: boolean
  sort_order: number
  self_rate: number | null
  driver_rate: number | null
}
export async function vehicles(
  includeInactive = false,
): Promise<LiveVehicle[]> {
  const rows = await query(
    `SELECT v.*,(SELECT value->>'currency' FROM settings WHERE id=1) AS currency,COALESCE((SELECT json_agg(json_build_object('image',i.path,'label',i.label) ORDER BY i.sort_order,i.id) FROM vehicle_images i WHERE i.vehicle_id=v.slug),'[]') AS gallery FROM vehicles v WHERE ($1 OR v.active) ORDER BY v.sort_order,v.name`,
    [includeInactive],
  )
  return rows.map((v) => ({
    ...v.specs,
    slug: v.slug,
    name: v.name,
    brand: v.brand,
    model: v.model,
    dailyRate: v.daily_rate,
    currency: v.currency,
    self_rate: v.self_rate,
    driver_rate: v.driver_rate,
    location: v.location,
    available: v.available,
    active: v.active,
    featured: v.featured,
    popular: v.popular,
    sort_order: v.sort_order,
    availability: v.available ? 'On request' : 'Unavailable',
    image: v.gallery[0]?.image,
    gallery: v.gallery,
  }))
}
export async function locations() {
  return query('SELECT * FROM locations WHERE active ORDER BY sort_order,name')
}
export async function publishedReviews(): Promise<Review[]> {
  return query<Review>(
    `SELECT split_part(u.name,' ',1) AS name,r.rating,r.body AS text,b.mode AS "rentalType",v.name AS vehicle,r.id FROM reviews r JOIN users u ON u.id=r.user_id JOIN bookings b ON b.id=r.booking_id JOIN vehicles v ON v.slug=r.vehicle_id WHERE r.state='APPROVED' ORDER BY r.featured DESC,r.created_at DESC LIMIT 100`,
  )
}
export const catalog = cache(async () => {
  const [fleet, areas, reviews] = await Promise.all([
    vehicles(),
    locations(),
    publishedReviews(),
  ])
  return {
    fleet,
    pickupLocations: areas.map((a) => a.name as string),
    destinations: areas
      .filter((a) => a.details.image)
      .map(
        (a) => ({ ...a.details, slug: a.slug, name: a.name }) as Destination,
      ),
    reviews,
  }
})
export async function calendar(vehicle: string, from: string, to: string) {
  return query(
    `SELECT day::text,CASE WHEN booking_id IS NULL THEN 'Blocked' ELSE 'Booked' END AS reason,booking_id,block_id FROM occupied_days WHERE vehicle_id=$1 AND day>=$2::date AND day<$3::date ORDER BY day`,
    [vehicle, from, to],
  )
}
