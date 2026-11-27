import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  MessagesSquare,
  ReceiptText,
  Route,
} from 'lucide-react'
import { faqs, journeySteps, whatsAppContact } from '@/lib/rental-data'
import { FAQ, SectionHeading } from './shared'
import { VehicleCard } from './vehicle-card'
import { DestinationCard } from './destination-card'
import { Stats } from './stats'
import { CardRail } from './card-rail'
import { catalog } from '@/lib/platform/catalog'

const originalHighlights = new Set(['pokhara', 'nagarkot', 'chitwan'])
export async function FeaturedFleet() {
  const featuredVehicles = (await catalog()).fleet.filter(
    (v) => v.featured && v.available,
  )
  return (
    <section className="section featured-section">
      <div className="wrap">
        <SectionHeading
          eyebrow="OUR FLEET"
          title="Find your kind of drive."
          href="/fleet"
          linkText="View full fleet"
        />
        <div
          className="fleet-grid home-fleet"
          aria-label="Featured rental vehicles"
        >
          {featuredVehicles.slice(0, 4).map((v) => (
            <VehicleCard key={v.slug} vehicle={v} />
          ))}
        </div>
        <p className="swipe-hint">
          Swipe to compare the featured cars <ArrowRight size={13} />
        </p>
      </div>
    </section>
  )
}
export async function ExploreNepal() {
  const { destinations } = await catalog()
  const homeDestinations = [
    ...destinations.filter((d) => originalHighlights.has(d.slug)),
    ...destinations.filter((d) => !originalHighlights.has(d.slug)),
  ]
  return (
    <section className="section surface">
      <div className="wrap">
        <CardRail
          kind="destination"
          label="Nepal destination carousel"
          heading={{
            eyebrow: 'DRIVE NEPAL',
            title: 'Drive beyond Kathmandu.',
            description:
              'Choose your car in the valley. Follow the road to lakeside bends, forest drives, and Himalayan ridges.',
            href: '/destinations',
            linkText: 'Explore driving routes',
          }}
        >
          {homeDestinations.map((d) => (
            <DestinationCard destination={d} key={d.slug} />
          ))}
        </CardRail>
      </div>
    </section>
  )
}
export function RentalExperiences() {
  return (
    <section className="section rental-experiences">
      <div className="wrap">
        <SectionHeading
          eyebrow="RENTAL OPTIONS"
          title="Two ways to take the road."
          description="Choose the experience that suits your journey."
        />
        <div className="experience-grid">
          {[
            {
              slug: 'self-drive',
              title: 'Self Drive',
              copy: 'Your route. Your pace.',
            },
            {
              slug: 'with-driver',
              title: 'With Driver',
              copy: 'Sit back and enjoy the journey.',
            },
          ].map((s) => (
            <Link
              className={`experience-tile experience-${s.slug}`}
              key={s.slug}
              href={`/${s.slug}`}
            >
              <Image
                src={`/images/${s.slug}.webp`}
                alt={
                  s.slug === 'self-drive'
                    ? 'A driver taking a winding road through the hills'
                    : 'A chauffeur beside a silver vehicle'
                }
                width={508}
                height={1024}
                sizes="(max-width:640px) 90vw, 46vw"
              />
              <div className="experience-shade" />
              <div className="experience-caption">
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
                <span>
                  Discover {s.title.toLowerCase()} <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
export function RentalPrinciples() {
  return (
    <section className="section surface rental-principles">
      <div className="wrap">
        <SectionHeading
          eyebrow="WHY CHOOSE U DRIVE"
          title="Know the details before you drive."
        />
        <div className="principles">
          {[
            {
              Icon: ReceiptText,
              title: 'A price you can plan around',
              text: 'Start with a published daily rate. See the vehicle total for your dates, then agree driver and delivery charges before you confirm.',
            },
            {
              Icon: Route,
              title: 'A handover that fits',
              text: 'Collect in Kathmandu or request delivery to your hotel. A different return city? Add it to the same enquiry.',
            },
            {
              Icon: MessagesSquare,
              title: 'One local rental desk',
              text: 'Speak to the Kathmandu team about the exact car, luggage space, and road conditions for your route.',
            },
          ].map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomeFAQ() {
  return (
    <section className="section" aria-labelledby="home-faq-title">
      <div className="wrap detail-facts home-faq">
        <div>
          <p className="eyebrow">AT THE RENTAL DESK</p>
          <h2 id="home-faq-title">Before you take the keys.</h2>
          <p className="section-description">
            A few things worth knowing before you plan your drive.
          </p>
          <Link className="text-link" href="/faq">
            All rental questions <ArrowRight size={15} />
          </Link>
        </div>
        <FAQ items={[faqs[0], faqs[2], faqs[5], faqs[3]]} />
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section className="section timeline-section">
      <div className="wrap">
        <SectionHeading
          eyebrow="HOW IT WORKS"
          title="From first click to open road."
          href="/how-it-works"
          linkText="Read the guide"
        />
        <ol className="timeline">
          {journeySteps.map((s, i) => (
            <li key={s.title}>
              <span className="step-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{s.title}</h3>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
export function StorySection({ full = false }: { full?: boolean }) {
  return (
    <section className="section">
      <div className="wrap story-layout">
        <figure className="story-photo">
          <Image
            src="/images/drive-nagarkot.webp"
            alt="A Tata Nexon following the pine-lined ridge road near Nagarkot"
            width={508}
            height={508}
            sizes="(max-width:800px) 90vw, 44vw"
          />
          <figcaption>
            <MapPin size={14} />
            Nagarkot, Nepal
          </figcaption>
        </figure>
        <div className="story-copy">
          <p className="eyebrow">{full ? 'OUR PHILOSOPHY' : 'ABOUT U DRIVE'}</p>
          <h2>
            Rooted in Kathmandu.
            <br />
            Ready for Nepal.
          </h2>
          <p>
            {full
              ? 'A city visit, a family holiday and a long drive into the hills ask different things of a car. Our Kathmandu desk starts with the passengers, luggage and overnight stops, then discusses the car that fits.'
              : 'There is more than one way to see Nepal. U Drive brings together a focused fleet and two rental options, so the vehicle fits your journey—not the other way around.'}
          </p>
          <p>
            {full
              ? 'You can compare our vehicles without an account. When you are ready, the planner puts the dates, car and base price into a single enquiry so you and the rental desk can work from the same details.'
              : 'Collect your car in the valley or request a handover in Pokhara, Chitwan, Nagarkot, or another location in Nepal. Tell us where you want to finish, too. We confirm the route and delivery cost with you before the keys change hands.'}
          </p>
          {full ? (
            <div className="check-list">
              <span>
                <Check />A clearly listed daily rate
              </span>
              <span>
                <Check />
                Self drive or with a driver
              </span>
              <span>
                <Check />
                Service across Nepal
              </span>
            </div>
          ) : (
            <a
              className="text-link"
              href={whatsAppContact.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Discuss your handover <ArrowUpRight size={16} />
            </a>
          )}
          <Stats />
        </div>
      </div>
    </section>
  )
}
