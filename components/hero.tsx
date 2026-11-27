import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  MountainSnow,
  UserRoundCheck,
} from 'lucide-react'
import { Wheel } from './brand'
import { RentalSearch } from './rental-search'
import { VehicleShowcase } from './vehicle-showcase'

export function Hero() {
  return (
    <>
      <VehicleShowcase>
        <div className="hero-copy">
          <p className="eyebrow">CAR RENTAL IN KATHMANDU</p>
          <h1 id="hero-title">
            Your journey.
            <br />
            Your car. <em>Your Nepal.</em>
          </h1>
          <p className="hero-description">
            Self-drive and chauffeur-driven car rentals.
            <span className="hero-coverage-copy">
              <br />
              From Kathmandu, across Nepal.
            </span>
          </p>
          <div className="action-row">
            <Link href="/booking" className="action primary">
              Rent a Car <ArrowRight size={17} />
            </Link>
            <Link
              href="/fleet"
              prefetch={false}
              className="action light-outline"
            >
              Explore Fleet <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </VehicleShowcase>
      <div className="wrap hero-search">
        <RentalSearch />
      </div>
    </>
  )
}
export function ValueStrip() {
  const values = [
    {
      title: 'Self Drive',
      text: 'Your route, your pace',
      icon: <Wheel size={29} />,
      href: '/self-drive',
    },
    {
      title: 'With Driver',
      text: 'Sit back and enjoy',
      icon: <UserRoundCheck />,
      href: '/with-driver',
    },
    {
      title: 'Kathmandu Based',
      text: 'Your local starting point',
      icon: <MapPin />,
      href: '/about',
    },
    {
      title: 'Nepal-Wide Service',
      text: 'Beyond the city limits',
      icon: <MountainSnow />,
      href: '/destinations',
    },
  ]
  return (
    <section className="value-strip" aria-label="Rental services and coverage">
      <div className="wrap value-grid">
        {values.map((v) => (
          <Link
            key={v.title}
            href={v.href}
            prefetch={false}
            className="value-item"
          >
            <span className="value-icon">{v.icon}</span>
            <span>
              <strong>{v.title}</strong>
              <small>{v.text}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
