import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, Route, Signpost } from 'lucide-react'
import { destinations } from '@/lib/rental-data'
import { Breadcrumbs, SectionHeading } from '@/components/shared'
import { DestinationCard } from '@/components/destination-card'
import { destinationMetadata, missingMetadata } from '@/lib/site-metadata'

export const dynamicParams = false
export const generateStaticParams = () =>
  destinations.map((d) => ({ slug: d.slug }))
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const destination = destinations.find((item) => item.slug === slug)
  return destination ? destinationMetadata(destination) : missingMetadata
}
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const d = destinations.find((d) => d.slug === slug)
  if (!d) notFound()
  return (
    <>
      <section className="wrap guide-page">
        <Breadcrumbs
          items={[
            { label: 'Destinations', href: '/destinations' },
            { label: d.name },
          ]}
        />
        <div className="destination-detail">
          <div>
            <p className="eyebrow">THE NEPAL ROADBOOK</p>
            <h1>{d.name}.</h1>
            <p className="guide-tagline">{d.tagline}</p>
            <p className="intro-description">{d.description}</p>
            <span className="guide-category">
              <MapPin size={15} />
              {d.category} · Nepal
            </span>
            <Link
              className="action primary"
              href={`/booking?destination=${d.slug}`}
            >
              Plan this journey <ArrowRight size={16} />
            </Link>
          </div>
          <Image
            src={d.image}
            alt={d.imageAlt}
            sizes="(max-width: 740px) 92vw, (max-width: 1200px) 46vw, 620px"
            width={508}
            height={508}
            priority
          />
        </div>
      </section>
      <section className="section surface">
        <div className="wrap guide-notes">
          <div>
            <p className="eyebrow">ALONG THE WAY</p>
            <h2>Places to explore.</h2>
            <ul>
              {d.stops.map((stop) => (
                <li key={stop}>
                  <Signpost size={18} />
                  {stop}
                </li>
              ))}
            </ul>
          </div>
          <div className="travel-note">
            <Route size={25} />
            <h3>Before you set off</h3>
            <p>{d.advice}</p>
            <p>
              Vehicle suitability, your meeting point, and any delivery cost are
              confirmed for your chosen route.
            </p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <SectionHeading
            eyebrow="KEEP EXPLORING"
            title="More roads, more Nepal."
            href="/destinations"
            linkText="All destinations"
          />
          <div className="destination-grid">
            {destinations
              .filter((item) => item.slug !== slug)
              .sort(
                (a, b) =>
                  Number(b.category === d.category) -
                  Number(a.category === d.category),
              )
              .slice(0, 3)
              .map((item) => (
                <DestinationCard key={item.slug} destination={item} />
              ))}
          </div>
        </div>
      </section>
    </>
  )
}
