import type { Metadata } from 'next'
import { business, money, type Destination, type Vehicle } from './rental-data'
import { accountPaths, siteOrigin } from './site-routes'

const pages = {
  '/': [
    'Car Rental in Kathmandu, Nepal',
    'Compare self-drive and chauffeur car rentals in Kathmandu. Explore vehicles, daily rates and routes across Nepal, then request a quote from the U Drive team.',
  ],
  '/fleet': [
    'Kathmandu Rental Cars & Daily Rates',
    'Compare rental cars in Kathmandu by seating, fuel type and daily price. View photos, check self-drive or chauffeur options and plan a rental with U Drive.',
  ],
  '/booking': [
    'Request a Car Rental Quote in Kathmandu',
    'Choose a rental car, set your dates and calculate a base price in Nepalese rupees. Review your pickup details and request a quote from U Drive on WhatsApp.',
  ],
  '/contact': [
    'Contact the Kathmandu Car Rental Desk',
    'Ask U Drive about vehicle availability, delivery, rental documents or a planned route in Nepal. Review your enquiry before sharing it with our Kathmandu desk.',
  ],
  '/destinations': [
    'Nepal Driving Destinations & Road Trips',
    'Explore eight Nepal driving destinations, from Pokhara and Chitwan to Bandipur and Lower Mustang. Find route notes, local stops and rental planning advice.',
  ],
  '/about': [
    'About U Drive Car Rental Kathmandu',
    'Meet the Kathmandu rental desk behind U Drive. Learn how we compare cars, explain daily prices and arrange self-drive or chauffeur journeys throughout Nepal.',
  ],
  '/self-drive': [
    'Self-Drive Car Rental in Kathmandu',
    'Plan a self-drive car rental from Kathmandu. Compare daily rates, check licence and deposit requirements, and choose a vehicle that suits your route in Nepal.',
  ],
  '/with-driver': [
    'Car Rental With a Driver in Kathmandu',
    'Request a chauffeur-driven car in Kathmandu for a city visit or a longer Nepal itinerary. Compare vehicles and confirm driver arrangements before you book.',
  ],
  '/rental-options': [
    'Self-Drive or Chauffeur? Compare Rental Options',
    'Compare self-drive and chauffeur car rentals in Nepal. See who drives, what the daily rate covers and which details to confirm with the Kathmandu rental desk.',
  ],
  '/how-it-works': [
    'How to Rent a Car in Kathmandu',
    'Follow six steps to rent a car with U Drive: compare vehicles, choose dates, review your estimate and confirm pickup or delivery with the Kathmandu team.',
  ],
  '/reviews': [
    'Traveller Reviews & Rental Feedback',
    'Browse clearly labelled sample travel stories for self-drive and chauffeur trips in Nepal. Find out how to share feedback about your own rental with U Drive.',
  ],
  '/faq': [
    'Kathmandu Car Rental FAQs',
    'Find answers about rental rates, driver fees, required documents, deposits and delivery. Learn how to request, change or confirm a car rental in Kathmandu.',
  ],
  '/privacy': [
    'Privacy Policy & Cookie Choices',
    'See how U Drive handles rental enquiries, WhatsApp messages, tab-based chat and optional analytics. Manage cookie choices or contact us about your information.',
  ],
  '/terms': [
    'Website Terms & Rental Conditions',
    'Read the rules for using the U Drive website, including rental estimates, availability, content ownership, liability and the laws that apply to website use.',
  ],
  '/sign-in': [
    'Traveller Sign-In',
    'Sign in to your U Drive account to view upcoming rentals, check booking status, manage contact details and message the Kathmandu rental desk about your trip.',
  ],
  '/create-account': [
    'Create a Traveller Account',
    'Create a U Drive traveller account to track car rental requests, save contact details, receive booking updates and reach the Kathmandu rental team for support.',
  ],
  '/forgot-password': [
    'Recover Your Traveller Account',
    'Request a single-use password reset link for your U Drive account. Restore access to bookings, profile details and messages from the Kathmandu rental desk.',
  ],
} as const

const routeDescriptions: Record<string, string> = {
  pokhara:
    'Plan a Pokhara road trip from Kathmandu with stops at Phewa Lake, the Old Bazaar and Sarangkot. Compare rental options and discuss your route with U Drive.',
  kathmandu:
    'Explore Kathmandu by rental car, from Durbar Square to Boudhanath and Swayambhunath. Find nearby drop-off ideas and plan a valley itinerary with U Drive.',
  nagarkot:
    'Plan a rental drive to Nagarkot for ridge roads, hill villages and Himalayan viewpoints. Check weather, pickup timing and vehicle suitability with U Drive.',
  chitwan:
    'Plan a road trip to Chitwan for riverside stays, Sauraha and the Terai lowlands. Compare car rentals and confirm the road journey separately from park visits.',
  lumbini:
    'Drive to Lumbini for the Sacred Garden, Maya Devi Temple and monastic courtyards. Plan a practical drop-off and arrange your Nepal car rental with U Drive.',
  bandipur:
    'Plan a Bandipur road trip from Kathmandu. Explore the hilltop bazaar and Tundikhel viewpoint, and agree on a drop-off outside the pedestrian lanes with U Drive.',
  dhulikhel:
    'Visit Dhulikhel by rental car for old-town courtyards, terraced hills and ridge walks. Plan the last accessible stop and your return to Kathmandu with U Drive.',
  mustang:
    'Plan a Lower Mustang itinerary with stops in Marpha, Jomsom and Kagbeni. Ask about road conditions, permits and vehicle clearance before choosing a rental car.',
}

export const shareImage = {
  url: `${siteOrigin}/images/u-drive-share.jpg`,
  width: 1200,
  height: 630,
  type: 'image/jpeg',
  alt: 'U Drive Car Rental Kathmandu: a silver Deepal S05 on a Nepal mountain road.',
}

function metadataFor(
  path: string,
  title: string,
  description: string,
  index = true,
): Metadata {
  const url = new URL(path, siteOrigin).href
  const fullTitle = `${title} | U Drive`
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    robots: {
      index: index && process.env.VERCEL_ENV !== 'preview',
      follow: true,
    },
    openGraph: {
      type: 'website',
      locale: 'en_NP',
      siteName: business.name,
      url,
      title: fullTitle,
      description,
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [{ url: shareImage.url, alt: shareImage.alt }],
    },
  }
}
export function pageMetadata(path: keyof typeof pages) {
  const [title, description] = pages[path]
  return metadataFor(
    path,
    title,
    description,
    !accountPaths.some((p) => p === path),
  )
}
export function vehicleMetadata(car: Vehicle) {
  return metadataFor(
    `/fleet/${car.slug}`,
    `${car.name} Rental in Kathmandu`,
    `Rent the ${car.name} in Kathmandu from ${money(car.dailyRate, car.currency)} per day. Explore photos, seating and rental options, then confirm your dates and pickup point with U Drive.`,
  )
}
export function destinationMetadata(destination: Destination) {
  return metadataFor(
    `/destinations/${destination.slug}`,
    `${destination.name} Road Trip & Car Rental Guide`,
    routeDescriptions[destination.slug] ?? destination.description,
  )
}
export const missingMetadata: Metadata = {
  title: { absolute: 'Page Not Found | U Drive Kathmandu' },
  description:
    'This page is not on the U Drive map. Return to the Kathmandu rental fleet, browse our Nepal travel guides or start a new request with the rental planner.',
  robots: { index: false, follow: true },
}
