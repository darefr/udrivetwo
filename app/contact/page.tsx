import type { Metadata } from 'next'
import { DeskQuestions, PageIntro } from '@/components/shared'
import { ContactForm } from '@/components/contact-form'
import { getVehicle } from '@/lib/rental-data'
import { type Query } from '@/lib/trip'
import { pageMetadata } from '@/lib/site-metadata'
export const metadata: Metadata = pageMetadata('/contact')
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Query>
}) {
  const { vehicle, topic } = await searchParams
  const feedback = topic === 'rental-feedback'
  const car = getVehicle(typeof vehicle === 'string' ? vehicle : undefined)
  return (
    <>
      <PageIntro
        current="Contact"
        eyebrow="CONTACT U DRIVE"
        title="Let’s talk about your trip."
        description="Have a vehicle in mind, an unusual route, or a question about delivery? Start with the details below."
      />
      <ContactForm
        key={JSON.stringify([car?.slug, feedback])}
        vehicle={car?.name}
        feedback={feedback}
      />
      <DeskQuestions
        eyebrow="PICKUP & SUPPORT"
        title="Help us find the right meeting point."
        description="A street name is a start. A few extra details make an airport arrival, hotel handover or change of plan easier to arrange."
        items={[
          {
            question: 'What should I send for an airport arrival?',
            answer:
              'Include the airport, flight number, arrival date and local arrival time. Ask the desk to agree a specific meeting point and contact before you travel; the enquiry alone does not confirm an airport pickup.',
          },
          {
            question: 'Can we meet at my hotel?',
            answer:
              'Send the property name, neighbourhood and entrance, or a map pin. In a narrow lane or pedestrian area, agree a nearby vehicle-accessible spot and allow time to walk there with your bags.',
          },
          {
            question: 'How do I change an existing arrangement?',
            answer:
              'Reply in the original WhatsApp conversation with the agreed car, dates and the change you need. Keep the original arrangement until the team confirms the revised timing, availability and any price difference.',
          },
        ]}
      />
    </>
  )
}
