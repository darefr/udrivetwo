import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { vehicleMetadata, missingMetadata } from '@/lib/site-metadata'

import { catalog } from '@/lib/platform/catalog'
import { readTrip, type Query } from '@/lib/trip'
import { VehicleDetail } from '@/components/vehicle-detail'

const getLiveVehicle = async (slug: string) =>
  (await catalog()).fleet.find((v) => v.slug === slug)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const v = await getLiveVehicle((await params).slug)
  return v ? vehicleMetadata(v) : missingMetadata
}
export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Query>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const v = await getLiveVehicle(slug)
  if (!v) notFound()
  return <VehicleDetail vehicle={v} trip={readTrip(query)} />
}
