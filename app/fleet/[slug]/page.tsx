import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fleet, getVehicle, money } from '@/lib/rental-data'
import { readTrip, type Query } from '@/lib/trip'
import { VehicleDetail } from '@/components/vehicle-detail'

export const generateStaticParams = () => fleet.map((v) => ({ slug: v.slug }))
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const v = getVehicle((await params).slug)
  return v
    ? {
        title: `${v.name} Rental — ${money(v.dailyRate)} / day`,
        description: `Explore the ${v.name} with U Drive Kathmandu. Choose self drive or with driver, view the gallery, and plan your rental at ${money(v.dailyRate)} per day.`,
      }
    : { title: 'Vehicle not found' }
}
export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Query>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const v = getVehicle(slug)
  if (!v) notFound()
  return <VehicleDetail vehicle={v} trip={readTrip(query)} />
}
