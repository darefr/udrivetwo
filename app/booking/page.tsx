import type { Metadata } from 'next'
import { BookingForm } from '@/components/booking-form'
import { PageIntro } from '@/components/shared'
import { catalog } from '@/lib/platform/catalog'
import { readTrip, type Query } from '@/lib/trip'
import { pageMetadata } from '@/lib/site-metadata'
export const metadata: Metadata = pageMetadata('/booking')
export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<Query>
}) {
  const query = await searchParams
  const { fleet, pickupLocations, destinations } = await catalog()
  const initial = readTrip(query, fleet, pickupLocations)
  const duration =
    typeof query.duration === 'string' ? Number(query.duration) : 0
  const plannedDays =
    Number.isInteger(duration) && duration >= 1 && duration <= 365
      ? duration
      : undefined
  const destination = destinations.find(
    (d) => d.slug === query.destination,
  )?.name
  return (
    <>
      <PageIntro
        current="Booking"
        eyebrow="PLAN YOUR RENTAL"
        title="Your next journey starts here."
        description="Choose your car and dates, check the estimate, then review your rental request. No account needed."
      />
      <BookingForm
        key={JSON.stringify([initial, destination, plannedDays])}
        initial={initial}
        plannedDays={plannedDays}
        destination={destination}
      />
    </>
  )
}
