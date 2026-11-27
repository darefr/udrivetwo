import { z } from 'zod'
import { validDate } from '../trip'
export const sections = [
  'overview',
  'bookings',
  'vehicles',
  'customers',
  'availability',
  'pricing',
  'payments',
  'reviews',
  'locations',
  'offers',
  'notifications',
  'messages',
  'reports',
  'settings',
  'users',
  'activity',
] as const
export type Section = (typeof sections)[number]
export const roles = [
  'CUSTOMER',
  'SUPER_ADMIN',
  'ADMIN',
  'BOOKING_MANAGER',
  'FLEET_MANAGER',
  'SUPPORT_STAFF',
] as const
export type Role = (typeof roles)[number]
export const rights: Record<Role, readonly Section[]> = {
  CUSTOMER: [],
  SUPER_ADMIN: sections,
  ADMIN: sections.filter((s) => s !== 'users'),
  BOOKING_MANAGER: [
    'overview',
    'bookings',
    'customers',
    'availability',
    'notifications',
    'messages',
  ],
  FLEET_MANAGER: [
    'overview',
    'vehicles',
    'availability',
    'pricing',
    'locations',
    'offers',
    'notifications',
  ],
  SUPPORT_STAFF: [
    'overview',
    'customers',
    'reviews',
    'notifications',
    'messages',
  ],
}
export type Principal = {
  id: string
  name: string
  email: string
  email_verified: boolean
  role: Role
  customer_id: string
  phone: string
}
export const statuses = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'ACTIVE',
  'COMPLETED',
] as const
export type Status = (typeof statuses)[number]
export const transitions: Record<Status, Status[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}
export class Problem extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export function insist(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new Problem(status, message)
}
export const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (v) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),
      'Unsupported control character',
    )
export const email = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase())
export const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128)
export const phone = text(7, 25)
  .regex(/^\+?[\d ()-]+$/)
  .refine(
    (v) => /^\d{7,15}$/.test(v.replace(/\D/g, '')),
    'Use a valid phone number.',
  )
export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100)
export const date = z.string().refine(validDate, 'Use a valid calendar date.')
export const mode = z.enum(['self-drive', 'with-driver'])
export const quoteInput = z.object({
  vehicle: slug,
  mode,
  pickup: text(1, 100),
  start: date,
  end: date,
  delivery: z.enum(['pickup', 'delivery']).default('pickup'),
  offer: z
    .string()
    .trim()
    .max(30)
    .transform((v) => v.toUpperCase())
    .default(''),
})
export const bookingInput = quoteInput
  .extend({
    name: text(2, 100),
    phone,
    email,
    address: text(0, 240).default(''),
    returnPoint: text(0, 240).default(''),
    message: text(0, 600).default(''),
    waConsent: z.boolean().default(false),
    requestKey: z.uuid(),
    expectedTotal: z.number().int().nonnegative().optional(),
  })
  .strict()
export type Quote = {
  days: number
  rate: number
  subtotal: number
  delivery: number
  additional: number
  discount: number
  total: number
  currency: string
  driverQuoted: boolean
}
export const safeImage = z
  .string()
  .max(220)
  .regex(
    /^\/(?:images\/[a-zA-Z0-9_-]+\.(?:webp|avif|png|jpg)|api\/media\/[a-f0-9]{64})$/,
  )
const rate = z.coerce.number().int().min(1).max(1000000)
export const vehicleInput = z
  .object({
    slug,
    name: text(2, 100),
    brand: text(1, 60),
    model: text(1, 80),
    location: slug,
    daily_rate: rate,
    self_rate: rate.nullable(),
    driver_rate: rate.nullable(),
    available: z.boolean(),
    active: z.boolean(),
    featured: z.boolean(),
    popular: z.boolean(),
    sort_order: z.coerce.number().int().min(0).max(10000),
    bodyType: z.enum(['SUV', 'Sedan', 'Hatchback']),
    tier: z.enum(['Budget', 'Standard', 'Premium']),
    seats: z.coerce.number().int().min(1).max(50),
    doors: z.coerce.number().int().min(1).max(8),
    transmission: z.enum(['Automatic', 'Manual', 'Confirm variant']),
    fuel: z.enum(['Electric', 'Petrol', 'Diesel', 'Hybrid', 'Confirm variant']),
    overview: text(5, 4000),
    features: z.array(text(1, 100)).max(30),
    modes: z.array(mode).min(1).max(2),
    gallery: z
      .array(z.object({ image: safeImage, label: text(1, 120) }))
      .min(1)
      .max(16),
  })
  .strict()
export const settingsInput = z
  .object({
    company: text(2, 120),
    email: z.union([email, z.literal('')]),
    whatsapp: phone,
    hours: text(1, 300),
    currency: z.string().regex(/^[A-Z]{3}$/),
    deliveryFee: z.coerce.number().int().min(0).max(100000),
    extraFee: z.coerce.number().int().min(0).max(100000),
    maxDays: z.coerce.number().int().min(1).max(365),
    holdHours: z.coerce.number().int().min(1).max(336),
    policies: text(1, 3000),
    cancellation: text(1, 3000),
    emailEnabled: z.boolean(),
    whatsappEnabled: z.boolean(),
    assistantEnabled: z.boolean(),
  })
  .strict()
export function can(user: Principal | null, area: Section) {
  return !!user && rights[user.role].includes(area)
}
export function permit(
  user: Principal | null,
  area: Section,
): asserts user is Principal {
  insist(user, 401, 'Sign in to continue.')
  insist(
    can(user, area),
    403,
    'Your account does not have permission for this operation.',
  )
}
