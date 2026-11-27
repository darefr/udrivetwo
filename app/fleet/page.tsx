import type { Metadata } from 'next'
import { DeskQuestions, PageIntro } from '@/components/shared'
import { RentalSearch } from '@/components/rental-search'
import { FleetResults } from '@/components/fleet-results'
import { CTA } from '@/components/footer'
import { readTrip, type Query } from '@/lib/trip'

import { pageMetadata } from '@/lib/site-metadata'
export const metadata: Metadata = pageMetadata('/fleet')
export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<Query>
}) {
  const query = await searchParams
  const trip = readTrip(query)
  return (
    <>
      <PageIntro
        current="Fleet"
        eyebrow="U DRIVE COLLECTION"
        title="The U Drive fleet."
        description="Compare cars by body style, budget, and daily rate. Choose a vehicle that fits the way you want to see Nepal."
      />
      <div className="catalogue-search">
        <div className="wrap">
          <RentalSearch key={JSON.stringify(trip)} initial={trip} />
        </div>
      </div>
      <FleetResults
        key={JSON.stringify(trip)}
        trip={trip}
        searched={Object.keys(trip).some((key) => Boolean(query[key]))}
      />
      <DeskQuestions
        eyebrow="CHOOSING YOUR CAR"
        title="Look beyond the daily rate."
        description="A few details about the people, bags and roads on your itinerary can help narrow the choice."
        items={[
          {
            question: 'How many passenger seats will I have?',
            answer:
              'The listed seat count includes the driver. A five-seat SUV carries up to four passengers with a chauffeur; the four-seat Atto 1 carries up to three. Tell the desk about large suitcases as well as your group size.',
          },
          {
            question: 'Will an electric car suit my route?',
            answer:
              'Share each overnight stop, not just the final town. Ask about compatible charging points, a backup stop and the expected charge level at return. A hotel parking space does not necessarily mean charging is available.',
          },
          {
            question: 'Can I request a particular gearbox?',
            answer:
              'Yes. Check the transmission on the model page and include your preference in the enquiry. The Tata Nexon’s gearbox and powertrain depend on the offered variant; confirm them before accepting a quote.',
          },
          {
            question: 'What if the last stretch is unpaved?',
            answer:
              'Describe the road to your actual lodge or final stop. An SUV badge alone does not establish clearance or permission for a rough route. The desk can check the proposed vehicle before you commit.',
          },
        ]}
      />
      <CTA />
    </>
  )
}
