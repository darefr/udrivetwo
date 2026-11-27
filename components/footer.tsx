import Link from 'next/link'
import { ArrowRight, ArrowUpRight, MapPin, Route } from 'lucide-react'
import { Brand } from './brand'
import { CookieSettingsLink } from './privacy-controls'
import {
  business,
  destinations,
  fleet,
  whatsAppContact,
} from '@/lib/rental-data'

export function CTA() {
  return (
    <section className="booking-cta">
      <div className="wrap cta-inner">
        <div>
          <p className="eyebrow">YOUR NEXT DRIVE</p>
          <h2>Ready to take the wheel?</h2>
        </div>
        <div className="action-row">
          <Link href="/booking" className="action primary">
            Rent a Car <ArrowRight size={17} />
          </Link>
          <Link href="/contact" className="action light-outline">
            Contact U Drive <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  )
}
export { FloatingContact } from './floating-contact'

const groups = [
  {
    title: 'Fleet',
    links: [
      ...fleet.slice(0, 4).map((v) => [v.name, `/fleet/${v.slug}`]),
      ['View full fleet', '/fleet'],
    ],
  },
  {
    title: 'Rental Services',
    links: [
      ['Self Drive', '/self-drive'],
      ['With Driver', '/with-driver'],
      ['Compare rental options', '/rental-options'],
      ['Booking', '/booking'],
    ],
  },
  {
    title: 'Explore Nepal',
    links: [
      ...destinations
        .slice(0, 4)
        .map((d) => [d.name, `/destinations/${d.slug}`]),
      ['All destinations', '/destinations'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About U Drive', '/about'],
      ['How It Works', '/how-it-works'],
      ['Reviews', '/reviews'],
      ['FAQ', '/faq'],
      ['Contact', '/contact'],
    ],
  },
  {
    title: 'Customer Support',
    links: [
      ['Sign In', '/sign-in'],
      ['Create Account', '/create-account'],
      ['Contact the team', '/contact'],
      ['WhatsApp', whatsAppContact.href],
    ],
  },
]

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand />
            <p>{business.description}</p>
            <a
              className="footer-whatsapp"
              href={whatsAppContact.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/whatsapp.svg" alt="" width={16} height={16} />
              {business.whatsappNumber}
              <ArrowUpRight size={13} />
            </a>
            <span className="inline-icon">
              <MapPin size={15} />
              Kathmandu, Nepal
            </span>
          </div>
          {groups.map((g) => (
            <nav
              className="footer-column"
              key={g.title}
              aria-label={`${g.title} footer links`}
            >
              <h2>{g.title}</h2>
              {g.links.map(([name, url]) =>
                url.startsWith('https:') ? (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={whatsAppContact.label}
                    className="inline-icon"
                  >
                    {name}
                    <ArrowUpRight size={12} />
                  </a>
                ) : (
                  <Link key={name} href={url}>
                    {name}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>
        <div className="footer-coverage">
          <span>
            <Route size={17} />
            <strong>Our service area</strong>
          </span>
          <p>
            Kathmandu Valley and across Nepal. Pickup and delivery by
            arrangement.
          </p>
          <Link href="/destinations">
            Drive Nepal <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} U Drive Car Rental Kathmandu.
          </span>
          <nav aria-label="Legal information">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <CookieSettingsLink />
          </nav>
        </div>
      </div>
    </footer>
  )
}
