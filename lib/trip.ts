import {
  fleet,
  pickupLocations,
  type RentalMode,
  type Vehicle,
} from './rental-data'

export type Trip = {
  vehicle: string
  mode: RentalMode
  pickup: string
  start: string
  end: string
}
export type Query = Record<string, string | string[] | undefined>
export const todayInNepal = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
const DAY = 86400000
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return (
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
  )
}
export function daysBetween(start: string, end: string) {
  if (!validDate(start) || !validDate(end)) return 0
  return Math.max(
    0,
    Math.round(
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY,
    ),
  )
}
export const addRentalDays = (value: string, days: number) =>
  new Date(Date.parse(`${value}T00:00:00Z`) + DAY * days)
    .toISOString()
    .slice(0, 10)
export const nextDay = (value: string) => addRentalDays(value, 1)
export const displayDate = (value: string) =>
  validDate(value)
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${value}T00:00:00Z`))
    : 'Select date'
export function readTrip(
  query: Query,
  vehicles: Vehicle[] = fleet,
  locations = pickupLocations,
): Trip {
  const read = (key: string) =>
    typeof query[key] === 'string' ? (query[key] as string) : ''
  const start = read('start')
  const end = read('end')
  return {
    vehicle: vehicles.find((v) => v.slug === read('vehicle'))?.slug ?? '',
    mode: read('mode') === 'with-driver' ? 'with-driver' : 'self-drive',
    pickup: locations.includes(read('pickup')) ? read('pickup') : 'Kathmandu',
    start: validDate(start) && start >= todayInNepal() ? start : '',
    end:
      validDate(start) &&
      start >= todayInNepal() &&
      validDate(end) &&
      end > start
        ? end
        : '',
  }
}
export function tripHref(
  path: string,
  trip: Partial<Trip> & { duration?: string },
) {
  const params = new URLSearchParams()
  Object.entries(trip).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  return `${path}${params.size ? `?${params}` : ''}`
}
export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
