'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarDays,
  CarFront,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react'
import {
  fleet,
  fleetCategories,
  matchesCategory,
  modeLabel,
  whatsAppContact,
} from '@/lib/rental-data'
import { displayDate, type Trip } from '@/lib/trip'
import { VehicleCard } from './vehicle-card'

export function FleetResults({
  trip,
  searched,
}: {
  trip: Trip
  searched: boolean
}) {
  const params = useSearchParams()
  const category =
    fleetCategories.find((c) => c.toLowerCase() === params.get('category')) ??
    'All'
  const sort = ['low', 'high'].includes(params.get('sort') ?? '')
    ? params.get('sort')!
    : 'featured'
  const [limit, setLimit] = useState(8)
  const refine = (key: 'category' | 'sort', value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === 'all' || value === 'featured') next.delete(key)
    else next.set(key, value)
    window.history.replaceState(
      null,
      '',
      `/fleet${next.size ? `?${next}` : ''}`,
    )
    setLimit(8)
  }
  const matches = fleet.filter(
    (v) =>
      (!trip.vehicle || v.slug === trip.vehicle) &&
      (!searched || v.modes.includes(trip.mode)) &&
      matchesCategory(v, category),
  )
  if (sort !== 'featured')
    matches.sort((a, b) =>
      sort === 'low' ? a.dailyRate - b.dailyRate : b.dailyRate - a.dailyRate,
    )
  return (
    <section className="content-section" aria-label="Fleet collection">
      <div className="wrap">
        <div className="results-toolbar">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2>
              {searched ? 'Your matching vehicles' : 'Explore our vehicles'}
            </h2>
          </div>
          <label className="sort-control">
            <SlidersHorizontal size={15} />
            <span className="sr-only">Sort vehicles</span>
            <select
              value={sort}
              onChange={(e) => refine('sort', e.target.value)}
            >
              <option value="featured">Featured first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
        <div
          className="filter-tabs fleet-filters"
          role="group"
          aria-label="Filter by vehicle category"
        >
          {fleetCategories.map((c) => (
            <button
              type="button"
              key={c}
              aria-pressed={category === c}
              onClick={() => refine('category', c.toLowerCase())}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="result-context" aria-live="polite">
          <span>
            {matches.length} {matches.length === 1 ? 'vehicle' : 'vehicles'}
          </span>
          {searched && (
            <>
              <span className="inline-icon">
                <MapPin size={13} />
                {trip.pickup}
              </span>
              <span>{modeLabel(trip.mode)}</span>
              {trip.start && trip.end && (
                <span className="inline-icon">
                  <CalendarDays size={13} />
                  {displayDate(trip.start)} – {displayDate(trip.end)}
                </span>
              )}
              <Link href="/fleet">Clear search</Link>
            </>
          )}
        </div>
        {matches.length ? (
          <div className="fleet-grid">
            {matches.slice(0, limit).map((v) => (
              <VehicleCard vehicle={v} key={v.slug} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="empty-result fleet-empty">
            <CarFront size={25} />
            <h3>No cars match this selection.</h3>
            <p>
              Try another category, or ask the rental desk about a specific
              model.
            </p>
            <div className="action-row">
              <Link href="/fleet" className="action outline">
                Reset filters
              </Link>
              <a
                className="text-link"
                href={whatsAppContact.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ask U Drive <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        )}
        {matches.length > limit && (
          <button
            type="button"
            className="action outline fleet-more"
            onClick={() => setLimit((n) => n + 8)}
          >
            Show more vehicles
          </button>
        )}
        <p className="fine-print">
          Published daily vehicle rates. Availability, driver service, and
          delivery are confirmed for your itinerary.
        </p>
      </div>
    </section>
  )
}
