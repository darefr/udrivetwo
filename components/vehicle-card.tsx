import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, UserRound } from 'lucide-react'
import { money, type Vehicle } from '@/lib/rental-data'
import { tripHref, type Trip } from '@/lib/trip'
import { Wheel } from './brand'

export function VehicleCard({
  vehicle,
  trip = {},
}: {
  vehicle: Vehicle
  trip?: Partial<Trip>
}) {
  const details = tripHref(`/fleet/${vehicle.slug}`, trip)
  return (
    <article className="vehicle-card">
      <Link
        href={details}
        className="vehicle-photo"
        aria-label={`${vehicle.fuel === 'Electric' ? 'Electric ' : ''}${vehicle.bodyType}: View ${vehicle.name} details`}
      >
        <Image
          src={vehicle.image}
          alt={`${vehicle.name}, front three-quarter exterior view`}
          width={508}
          height={508}
          sizes="(max-width: 640px) 80vw, (max-width: 950px) 44vw, 24vw"
        />
        <span className="vehicle-category">
          {vehicle.fuel === 'Electric' ? 'Electric ' : ''}
          {vehicle.bodyType}
        </span>
        <span className="image-open">
          <ArrowUpRight size={16} />
        </span>
      </Link>
      <div className="vehicle-content">
        <h3>
          <Link href={details}>{vehicle.name}</Link>
        </h3>
        <p className="vehicle-spec-line">
          {vehicle.seats} seats <span>·</span>{' '}
          {vehicle.transmission === 'Confirm variant'
            ? 'Gearbox on request'
            : vehicle.transmission}{' '}
          <span>·</span> {vehicle.tier}
        </p>
        <div className="vehicle-modes">
          {vehicle.modes.includes('self-drive') && (
            <span>
              <Wheel size={14} />
              Self Drive
            </span>
          )}
          {vehicle.modes.length > 1 && <i />}
          {vehicle.modes.includes('with-driver') && (
            <span>
              <UserRound size={14} />
              With Driver
            </span>
          )}
        </div>
        <p className="car-price">
          <strong>{money(vehicle.dailyRate, vehicle.currency)}</strong>
          <span> / day</span>
        </p>
        <div className="vehicle-actions">
          <Link href={details} className="text-link">
            View Details
            <ArrowRight size={14} />
          </Link>
          <Link
            className="small-book"
            href={
              vehicle.availability === 'Unavailable'
                ? `/contact?vehicle=${vehicle.slug}`
                : tripHref('/booking', { ...trip, vehicle: vehicle.slug })
            }
          >
            {vehicle.availability === 'Unavailable'
              ? 'Ask the team'
              : 'Rent This Car'}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  )
}
