import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  CheckCheck,
  ClipboardList,
  KeyRound,
  UserRoundCheck,
} from 'lucide-react'
import { journeySteps } from '@/lib/rental-data'
import { PageIntro, SectionHeading } from './shared'
import { RentalPrinciples, StorySection } from './home-sections'
import { ReviewCarousel } from './review-carousel'
import { CTA } from './footer'

export function AboutPage() {
  return (
    <>
      <PageIntro
        current="About"
        eyebrow="ABOUT U DRIVE"
        title="A local start. An open road."
        description="U Drive Car Rental Kathmandu connects a modern vehicle collection with the freedom to explore Nepal your way."
      />
      <StorySection full />
      <RentalPrinciples />
      <section className="section" aria-label="Confirming your rental quote">
        <div className="wrap detail-facts">
          <div>
            <p className="eyebrow">YOUR KATHMANDU RENTAL DESK</p>
            <h2>One quote to check before you go.</h2>
            <p className="section-description">
              The planner is a starting estimate. Use your conversation with our
              desk to bring these details together before agreeing to a rental.
            </p>
            <Link className="text-link planning-link" href="/contact">
              Speak to the rental desk <ArrowRight size={15} />
            </Link>
          </div>
          <dl className="fact-list">
            <div>
              <dt>The car</dt>
              <dd>Model, variant and dates</dd>
            </div>
            <div>
              <dt>The price</dt>
              <dd>Vehicle hire and itemised extras</dd>
            </div>
            <div>
              <dt>The terms</dt>
              <dd>Documents, deposit and cover</dd>
            </div>
            <div>
              <dt>The handover</dt>
              <dd>Meeting point, time and contact</dd>
            </div>
          </dl>
        </div>
      </section>
      <CTA />
    </>
  )
}
export function RentalGuide() {
  const icons = [
    CarFront,
    UserRoundCheck,
    CalendarDays,
    ClipboardList,
    CheckCheck,
    KeyRound,
  ]
  return (
    <>
      <PageIntro
        current="How It Works"
        eyebrow="THE RENTAL GUIDE"
        title="Your journey, step by step."
        description="From comparing your first car to collecting the keys, here is how to plan a U Drive rental."
      />
      <section className="section">
        <div className="wrap guide-layout">
          <ol className="detailed-steps">
            {journeySteps.map((s, i) => {
              const Icon = icons[i]
              return (
                <li key={s.title}>
                  <span className="step-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <Icon size={19} />
                    <h2>{s.title}</h2>
                    <p>{s.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <aside className="guide-aside">
            <Image
              src="/images/deepal-s05.webp"
              alt="Silver Deepal S05 on a mountain road"
              width={508}
              height={508}
            />
            <div>
              <p className="eyebrow">BEFORE YOU START</p>
              <h3>Have a trip in mind?</h3>
              <p>
                Bring your dates, a pickup location, and a rough route. You can
                compare the vehicle estimate without an account.
              </p>
              <Link href="/booking" className="action primary">
                Plan your rental
                <ArrowRight size={16} />
              </Link>
              <p className="fine-print">
                Send your reviewed request on WhatsApp. The Kathmandu team
                confirms the car, final price, and handover with you.
              </p>
            </div>
          </aside>
        </div>
      </section>
      <section
        className="section surface"
        aria-label="Vehicle handover checklist"
      >
        <div className="wrap">
          <SectionHeading
            eyebrow="AT THE HANDOVER"
            title="Collecting and returning your car."
          />
          <div className="planning-pair">
            {[
              {
                title: 'Before you take the keys',
                points: [
                  'Walk around the car together and note any existing marks.',
                  'Check the odometer, fuel or battery level, and any charging cable supplied.',
                  'Keep the agreed return details and rental desk contact to hand.',
                ],
              },
              {
                title: 'When you bring it back',
                points: [
                  'Tell the desk if traffic changes your arrival time or meeting point.',
                  'Check the agreed fuel or charge level and return the keys and supplied accessories.',
                  'Review the vehicle condition and any final charges together before leaving.',
                ],
              },
            ].map((note) => (
              <article key={note.title} className="travel-note">
                <h3>{note.title}</h3>
                <ul className="handover-checklist">
                  {note.points.map((point) => (
                    <li key={point}>
                      <Check size={16} aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CTA />
    </>
  )
}
export function ReviewsPage() {
  return (
    <>
      <PageIntro
        current="Reviews"
        eyebrow="U DRIVE REVIEWS"
        title="Stories from the road."
        description="A space for traveller perspectives, with the vehicle and rental mode behind every story."
      />
      <ReviewCarousel standalone />
      <section className="section">
        <div className="wrap detail-facts">
          <div>
            <p className="eyebrow">AFTER YOUR RENTAL</p>
            <h2>Have a story of your own?</h2>
            <p className="section-description">
              Tell our Kathmandu desk what worked on your trip and what could be
              better. Your feedback goes to the team, not straight onto the
              website.
            </p>
            <Link
              href="/contact?topic=rental-feedback"
              className="text-link planning-link"
            >
              Share rental feedback <ArrowRight size={15} />
            </Link>
          </div>
          <div className="travel-note">
            <h3>Details that help the next traveller.</h3>
            <ul className="handover-checklist">
              <li>
                <Check size={16} aria-hidden="true" />
                The car, rental mode and month you travelled.
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                One useful observation about luggage, charging or your route.
              </li>
              <li>
                <Check size={16} aria-hidden="true" />
                Anything that would have made collection or return easier.
              </li>
            </ul>
            <p className="fine-print">
              The sample profiles and ratings above are illustrative, not
              verified endorsements.
            </p>
          </div>
        </div>
      </section>
      <CTA />
    </>
  )
}
