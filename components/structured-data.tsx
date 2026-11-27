import { business, type Vehicle } from '@/lib/rental-data'
import { settings } from '@/lib/platform/database'
export async function StructuredData({ vehicle }: { vehicle?: Vehicle }) {
  const cfg = await settings()
  const data = vehicle
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: vehicle.name,
        description: vehicle.overview,
        image: vehicle.image,
        offers: {
          '@type': 'Offer',
          priceCurrency: cfg.currency,
          price: vehicle.dailyRate,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: vehicle.dailyRate,
            priceCurrency: cfg.currency,
            unitCode: 'DAY',
            unitText: 'day',
          },
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'AutoRental',
        name: cfg.company,
        telephone: cfg.whatsapp,
        description: business.description,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Kathmandu',
          addressCountry: 'NP',
        },
        areaServed: { '@type': 'Country', name: 'Nepal' },
        currenciesAccepted: cfg.currency,
      }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
