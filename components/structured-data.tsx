import { business, type Vehicle } from '@/lib/rental-data'
export function StructuredData({ vehicle }: { vehicle?: Vehicle }) {
  const data = vehicle
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: vehicle.name,
        description: vehicle.overview,
        image: vehicle.image,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'NPR',
          price: vehicle.dailyRate,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: vehicle.dailyRate,
            priceCurrency: 'NPR',
            unitCode: 'DAY',
            unitText: 'day',
          },
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'AutoRental',
        name: business.name,
        telephone: business.whatsappNumber,
        description: business.description,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Kathmandu',
          addressCountry: 'NP',
        },
        areaServed: { '@type': 'Country', name: 'Nepal' },
        currenciesAccepted: 'NPR',
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
