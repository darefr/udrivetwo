'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Pencil,
  UserRound,
} from 'lucide-react'
import {
  modeLabel,
  money,
  rentalModes,
  whatsAppContact,
} from '@/lib/rental-data'
import {
  bookingSteps,
  enquiryRows,
  enquiryText,
  needsAddress,
  validateStep,
  type Customer,
  type Handover,
} from '@/lib/booking'
import {
  addRentalDays,
  daysBetween,
  displayDate,
  downloadText,
  nextDay,
  todayInNepal,
  type Trip,
} from '@/lib/trip'
import { useInteractive } from '@/lib/use-interactive'
import { recordConversion } from '@/lib/privacy'
import { BookingSummary } from './booking-summary'
import { DatePicker } from './date-picker'
import { FormField, PreviewNote } from './form-parts'
import { FieldGroup, FieldLegend, FieldSet } from './ui/field'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Wheel } from './brand'

import { api, useRentalPlatform } from './platform-provider'
import useSWR from 'swr'
import type { Quote } from '@/lib/platform/contracts'

function RentalPolicyNote() {
  const { policies, cancellation } = useRentalPlatform()
  return (
    <details className="step-help">
      <summary>Rental and cancellation policies</summary>
      <p>{policies}</p>
      <p>{cancellation}</p>
    </details>
  )
}
export function BookingForm({
  initial,
  destination,
  plannedDays,
}: {
  initial: Trip
  destination?: string
  plannedDays?: number
}) {
  const { fleet, pickupLocations, user, whatsapp, currency } =
    useRentalPlatform()
  const rentable = fleet.filter((v) => v.available && v.modes.length)
  const getVehicle = (slug?: string) => fleet.find((v) => v.slug === slug)
  const [offer, setOffer] = useState('')
  const [waConsent, setWaConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<{ id: string; quote: Quote } | null>(
    null,
  )
  const [requestKey] = useState(() => crypto.randomUUID())
  const [trip, setTrip] = useState<Trip>(() => {
    const car =
      rentable.find((v) => v.slug === initial.vehicle) ??
      rentable.find((v) => v.modes.includes(initial.mode)) ??
      rentable[0]
    return {
      ...initial,
      vehicle: car?.slug ?? '',
      mode: car?.modes.includes(initial.mode)
        ? initial.mode
        : (car?.modes[0] ?? initial.mode),
    }
  })
  const [handover, setHandover] = useState<Handover>({
    delivery: 'pickup',
    address: '',
    differentReturn: false,
    returnPoint: '',
  })
  const [customer, setCustomer] = useState<Customer>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    message: destination
      ? `I would like to plan a trip to ${destination}.`
      : '',
  })
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dateNote, setDateNote] = useState('')
  const ready = useInteractive()
  const car = getVehicle(trip.vehicle)
  const days = daysBetween(trip.start, trip.end)
  const quoteKey =
    days && !receipt
      ? `quote?${new URLSearchParams({ ...trip, delivery: handover.delivery, offer }).toString()}`
      : null
  const {
    data: liveQuote,
    error: quoteError,
    mutate: refreshQuote,
  } = useSWR<Quote>(quoteKey, (key: string) => api<Quote>(key), {
    shouldRetryOnError: false,
  })
  const quote = receipt?.quote ?? liveQuote
  const rows = enquiryRows(trip, handover, customer, car, quote)
  const message =
    (receipt ? `Booking request ${receipt.id} · PENDING\n` : '') +
    enquiryText(rows)
  const attrs = (key: string) => ({
    id: `booking-${key}`,
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `booking-${key}-error` : undefined,
  })
  const clearError = (key: string) =>
    setErrors((old) => {
      const next = { ...old }
      delete next[key]
      return next
    })
  const update = (key: keyof Trip, value: string) => {
    const changedCar = key === 'vehicle' ? getVehicle(value) : undefined
    const suggestedEnd =
      key === 'start' && value && !trip.end && plannedDays
        ? addRentalDays(value, plannedDays)
        : ''
    const resetEnd = key === 'start' && trip.end && trip.end <= value
    setTrip((old) => ({
      ...old,
      [key]: value,
      ...(suggestedEnd ? { end: suggestedEnd } : {}),
      ...(resetEnd ? { end: '' } : {}),
      ...(changedCar && !changedCar.modes.includes(old.mode)
        ? { mode: changedCar.modes[0] }
        : {}),
    }))
    if (key === 'start' || key === 'end')
      setDateNote(
        resetEnd ? 'Pickup has changed. Please choose a new return date.' : '',
      )
    clearError(key)
  }
  const contact = (key: keyof Customer, value: string) => {
    setCustomer((old) => ({ ...old, [key]: value }))
    clearError(key)
  }
  const hand = <K extends keyof Handover>(key: K, value: Handover[K]) => {
    setHandover((old) => ({ ...old, [key]: value }))
    clearError(key)
  }
  const focus = (id: string) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      el?.focus({ preventScroll: true })
      const rect = el?.getBoundingClientRect()
      if (rect && (rect.top < 85 || rect.top > window.innerHeight * 0.65))
        el?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  const go = (target: number) => {
    if (target > step)
      for (let n = 0; n < target; n++) {
        const issues = validateStep(
          n,
          trip,
          handover,
          customer,
          undefined,
          fleet,
          pickupLocations,
        )
        const first = Object.keys(issues)[0]
        if (first) {
          setStep(n)
          setErrors(issues)
          focus(`booking-${first}`)
          return
        }
      }
    setErrors({})
    setStep(target)
    if (target === bookingSteps.length - 1 && target > reached)
      recordConversion('Rental enquiry prepared')
    setReached((old) => Math.max(old, target))
    focus(`rental-step-${target}`)
  }
  const advance = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || receipt) return
    if (step !== 5) {
      if (step === 3 && validDatesButUnavailable()) return
      go(step + 1)
      return
    }
    if (!quote) {
      setErrors({
        submit:
          quoteError?.message ||
          'Wait for the current estimate before submitting.',
      })
      return
    }
    setBusy(true)
    setErrors({})
    try {
      const saved = await api<{ id: string; quote: Quote }>('bookings', {
        ...trip,
        ...customer,
        delivery: handover.delivery,
        address: handover.address,
        returnPoint: handover.differentReturn ? handover.returnPoint : '',
        offer,
        waConsent,
        requestKey,
        expectedTotal: quote.total,
      })
      setReceipt(saved)
      go(6)
    } catch (e) {
      setErrors({ submit: (e as Error).message })
      void refreshQuote()
    } finally {
      setBusy(false)
    }
  }
  function validDatesButUnavailable() {
    return !!days && !!quoteError
  }
  if (!car)
    return (
      <section className="section">
        <div className="wrap empty-result">
          <h2>Let us find a car for your dates.</h2>
          <p>
            The catalog is not taking requests right now. Contact our Kathmandu
            team for alternatives.
          </p>
          <a className="action primary" href={whatsAppContact.href}>
            Contact U Drive <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    )

  const summaries = [
    car.name,
    modeLabel(trip.mode),
    trip.pickup,
    `${displayDate(trip.start)} – ${displayDate(trip.end)}`,
    customer.name.trim(),
    'Details reviewed',
  ]
  const panels: ReactNode[] = [
    <FieldGroup key="car" className="form-grid">
      <FormField
        id="booking-vehicle"
        label="Vehicle"
        required
        wide
        error={errors.vehicle}
      >
        <select
          {...attrs('vehicle')}
          required
          className="form-select"
          value={trip.vehicle}
          onChange={(e) => update('vehicle', e.target.value)}
        >
          {rentable.map((v) => (
            <option key={v.slug} value={v.slug}>
              {v.name} — {money(v.dailyRate, currency)} / day
            </option>
          ))}
        </select>
      </FormField>
      <div className="planner-car field-wide">
        <img src={car.image} alt="" width={84} height={58} />
        <div>
          <strong>{car.name}</strong>
          <p>
            {car.bodyType} · {car.seats} seats · {car.tier}
          </p>
        </div>
      </div>
    </FieldGroup>,
    <FieldSet className="mode-group" key="mode">
      <FieldLegend>Who will be driving?</FieldLegend>
      <div className="mode-choices">
        {rentalModes.map((m) => (
          <label key={m.value}>
            <input
              type="radio"
              name="rental-type"
              value={m.value}
              checked={trip.mode === m.value}
              disabled={!car.modes.includes(m.value)}
              onChange={() => update('mode', m.value)}
            />
            {m.value === 'self-drive' ? (
              <Wheel size={17} />
            ) : (
              <UserRound size={17} />
            )}
            <span>{m.label}</span>
          </label>
        ))}
      </div>
      <p className="step-help">
        {trip.mode === 'self-drive'
          ? 'Take the wheel yourself. The team will confirm licence and deposit requirements.'
          : car.driver_rate
            ? `Chauffeur-inclusive rate: ${money(car.driver_rate, currency)} per day.`
            : 'A chauffeur is requested. The driver supplement will be confirmed by the desk.'}
      </p>
    </FieldSet>,
    <FieldGroup key="location" className="form-grid">
      <FormField id="booking-pickup" label="Pickup location" required>
        <select
          {...attrs('pickup')}
          required
          className="form-select"
          value={trip.pickup}
          onChange={(e) => update('pickup', e.target.value)}
        >
          {pickupLocations.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </FormField>
      <FormField id="booking-handover" label="Handover">
        <select
          id="booking-handover"
          className="form-select"
          value={handover.delivery}
          onChange={(e) =>
            hand('delivery', e.target.value as Handover['delivery'])
          }
        >
          <option value="pickup">Collect at agreed point</option>
          <option value="delivery">Request delivery</option>
        </select>
      </FormField>
      {needsAddress(trip, handover) && (
        <FormField
          id="booking-address"
          label="Address or landmark"
          required
          wide
          error={errors.address}
        >
          <Input
            {...attrs('address')}
            required
            autoComplete="off"
            placeholder="Hotel, street, or nearby landmark"
            maxLength={240}
            value={handover.address}
            onChange={(e) => hand('address', e.target.value)}
          />
        </FormField>
      )}
      <label className="account-check field-wide return-check">
        <input
          type="checkbox"
          checked={handover.differentReturn}
          onChange={(e) => hand('differentReturn', e.target.checked)}
        />
        Return the car to a different location
      </label>
      {handover.differentReturn && (
        <FormField
          id="booking-returnPoint"
          label="Return location"
          required
          wide
          error={errors.returnPoint}
        >
          <Input
            {...attrs('returnPoint')}
            required
            maxLength={240}
            placeholder="City or meeting point"
            value={handover.returnPoint}
            onChange={(e) => hand('returnPoint', e.target.value)}
          />
        </FormField>
      )}
      <p className="step-help field-wide">
        Pickup and delivery across Nepal are by arrangement. We confirm access
        and any one-way or delivery fee before booking.
      </p>
    </FieldGroup>,
    <FieldGroup key="dates" className="form-grid">
      {(['start', 'end'] as const).map((key) => (
        <FormField
          key={key}
          id={`booking-${key}`}
          label={key === 'start' ? 'Pickup date' : 'Return date'}
          error={errors[key]}
          required
        >
          <DatePicker
            id={`booking-${key}`}
            label={key === 'start' ? 'Pickup date' : 'Return date'}
            min={
              key === 'start'
                ? todayInNepal()
                : nextDay(trip.start || todayInNepal())
            }
            value={trip[key]}
            invalid={!!errors[key]}
            onChange={(value) => update(key, value)}
          />
        </FormField>
      ))}
      <p className="step-help field-wide" aria-live="polite">
        {dateNote ||
          (days
            ? (quoteError?.message ??
              (quote
                ? `${days} ${days === 1 ? 'day' : 'days'} at ${money(quote.rate, quote.currency)} per day · ${money(quote.total, quote.currency)} estimated total.`
                : 'Checking price and availability…'))
            : plannedDays
              ? `For your ${plannedDays}-day plan, choose pickup and we will suggest a return date. You can change it.`
              : 'The rental is counted in days between pickup and return. Minimum one day.')}
      </p>
    </FieldGroup>,
    <FieldGroup key="customer" className="form-grid">
      <FormField
        id="booking-name"
        label="Full name"
        required
        wide
        error={errors.name}
      >
        <Input
          {...attrs('name')}
          required
          autoComplete="name"
          placeholder="Your full name"
          maxLength={100}
          value={customer.name}
          onChange={(e) => contact('name', e.target.value)}
        />
      </FormField>
      <FormField
        id="booking-phone"
        label="Phone number"
        required
        error={errors.phone}
      >
        <Input
          {...attrs('phone')}
          required
          type="tel"
          autoComplete="tel"
          placeholder="Include country code"
          maxLength={25}
          value={customer.phone}
          onChange={(e) => contact('phone', e.target.value)}
        />
      </FormField>
      <FormField
        id="booking-email"
        label="Email address"
        required
        error={errors.email}
      >
        <Input
          {...attrs('email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={254}
          value={customer.email}
          onChange={(e) => contact('email', e.target.value)}
        />
      </FormField>
      <FormField id="booking-offer" label="Offer code" optional>
        <Input
          id="booking-offer"
          maxLength={30}
          value={offer}
          onChange={(e) => setOffer(e.target.value.toUpperCase())}
        />
      </FormField>
      <label className="account-check field-wide">
        <input
          type="checkbox"
          checked={waConsent}
          onChange={(e) => setWaConsent(e.target.checked)}
        />
        Send my booking updates to my phone on WhatsApp.
      </label>
      <FormField id="booking-note" label="Trip notes" optional wide>
        <Textarea
          id="booking-note"
          value={customer.message}
          maxLength={600}
          placeholder="Your route, luggage, or questions for the team"
          onChange={(e) => contact('message', e.target.value)}
        />
      </FormField>
    </FieldGroup>,
    <div key="review">
      <RentalPolicyNote />
      <p className="step-help">
        Check the details below. Use the edit controls above to change a choice
        before sharing it.
      </p>
      <dl className="review-details">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>,
    <div key="handoff" className="rental-handoff">
      <h3>Your booking request is in.</h3>
      <p>
        <strong>{receipt?.id}</strong> · Pending confirmation
      </p>
      <p>
        The desk has your request. Keep this reference or continue the
        conversation on WhatsApp.
      </p>
      <a
        className="text-link"
        href={user ? '/account?tab=bookings' : '/create-account'}
      >
        {user ? 'View my bookings' : 'Create an account to track this request'}
      </a>
      <a
        className="action primary"
        href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="/images/whatsapp.svg" alt="" width={18} height={18} />
        Open WhatsApp <ArrowUpRight size={15} />
      </a>
      <p className="handoff-number">U Drive · {whatsapp}</p>
      <PreviewNote>
        Your dates are held for review. No payment has been taken. A confirmed
        rental requires approval from U Drive.
      </PreviewNote>
      <button
        className="text-link"
        type="button"
        onClick={() => downloadText('u-drive-rental-enquiry.txt', message)}
      >
        <Download size={15} />
        Download a copy
      </button>
    </div>,
  ]
  return (
    <section className="section booking-section">
      <div className="wrap booking-layout">
        <form
          className="booking-form rental-planner"
          onSubmit={advance}
          method="post"
          noValidate
          data-ready={ready}
          data-step={step + 1}
        >
          <div className="planner-progress">
            <span>Your rental planner</span>
            <small aria-live="polite">
              Step {step + 1} of {bookingSteps.length}
            </small>
          </div>
          <progress
            className="planner-progress-bar"
            value={step + 1}
            max={bookingSteps.length}
            aria-label="Rental planning progress"
          />
          <p className="planner-required">
            <span aria-hidden="true">*</span> Required fields. No account or
            payment needed.
          </p>
          {bookingSteps.map((title, i) => (
            <section
              className="planner-step"
              key={title}
              data-current={i === step}
              data-complete={i < reached && i !== step}
            >
              <h2>
                <button
                  type="button"
                  id={`rental-step-${i}`}
                  onClick={() => go(i)}
                  disabled={busy || !!receipt || i > reached}
                  aria-expanded={i === step}
                  aria-current={i === step ? 'step' : undefined}
                  aria-controls={`step-body-${i}`}
                >
                  <span className="planner-number">
                    {i < reached && i !== step ? (
                      <Check size={15} />
                    ) : (
                      String(i + 1).padStart(2, '0')
                    )}
                  </span>
                  <span>
                    {title}
                    {i < reached && i !== step && <small>{summaries[i]}</small>}
                  </span>
                  {i < reached && i !== step && <Pencil size={14} />}
                </button>
              </h2>
              <div id={`step-body-${i}`} hidden={i !== step}>
                {i === step && (
                  <div className="planner-step-body">
                    {panels[i]}
                    {(errors.submit || (i === 5 && quoteError)) && (
                      <p role="alert" className="form-error">
                        {errors.submit || quoteError.message}
                      </p>
                    )}
                    {i < 6 && (
                      <div className="planner-actions">
                        {i > 0 && (
                          <button
                            className="text-link"
                            type="button"
                            onClick={() => go(i - 1)}
                          >
                            <ArrowLeft size={14} />
                            Back
                          </button>
                        )}
                        <button
                          className="action primary"
                          type="submit"
                          disabled={
                            !ready ||
                            busy ||
                            (i === 5 && (!quote || !!quoteError))
                          }
                        >
                          {i === 4
                            ? 'Review rental'
                            : i === 5
                              ? busy
                                ? 'Submitting…'
                                : 'Submit booking request'
                              : 'Continue'}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          ))}
        </form>
        <BookingSummary
          trip={trip}
          vehicle={car}
          quote={quote}
          unavailable={!!quoteError}
          delivery={handover.delivery}
          returnPoint={handover.differentReturn ? handover.returnPoint : ''}
        />
      </div>
    </section>
  )
}
