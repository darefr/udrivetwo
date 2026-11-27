import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { faqs, modeLabel, type RentalMode } from '@/lib/rental-data'
import { Breadcrumbs, FAQ, PageIntro, SectionHeading } from './shared'
import { RentalExperiences } from './home-sections'
import { CTA } from './footer'

export function RentalOptionPage({ mode }: { mode: RentalMode }) {
  const self = mode === 'self-drive'
  return (
    <>
      <section className="wrap option-page">
        <Breadcrumbs
          items={[
            { label: 'Rental Options', href: '/rental-options' },
            { label: modeLabel(mode) },
          ]}
        />
        <div className="option-layout">
          <div className="option-copy">
            <p className="eyebrow">{modeLabel(mode)} RENTALS</p>
            <h1>{self ? 'The road, on your terms.' : 'The view is yours.'}</h1>
            <p className="option-lead">
              {self
                ? 'Your route. Your pace.'
                : 'Sit back and enjoy the journey.'}
            </p>
            <p>
              {self
                ? 'A self-drive rental gives you the freedom to plan your own route, linger over a view, and travel at your own pace. Choose your car and start your journey in Kathmandu or at an agreed delivery location.'
                : 'Choose a car with a driver and settle into the journey. Share your destinations, timings, and preferred stops so the route and driver arrangements can be agreed before you travel.'}
            </p>
            <div className="check-list">
              {(self
                ? [
                    'Choose from our self-drive collection',
                    'Plan your own stops and schedule',
                    'Request pickup or delivery across Nepal',
                  ]
                : [
                    'Choose your preferred vehicle',
                    'Discuss your route and stops in advance',
                    'Confirm driver charges before you rent',
                  ]
              ).map((x) => (
                <span key={x}>
                  <Check />
                  {x}
                </span>
              ))}
            </div>
            <div className="action-row">
              <Link href={`/booking?mode=${mode}`} className="action primary">
                Plan a {self ? 'self-drive trip' : 'chauffeured trip'}
                <ArrowRight size={15} />
              </Link>
              <Link href={`/fleet?mode=${mode}`} className="text-link">
                Explore fleet <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div className={`option-photo ${mode}`}>
            <Image
              src={`/images/${mode}.webp`}
              alt={
                self
                  ? 'Hands on the wheel on a tree-lined Nepal road'
                  : 'A chauffeur ready to open a passenger door'
              }
              width={508}
              height={1024}
              priority
            />
          </div>
        </div>
      </section>
      <section className="section surface">
        <div className="wrap detail-facts">
          <div>
            <p className="eyebrow">RENTAL NOTES</p>
            <h2>Before your {self ? 'drive' : 'journey'}.</h2>
            <p className="section-description">
              Let us clarify the practical details before you set off.
            </p>
          </div>
          <FAQ
            items={
              self ? [faqs[4], faqs[2], faqs[5]] : [faqs[6], faqs[5], faqs[3]]
            }
          />
        </div>
      </section>
      <CTA />
    </>
  )
}
export function RentalComparison() {
  return (
    <>
      <PageIntro
        current="Rental Options"
        eyebrow="YOUR RENTAL, YOUR WAY"
        title="Choose how you travel."
        description="The same fleet, with two different ways to enjoy the road. Compare the arrangements before planning your trip."
      />
      <RentalExperiences />
      <section className="section surface">
        <div className="wrap">
          <SectionHeading eyebrow="AT A GLANCE" title="Find your fit." />
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Your rental</th>
                <th scope="col">Self Drive</th>
                <th scope="col">With Driver</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['At the wheel', 'You', 'A chauffeur'],
                [
                  'Travelling party',
                  'Count yourself in the listed seats',
                  'Allow one of the listed seats for the chauffeur',
                ],
                ['Pickup or delivery', 'By arrangement', 'By arrangement'],
                [
                  'Before you travel',
                  'Confirm licence and rental terms',
                  'Confirm itinerary and driver charges',
                ],
                [
                  'Pricing',
                  'Vehicle daily rate + agreed extras',
                  'Vehicle daily rate + agreed driver service and extras',
                ],
              ].map((row) => (
                <tr key={row[0]}>
                  <th scope="row">{row[0]}</th>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section" aria-label="Rental itinerary examples">
        <div className="wrap">
          <SectionHeading
            eyebrow="IN PRACTICE"
            title="Two trips from Kathmandu."
          />
          <div className="planning-pair">
            <article className="travel-note">
              <p className="eyebrow">SELF DRIVE</p>
              <h3>An overnight in Dhulikhel.</h3>
              <p>
                Leave time for a walk through the old town, then drive on to
                your overnight stop. For a self-drive quote, include the hotel
                approach and ask which licence and deposit details the desk
                needs.
              </p>
              <Link
                className="text-link"
                href="/booking?mode=self-drive&destination=dhulikhel"
              >
                Plan this self-drive trip <ArrowRight size={15} />
              </Link>
            </article>
            <article className="travel-note">
              <p className="eyebrow">WITH DRIVER</p>
              <h3>A family visit to Pokhara.</h3>
              <p>
                List your passengers, bags and planned nights by the lake. Agree
                the driver’s hours, overnight arrangements and return point in
                the quote, especially if your group finishes the trip in
                Pokhara.
              </p>
              <Link
                className="text-link"
                href="/booking?mode=with-driver&destination=pokhara"
              >
                Plan this chauffeured trip <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </div>
      </section>
      <CTA />
    </>
  )
}
