import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { type Destination } from '@/lib/rental-data'

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      className="destination-card"
      href={`/destinations/${destination.slug}`}
    >
      <Image
        src={destination.image}
        alt=""
        width={508}
        height={508}
        sizes="(max-width: 640px) 90vw, 36vw"
      />
      <div className="destination-shade" />
      <span className="destination-category">
        <MapPin size={13} />
        {destination.category}
      </span>
      <div className="destination-caption">
        <div>
          <h3>{destination.name}</h3>
          <p>{destination.tagline}</p>
        </div>
        <span className="round-arrow">
          <ArrowUpRight size={18} />
        </span>
      </div>
    </Link>
  )
}
