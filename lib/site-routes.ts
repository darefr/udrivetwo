import { destinations, fleet } from './rental-data'

export const siteOrigin = 'https://u-drive1.vercel.app'
export const sectionSlugs = [
  'about',
  'rental-options',
  'self-drive',
  'with-driver',
  'how-it-works',
  'reviews',
  'faq',
  'privacy',
  'terms',
] as const
export type SectionSlug = (typeof sectionSlugs)[number]
export const accountPaths = [
  '/sign-in',
  '/create-account',
  '/forgot-password',
] as const
export const indexablePaths = [
  '/',
  '/fleet',
  '/destinations',
  '/booking',
  '/contact',
  ...sectionSlugs.map((slug) => `/${slug}`),
  ...fleet.map(({ slug }) => `/fleet/${slug}`),
  ...destinations.map(({ slug }) => `/destinations/${slug}`),
]
export const isSectionSlug = (value: string): value is SectionSlug =>
  sectionSlugs.some((slug) => slug === value)
