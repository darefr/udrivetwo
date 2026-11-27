import type { Metadata } from 'next'
import Image from 'next/image'
import { CloudSun, MountainSnow, Route } from 'lucide-react'
import { Breadcrumbs, SectionHeading } from '@/components/shared'
import { DestinationBrowser } from '@/components/destination-browser'
import { CTA } from '@/components/footer'
export const metadata: Metadata = {
  title: 'Destinations — The Nepal Roadbook',
  description:
    'Explore eight Nepal destinations, from Kathmandu and Pokhara to Lumbini, Bandipur, Dhulikhel and Lower Mustang. Find local stops and practical rental route notes.',
}
export default function DestinationsPage() {
  return (
    <>
      <section className="photo-banner">
        <Image
          src="/images/showcase-byd-atto-3.webp"
          alt="A BYD Atto 3 on an open road through the Nepal foothills"
          fill
          priority
          sizes="100vw"
        />
        <div className="banner-scrim" />
        <div className="wrap">
          <Breadcrumbs items={[{ label: 'Destinations' }]} />
          <p className="eyebrow">THE U DRIVE ROADBOOK</p>
          <h1>Your car. Your route. Your Nepal.</h1>
          <p>
            From Kathmandu streets to open ridge roads.
            <br />
            Choose a route for your next rental.
          </p>
        </div>
      </section>
      <DestinationBrowser />
      <section className="section surface" aria-label="Route planning notes">
        <div className="wrap">
          <SectionHeading
            eyebrow="FROM THE ROADBOOK"
            title="Before leaving the valley."
          />
          <div className="principles">
            <div>
              <Route aria-hidden="true" />
              <h3>Plan by stops, not kilometres.</h3>
              <p>
                A winding ridge road and a flat stretch of highway can take very
                different amounts of time. Tell the desk where you want to sleep
                each night and which stops matter most.
              </p>
            </div>
            <div>
              <CloudSun aria-hidden="true" />
              <h3>Check the road on the day.</h3>
              <p>
                Rain, roadworks and poor visibility can change an itinerary.
                Check the latest conditions before setting out, leave daylight
                for hill sections and keep a shorter alternative in mind.
              </p>
            </div>
            <div>
              <MountainSnow aria-hidden="true" />
              <h3>Ask before heading higher.</h3>
              <p>
                For Mustang, share the furthest village you intend to reach.
                Vehicle clearance, charging or fuel, local permits and the
                return journey need checking before a model is agreed.
              </p>
            </div>
          </div>
        </div>
      </section>
      <CTA />
    </>
  )
}
