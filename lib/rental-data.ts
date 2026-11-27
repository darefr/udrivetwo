export const business = {
  name: 'U Drive Car Rental Kathmandu',
  shortName: 'U Drive',
  whatsappNumber: '+977 980-0899505',
  base: 'Kathmandu, Nepal',
  coverage: 'Kathmandu and across Nepal',
  description:
    'Self-drive and chauffeur-driven car rentals from Kathmandu, for journeys across Nepal.',
} as const

export function whatsappHref(
  message = 'I want to know more about your cars and rental options.',
) {
  return `https://wa.me/${business.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
export const whatsAppContact = {
  href: whatsappHref(),
  direct: true,
  label: `Chat with U Drive on WhatsApp at ${business.whatsappNumber}`,
}

export type Vehicle = {
  slug: string
  name: string
  dailyRate: number
  currency?: string
  image: string
  gallery: { image: string; label: string }[]
  showcase?: {
    desktop: string
    mobile: string
    avif?: { desktop: string; mobile: string }
  }
  overview: string
  bodyType: 'SUV' | 'Sedan' | 'Hatchback'
  seats: number
  transmission: 'Automatic' | 'Manual' | 'Confirm variant'
  fuel: 'Electric' | 'Petrol' | 'Hybrid' | 'Diesel' | 'Confirm variant'
  tier: 'Budget' | 'Standard' | 'Premium'
  availability: 'On request' | 'Unavailable'
  modes: RentalMode[]
  features: string[]
}

type VehicleDetails = Pick<
  Vehicle,
  'bodyType' | 'seats' | 'transmission' | 'fuel' | 'tier' | 'features'
> &
  Partial<Pick<Vehicle, 'availability' | 'modes' | 'gallery' | 'showcase'>>
const vehicle = (
  slug: string,
  name: string,
  dailyRate: number,
  overview: string,
  details: VehicleDetails,
): Vehicle => ({
  slug,
  name,
  dailyRate,
  overview,
  image: `/images/${slug}.webp`,
  gallery: [
    { image: `/images/${slug}.webp`, label: 'Front three-quarter view' },
    { image: `/images/${slug}-rear.webp`, label: 'Rear three-quarter view' },
  ],
  availability: 'On request',
  modes: ['self-drive', 'with-driver'],
  ...details,
})

const heroPhotos = (slug: string) => ({
  desktop: `/images/showcase-${slug}.webp`,
  mobile: `/images/showcase-${slug}-mobile.webp`,
  avif: {
    desktop: `/images/showcase-${slug}.avif`,
    mobile: `/images/showcase-${slug}-mobile.avif`,
  },
})

export const fleet: Vehicle[] = [
  vehicle(
    'deepal-s05',
    'Deepal S05',
    10000,
    'A roomy electric SUV for a longer itinerary. Choose the Deepal for relaxed valley drives and family trips, and plan your charging stops with our Kathmandu team.',
    {
      bodyType: 'SUV',
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Electric',
      tier: 'Premium',
      features: ['Five-seat cabin', 'Electric drive', 'SUV luggage space'],
      showcase: heroPhotos('deepal-s05'),
    },
  ),
  vehicle(
    'byd-atto-3',
    'BYD Atto 3',
    9000,
    'An electric crossover with room to bring the family. The Atto 3 pairs a five-seat cabin with easy automatic driving for a city break or a planned lakeside escape.',
    {
      bodyType: 'SUV',
      seats: 5,
      transmission: 'Automatic',
      fuel: 'Electric',
      tier: 'Premium',
      features: [
        'Five-seat cabin',
        'Automatic drive',
        'Family-friendly crossover',
      ],
      showcase: heroPhotos('byd-atto-3'),
    },
  ),
  vehicle(
    'tata-nexon',
    'Tata Nexon',
    7500,
    'A compact SUV for the valley and beyond. A useful middle ground between a city hatchback and a larger SUV; ask the team to confirm the powertrain and gearbox for your dates.',
    {
      bodyType: 'SUV',
      seats: 5,
      transmission: 'Confirm variant',
      fuel: 'Confirm variant',
      tier: 'Standard',
      features: [
        'Compact SUV body',
        'Five-seat cabin',
        'Rear luggage compartment',
      ],
      showcase: heroPhotos('tata-nexon'),
    },
  ),
  vehicle(
    'byd-atto-1',
    'BYD Atto 1',
    6500,
    'A compact electric hatchback for Kathmandu streets and shorter getaways. Its small footprint and accessible daily rate make it a practical choice for a couple or a solo traveller.',
    {
      bodyType: 'Hatchback',
      seats: 4,
      transmission: 'Automatic',
      fuel: 'Electric',
      tier: 'Budget',
      features: ['Compact city footprint', 'Four-seat cabin', 'Electric drive'],
      showcase: heroPhotos('byd-atto-1'),
    },
  ),
]

export const featuredVehicles = fleet.filter(
  (car): car is Vehicle & { showcase: NonNullable<Vehicle['showcase']> } =>
    Boolean(car.showcase) && car.availability !== 'Unavailable',
)
export const fleetCategories = [
  'All',
  'Electric',
  'Petrol',
  'SUV',
  'Sedan',
  'Budget',
  'Premium',
] as const
export type FleetCategory = (typeof fleetCategories)[number]
export const matchesCategory = (car: Vehicle, category: FleetCategory) =>
  category === 'All' ||
  category === car.bodyType ||
  category === car.fuel ||
  category === car.tier

export const rentalModes = [
  { value: 'self-drive', label: 'Self Drive' },
  { value: 'with-driver', label: 'With Driver' },
] as const
export type RentalMode = (typeof rentalModes)[number]['value']
export const money = (value: number, currency = 'NPR') =>
  `${currency} ${new Intl.NumberFormat('en-US').format(value)}`
export const getVehicle = (slug?: string) => fleet.find((v) => v.slug === slug)
export const modeLabel = (mode: string) =>
  rentalModes.find((m) => m.value === mode)?.label ?? 'Self Drive'
export const pickupLocations = [
  'Kathmandu',
  'Pokhara',
  'Chitwan',
  'Nagarkot',
  'Lumbini',
  'Bandipur',
  'Dhulikhel',
  'Mustang',
  'Other location in Nepal',
]

export type Destination = {
  slug: string
  name: string
  category: string
  tagline: string
  description: string
  stops: string[]
  advice: string
  image: string
  imageAlt: string
}
export const destinations: Destination[] = [
  {
    slug: 'pokhara',
    name: 'Pokhara',
    category: 'Lakes & hills',
    tagline: 'Lakeside roads & mountain views',
    description:
      'Take a slower turn by Phewa Lake. Pokhara pairs a lakeside town with green hills and wide views towards the Annapurna range.',
    stops: ['Phewa Lakeside', 'Old Bazaar', 'Sarangkot viewpoint'],
    advice:
      'Allow flexibility for weather and road conditions on the journey from Kathmandu. Confirm your route and stops before departure.',
    image: '/images/drive-pokhara.webp',
    imageAlt:
      'A blue crossover follows a bend beside Phewa Lake, with wooded hills across the water.',
  },
  {
    slug: 'kathmandu',
    name: 'Kathmandu',
    category: 'City & culture',
    tagline: 'Courtyards, culture & city drives',
    description:
      'Start with a city drive through the valley. Choose a compact car for your Kathmandu itinerary, or let a driver handle the streets while you plan the stops.',
    stops: ['Kathmandu Durbar Square', 'Boudhanath', 'Swayambhunath'],
    advice:
      'Many heritage squares are best explored on foot. Plan a nearby drop-off or parking point with the team.',
    image: '/images/drive-kathmandu.webp',
    imageAlt:
      'A silver crossover passes brick shopfronts and pedestrians on a Kathmandu street.',
  },
  {
    slug: 'nagarkot',
    name: 'Nagarkot',
    category: 'Lakes & hills',
    tagline: 'Ridge roads & Himalayan horizons',
    description:
      'Trade the city streets for pine-lined bends and open ridgelines. On a clear morning, Nagarkot looks out over layers of foothills towards the Himalayas.',
    stops: ['Nagarkot ridge', 'View tower area', 'Village walking trails'],
    advice:
      'Mountain views depend on the weather. Discuss the hill road and the best handover time for your itinerary.',
    image: '/images/drive-nagarkot.webp',
    imageAlt:
      'A red SUV rounds a pine-lined bend on the hillside road near Nagarkot.',
  },
  {
    slug: 'chitwan',
    name: 'Chitwan',
    category: 'Nature',
    tagline: 'Riverbanks & the quiet lowlands',
    description:
      'Follow the road into the green Terai lowlands. Chitwan is a change of pace, with riverside stays, open landscapes, and forest at the edge of town.',
    stops: ['Sauraha', 'Rapti riverbank', 'Tharu village walks'],
    advice:
      'Your rental covers the road journey. Park entry, guides, and wildlife activities are separate arrangements.',
    image: '/images/drive-chitwan.webp',
    imageAlt:
      'A light-coloured hatchback on a narrow road through tall green forest in Chitwan.',
  },
  {
    slug: 'lumbini',
    name: 'Lumbini',
    category: 'City & culture',
    tagline: 'Sacred gardens & quiet Terai roads',
    description:
      'Leave the car at the garden entrance and take Lumbini slowly. The Sacred Garden, monastic courtyards and tree-lined paths make a gentle walking day after the journey to the plains.',
    stops: ['Sacred Garden', 'Maya Devi Temple', 'Monastic Zone'],
    advice:
      'Agree on an entrance and meeting point rather than a temple door. The monastic grounds extend well beyond the Sacred Garden, so leave time to explore between stops.',
    image: '/images/drive-lumbini.webp',
    imageAlt:
      'A white temple and reflecting pool among trees in the Sacred Garden at Lumbini.',
  },
  {
    slug: 'bandipur',
    name: 'Bandipur',
    category: 'City & culture',
    tagline: 'Newari houses & a hilltop bazaar',
    description:
      'Turn uphill from Dumre for a night in Bandipur. The old bazaar is a place to walk: timber balconies above the street, small cafés below, and hills at the end of the lane.',
    stops: ['Bandipur Bazaar', 'Tundikhel viewpoint', 'Village lanes'],
    advice:
      'Plan a drop-off or parking spot outside the pedestrian bazaar. Ask your guesthouse which approach is easiest with luggage, particularly if you arrive late in the day.',
    image: '/images/drive-bandipur.webp',
    imageAlt:
      'Timber balconies line a stone-paved lane in Bandipur, with green hills beyond the rooftops.',
  },
  {
    slug: 'dhulikhel',
    name: 'Dhulikhel',
    category: 'Lakes & hills',
    tagline: 'Old-town lanes & terraced hills',
    description:
      'Head east of Kathmandu for brick courtyards, hillside villages and a different view of the valley. Pair a walk through Dhulikhel’s old town with an unhurried ridge stop.',
    stops: [
      'Dhulikhel old town',
      'Kali Temple steps',
      'Kavre ridge viewpoints',
    ],
    advice:
      'A viewpoint on the map may be a walk from the road. Check the last vehicle-accessible stop and plan your return around valley traffic, not just distance.',
    image: '/images/drive-dhulikhel.webp',
    imageAlt:
      'A car climbs a winding road through green terraces toward hillside houses near Dhulikhel.',
  },
  {
    slug: 'mustang',
    name: 'Mustang',
    category: 'High mountains',
    tagline: 'Stone villages & the Kali Gandaki',
    description:
      'In Lower Mustang, apple orchards and stone villages sit between the steep sides of the Kali Gandaki valley. Marpha, Jomsom and Kagbeni are starting points for a route discussion, not a single-day drive.',
    stops: ['Marpha village', 'Jomsom', 'Kagbeni'],
    advice:
      'Ask the desk to check road conditions, vehicle clearance, permits and overnight stops before choosing a car. Not every rental is suitable. Upper Mustang has separate access requirements.',
    image: '/images/drive-mustang.webp',
    imageAlt:
      'Stone houses overlook the broad riverbed and ochre cliffs of the Kali Gandaki valley in Mustang.',
  },
]

export const journeySteps = [
  {
    title: 'Choose your car',
    text: 'Compare vehicles, seating, rental options, and published daily rates.',
  },
  {
    title: 'Pick a rental type',
    text: 'Take the wheel yourself or request a car with a driver.',
  },
  {
    title: 'Set your dates',
    text: 'Choose your pickup and return dates to see a base estimate.',
  },
  {
    title: 'Request your rental',
    text: 'Add your contact information, pickup point, and trip notes.',
  },
  {
    title: 'Confirm details',
    text: 'Agree availability, any additional charges, and rental terms with U Drive.',
  },
  {
    title: 'Pickup or delivery',
    text: 'Meet at the agreed location, check the vehicle, and begin your trip.',
  },
]
export type FAQItem = { question: string; answer: string; category: string }
export const faqs: FAQItem[] = [
  {
    category: 'Rentals',
    question: 'Can I rent a car without a driver?',
    answer:
      'Yes. U Drive offers Self Drive and With Driver rentals. Select your preferred option when planning your booking.',
  },
  {
    category: 'Coverage',
    question: 'Where does U Drive offer service?',
    answer:
      'U Drive is based in Kathmandu and offers vehicle service and delivery across Nepal. The exact meeting point, route, and any delivery cost are agreed before a rental is confirmed.',
  },
  {
    category: 'Pricing',
    question: 'How is my rental estimate calculated?',
    answer:
      'The estimate is the selected vehicle’s published daily rate multiplied by the number of days between pickup and return. Driver service, delivery, and other applicable charges are confirmed separately.',
  },
  {
    category: 'Booking',
    question: 'Does a booking request reserve a vehicle?',
    answer:
      'Submitting a request checks the calendar and holds those dates while the desk reviews it. Keep your booking reference. Your rental is confirmed only when the desk changes its status to Confirmed.',
  },
  {
    category: 'Rentals',
    question: 'Which documents will I need?',
    answer:
      'For self drive, ask U Drive to confirm licence eligibility, identification, deposit, and other rental requirements for your trip before making travel plans.',
  },
  {
    category: 'Coverage',
    question: 'Can the vehicle be delivered to my location?',
    answer:
      'You can request delivery in Kathmandu or elsewhere in Nepal. Include the address in your request so that access, timing, and any delivery charge can be confirmed.',
  },
  {
    category: 'Pricing',
    question: 'Is a chauffeur included in the daily rate?',
    answer:
      'The listed prices are the supplied vehicle rental rates. Choose With Driver to request a chauffeur and have the complete price confirmed before booking.',
  },
  {
    category: 'Booking',
    question: 'Can I plan a trip without an account?',
    answer:
      'Yes. Compare the fleet, calculate an estimate, and contact the Kathmandu team on WhatsApp as a guest. You do not need an account to request your rental.',
  },
  {
    category: 'Pricing',
    question: 'When do I pay, and is there a deposit?',
    answer:
      'Submitting a request does not charge you. The desk confirms deposit and payment terms. If online payments are enabled, confirmed rentals can open a secure hosted checkout from My Bookings. Never enter card details in an enquiry.',
  },
  {
    category: 'Booking',
    question: 'How do I change or cancel a request?',
    answer:
      'Before sending, edit the dates or vehicle in the planner. If you have already sent your message, reply in the same WhatsApp conversation. For a confirmed rental, the cancellation and refund terms in your agreement apply.',
  },
]

export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/fleet', label: 'Fleet' },
  { href: '/rental-options', label: 'Rental Options' },
  { href: '/destinations', label: 'Drive Nepal' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/about', label: 'About' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
]

export type Review = {
  name: string
  avatar?: string
  rating: number
  text: string
  rentalType: RentalMode
  vehicle: string
}
export const demoReviews: Review[] = [
  {
    name: 'Maya K.',
    rating: 5,
    text: 'Our plan was simple: an early start from Kathmandu, a night in Nagarkot, and time to stop whenever the mountains came into view.',
    rentalType: 'self-drive',
    vehicle: 'Deepal S05',
  },
  {
    name: 'Roshan P.',
    rating: 5,
    text: 'With my parents along for the trip to Pokhara, a driver made much more sense. The back seat was the best place to catch up.',
    rentalType: 'with-driver',
    vehicle: 'BYD Atto 3',
  },
  {
    name: 'Alex T.',
    rating: 4,
    text: 'For a three-day valley break, comparing the daily prices first helped us choose a car and leave a little more in the budget for the journey.',
    rentalType: 'self-drive',
    vehicle: 'Tata Nexon',
  },
  {
    name: 'Nisha R.',
    rating: 5,
    text: 'We left the car near the old town in Dhulikhel. A morning on foot, lunch by the square, and the short drive back made a lovely day out.',
    rentalType: 'self-drive',
    vehicle: 'BYD Atto 1',
  },
  {
    name: 'Daniel W.',
    rating: 4,
    text: 'In Bandipur the last stretch was on foot. Knowing where to meet the driver meant we could pack a small overnight bag and leave the suitcase behind.',
    rentalType: 'with-driver',
    vehicle: 'Tata Nexon',
  },
  {
    name: 'Sita B.',
    rating: 5,
    text: 'Our Chitwan plan ended at Sauraha, not inside the park. We kept the road trip and the guided visit separate, with an afternoon free by the river.',
    rentalType: 'with-driver',
    vehicle: 'Deepal S05',
  },
  {
    name: 'Owen L.',
    rating: 4,
    text: 'The useful part of our Pokhara itinerary was the charging stop we marked before leaving. It doubled as a lunch break instead of a last-minute detour.',
    rentalType: 'self-drive',
    vehicle: 'BYD Atto 3',
  },
  {
    name: 'Anu S.',
    rating: 5,
    text: 'A small car suited our Kathmandu weekend. We parked for the heritage squares and took the longer way home when the streets were quieter.',
    rentalType: 'self-drive',
    vehicle: 'BYD Atto 1',
  },
  {
    name: 'Leah M.',
    rating: 5,
    text: 'At Lumbini we agreed on a garden gate for pickup. That little detail let us wander between the monasteries without watching for the car.',
    rentalType: 'with-driver',
    vehicle: 'BYD Atto 3',
  },
  {
    name: 'Prabin D.',
    rating: 4,
    text: 'Four people and four bags looked fine on paper. Talking through the luggage before our family trip was more useful than choosing by seat count alone.',
    rentalType: 'self-drive',
    vehicle: 'Deepal S05',
  },
  {
    name: 'Elena F.',
    rating: 5,
    text: 'The clouds stayed over Nagarkot at sunrise. With a driver and no tight onward connection, we could stop for tea and wait for a glimpse of the ridge.',
    rentalType: 'with-driver',
    vehicle: 'Tata Nexon',
  },
  {
    name: 'Ravi J.',
    rating: 5,
    text: 'We sent the hotel entrance rather than just its name. It was a small thing, but finding each other on a busy Kathmandu street was much easier.',
    rentalType: 'with-driver',
    vehicle: 'BYD Atto 1',
  },
]
