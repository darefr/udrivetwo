import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Check, MapPin } from 'lucide-react'
import { faqs, fleet, modeLabel, money, type Vehicle } from '@/lib/rental-data'
import { tripHref, type Trip } from '@/lib/trip'
import { Breadcrumbs, FAQ, SectionHeading } from './shared'
import { VehicleGallery } from './vehicle-gallery'
import { StructuredData } from './structured-data'
import { VehicleCard } from './vehicle-card'

export function VehicleDetail({
  vehicle,
  trip,
}: {
  vehicle: Vehicle
  trip: Trip
}) {
  return (
    <>
      <StructuredData vehicle={vehicle} />
      <div className="wrap product-page">
        <Breadcrumbs
          items={[{ label: 'Fleet', href: '/fleet' }, { label: vehicle.name }]}
        />
        <div className="product-layout">
          <VehicleGallery vehicle={vehicle} />
          <div className="product-copy">
            <p className="eyebrow">U DRIVE COLLECTION</p>
            <h1>{vehicle.name}</h1>
            <p className="product-location">
              <MapPin size={15} />
              Kathmandu, Nepal
            </p>
            <div className="product-rate">
              <span>Daily rental rate</span>
              <p>
                <strong>{money(vehicle.dailyRate)}</strong> / day
              </p>
            </div>
            <p className="product-overview">{vehicle.overview}</p>
            <div className="check-list">
              {vehicle.features.map((feature) => (
                <span key={feature}>
                  <Check />
                  {feature}
                </span>
              ))}
            </div>
            <div className="product-buttons">
              <Link
                href={
                  vehicle.availability === 'Unavailable'
                    ? `/contact?vehicle=${vehicle.slug}`
                    : tripHref('/booking', { ...trip, vehicle: vehicle.slug })
                }
                className="action primary"
              >
                {vehicle.availability === 'Unavailable'
                  ? 'Check alternatives'
                  : 'Rent This Car'}{' '}
                <ArrowRight size={17} />
              </Link>
              <Link
                className="text-link"
                href={`/contact?vehicle=${vehicle.slug}`}
              >
                Ask a question <ArrowUpRight size={15} />
              </Link>
            </div>
            <p className="fine-print">
              Final availability and any additional charges are confirmed before
              booking.
            </p>
          </div>
        </div>
      </div>
      <section className="section surface">
        <div className="wrap detail-facts">
          <div>
            <p className="eyebrow">RENTAL DETAILS</p>
            <h2>The essentials.</h2>
            <p className="section-description">
              A clear starting point for your trip.
            </p>
          </div>
          <dl className="fact-list">
            {[
              ['Vehicle', vehicle.name],
              ['Daily vehicle rate', money(vehicle.dailyRate)],
              ['Body style', vehicle.bodyType],
              ['Seats', String(vehicle.seats)],
              ['Transmission', vehicle.transmission],
              ['Powertrain', vehicle.fuel],
              ['Rental options', vehicle.modes.map(modeLabel).join(' · ')],
              [
                'Availability',
                vehicle.availability === 'Unavailable'
                  ? 'Currently unavailable'
                  : 'Confirm for your dates',
              ],
              ['Service area', 'Kathmandu and across Nepal'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="section">
        <div className="wrap detail-facts">
          <div>
            <p className="eyebrow">BEFORE YOU BOOK</p>
            <h2>Good to know.</h2>
            <p className="section-description">
              Ask about seating, luggage space, and exact equipment when
              confirming your vehicle.
            </p>
          </div>
          <FAQ items={[faqs[0], faqs[2], faqs[5]]} />
        </div>
      </section>
      <section className="section surface">
        <div className="wrap">
          <SectionHeading
            eyebrow="MORE FROM OUR FLEET"
            title="Explore the other cars."
            href="/fleet"
            linkText="View full fleet"
          />
          <div className="fleet-grid related-grid">
            {fleet
              .filter((v) => v.slug !== vehicle.slug)
              .slice(0, 3)
              .map((v) => (
                <VehicleCard
                  key={v.slug}
                  vehicle={v}
                  trip={{ ...trip, vehicle: v.slug }}
                />
              ))}
          </div>
        </div>
      </section>
    </>
  )
}
