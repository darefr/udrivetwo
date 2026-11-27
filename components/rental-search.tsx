'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CarFront, ChevronDown, KeyRound, MapPin, Search } from 'lucide-react'
import { DatePicker } from './date-picker'
import { rentalModes } from '@/lib/rental-data'
import { useRentalPlatform } from './platform-provider'
import {
  daysBetween,
  nextDay,
  todayInNepal,
  tripHref,
  type Trip,
} from '@/lib/trip'

const blankTrip: Trip = {
  vehicle: '',
  mode: 'self-drive',
  pickup: 'Kathmandu',
  start: '',
  end: '',
}
export function RentalSearch({ initial = blankTrip }: { initial?: Trip }) {
  const { fleet, pickupLocations, currency } = useRentalPlatform()
  const [trip, setTrip] = useState<Trip>(initial)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const id = useId()
  const router = useRouter()
  useEffect(() => setReady(true), [])
  const update = (key: keyof Trip, value: string) => {
    setTrip((old) => ({
      ...old,
      [key]: value,
      ...(key === 'start' && old.end <= value ? { end: '' } : {}),
    }))
    setError('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (
      (trip.start || trip.end) &&
      (!trip.start ||
        !trip.end ||
        !daysBetween(trip.start, trip.end) ||
        trip.start < todayInNepal())
    ) {
      setError(
        'Choose a pickup date and a later return date, or leave both dates blank.',
      )
      return
    }
    router.push(tripHref('/fleet', trip))
  }
  return (
    <form
      className="rental-search"
      onSubmit={submit}
      aria-label="Find a car"
      data-ready={ready}
    >
      <div className="search-panel-heading">
        <span>
          <CarFront size={17} /> Rental search
        </span>
        <small>Daily rates in {currency}</small>
      </div>
      <div className="search-grid">
        <div className="search-field">
          <label htmlFor={`${id}-pickup`}>Pickup Location</label>
          <div className="search-control">
            <MapPin />
            <select
              id={`${id}-pickup`}
              value={trip.pickup}
              onChange={(e) => update('pickup', e.target.value)}
            >
              {pickupLocations.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <ChevronDown className="control-chevron" />
          </div>
        </div>
        <div className="search-field">
          <label htmlFor={`${id}-vehicle`}>Vehicle</label>
          <div className="search-control">
            <CarFront />
            <select
              id={`${id}-vehicle`}
              value={trip.vehicle}
              onChange={(e) => update('vehicle', e.target.value)}
            >
              <option value="">All vehicles</option>
              {fleet.map((v) => (
                <option value={v.slug} key={v.slug}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown className="control-chevron" />
          </div>
        </div>
        {(['start', 'end'] as const).map((key) => (
          <div className="search-field" key={key}>
            <label htmlFor={`${id}-${key}`}>
              {key === 'start' ? 'Pickup Date' : 'Return Date'}
            </label>
            <DatePicker
              compact
              id={`${id}-${key}`}
              label={key === 'start' ? 'Pickup Date' : 'Return Date'}
              value={trip[key]}
              min={
                key === 'start'
                  ? todayInNepal()
                  : nextDay(trip.start || todayInNepal())
              }
              onChange={(value) => update(key, value)}
            />
          </div>
        ))}
        <div className="search-field">
          <label htmlFor={`${id}-mode`}>Rental Type</label>
          <div className="search-control">
            <KeyRound />
            <select
              id={`${id}-mode`}
              value={trip.mode}
              onChange={(e) => update('mode', e.target.value)}
            >
              {rentalModes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="control-chevron" />
          </div>
        </div>
        <button className="action primary search-submit" type="submit">
          <Search size={17} />
          Find a Car
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
