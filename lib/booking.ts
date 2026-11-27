import { getVehicle, modeLabel, money, pickupLocations } from './rental-data'
import {
  daysBetween,
  displayDate,
  todayInNepal,
  validDate,
  type Trip,
} from './trip'

export const bookingSteps = [
  'Choose vehicle',
  'Choose rental type',
  'Choose location',
  'Choose dates',
  'Customer details',
  'Review rental',
  'Contact U Drive',
] as const
export type Customer = {
  name: string
  phone: string
  email: string
  message: string
}
export type Handover = {
  delivery: 'pickup' | 'delivery'
  address: string
  differentReturn: boolean
  returnPoint: string
}
export const needsAddress = (trip: Trip, handover: Handover) =>
  handover.delivery === 'delivery' || trip.pickup === 'Other location in Nepal'
export function validateStep(
  step: number,
  trip: Trip,
  handover: Handover,
  customer: Customer,
  today = todayInNepal(),
) {
  const errors: Record<string, string> = {}
  const car = getVehicle(trip.vehicle)
  if (step === 0 && (!car || car.availability === 'Unavailable'))
    errors.vehicle = 'Choose a vehicle that is open for rental enquiries.'
  if (step === 1 && !car?.modes.includes(trip.mode))
    errors.mode = 'Choose a rental type offered for this car.'
  if (step === 2) {
    if (!pickupLocations.includes(trip.pickup))
      errors.pickup = 'Choose your pickup location.'
    if (needsAddress(trip, handover) && handover.address.trim().length < 4)
      errors.address =
        'Add a street, hotel, or nearby landmark so we can arrange the handover.'
    if (handover.differentReturn && handover.returnPoint.trim().length < 3)
      errors.returnPoint = 'Tell us where you would like to return the car.'
  }
  if (step === 3) {
    if (!validDate(trip.start) || trip.start < today)
      errors.start = 'Choose a pickup date from today onward (Nepal time).'
    if (!validDate(trip.end) || daysBetween(trip.start, trip.end) < 1)
      errors.end = 'Choose a return date at least one day after pickup.'
  }
  if (step === 4) {
    if (customer.name.trim().length < 2)
      errors.name = 'Please enter the name we should use for your enquiry.'
    if (
      !/^\+?[\d\s()-]+$/.test(customer.phone.trim()) ||
      !/^\d{7,15}$/.test(customer.phone.replace(/\D/g, ''))
    )
      errors.phone =
        'Enter a phone number with 7–15 digits. A country code is welcome.'
    if (
      customer.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
    )
      errors.email =
        'Use an email like name@example.com, or leave this optional field blank.'
  }
  return errors
}
export function enquiryRows(
  trip: Trip,
  handover: Handover,
  customer: Customer,
): [string, string][] {
  const car = getVehicle(trip.vehicle)
  if (!car) return []
  const days = daysBetween(trip.start, trip.end)
  return [
    ['Vehicle', car.name],
    ['Rental type', modeLabel(trip.mode)],
    ['Pickup location', trip.pickup],
    [
      'Handover',
      handover.delivery === 'delivery'
        ? 'Delivery requested'
        : 'Collect at agreed point',
    ],
    ...(needsAddress(trip, handover)
      ? [['Meeting point', handover.address.trim()] as [string, string]]
      : []),
    [
      'Return location',
      handover.differentReturn ? handover.returnPoint.trim() : 'Same as pickup',
    ],
    ['Pickup date', displayDate(trip.start)],
    ['Return date', displayDate(trip.end)],
    ['Rental duration', `${days} ${days === 1 ? 'day' : 'days'}`],
    ['Daily rate', money(car.dailyRate)],
    ['Estimated vehicle total', money(days * car.dailyRate)],
    ...(trip.mode === 'with-driver'
      ? [
          ['Driver service', 'Requested · fee to be confirmed'] as [
            string,
            string,
          ],
        ]
      : []),
    ['Name', customer.name.trim()],
    ['Phone', customer.phone.trim()],
    ...(customer.email.trim()
      ? [['Email', customer.email.trim()] as [string, string]]
      : []),
    ...(customer.message.trim()
      ? [['Trip notes', customer.message.trim()] as [string, string]]
      : []),
  ]
}
export function enquiryText(rows: [string, string][]) {
  return [
    'Hello U Drive, I would like to enquire about this rental:',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Please confirm availability, the full price including any extras, and handover details.',
  ].join('\n')
}
