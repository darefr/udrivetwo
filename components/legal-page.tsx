import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageIntro } from './shared'

const notices = {
  privacy: [
    [
      'Rental planning',
      'Your vehicle, rental type, pickup location, and dates travel between pages in the page URL. Do not put personal information in a shared rental link.',
    ],
    [
      'Forms and downloads',
      'The rental and contact forms prepare drafts in your browser. Choosing Open WhatsApp passes the reviewed details to WhatsApp in a pre-filled message addressed to U Drive. You decide whether to send it. A downloaded copy stays on your device.',
    ],
    [
      'Account previews',
      'Account services are not connected on this website. Use sample details only. The forms do not send or save passwords, create accounts, remember you between visits, or send reset emails.',
    ],
    [
      'External services',
      'WhatsApp opens outside this website and is subject to its own privacy policy. Rental enquiries are addressed to +977 980-0899505. Opening the conversation does not send the message for you.',
    ],
    [
      'Rental assistant',
      'The catalog guide sends your recent conversation to our website to prepare a reply from published rental information. It does not check live inventory or reserve cars. History is kept only for this tab session and can be cleared. Do not enter payment or identity documents. Optional voice dictation uses your browser’s speech service, which may process audio outside this website; the transcript is not submitted until you press Send.',
    ],
    [
      'Website delivery',
      'Hosting services may process technical request information, such as your IP address and the requested page, to deliver and protect the website.',
    ],
  ],
  terms: [
    [
      'Planning a rental',
      'You can compare vehicles, choose a rental type, and prepare a rental request without an account. A draft or downloaded request is not a confirmed rental.',
    ],
    [
      'Rates and availability',
      'Published prices are vehicle base rates in Nepalese rupees per day. A date selection does not establish availability. Driver service, delivery, and any other charges must be agreed with U Drive before the rental.',
    ],
    [
      'Before handover',
      'Confirm the pickup point, route, return time, vehicle condition, licence requirements, deposit, insurance terms, and cancellation conditions directly with the rental team. This website does not replace your rental agreement.',
    ],
    [
      'Vehicles and routes',
      'Photographs illustrate the fleet and driving routes. Confirm the exact vehicle, its equipment, and suitability for your itinerary before travelling. Road and weather conditions may change.',
    ],
  ],
}

export function LegalPage({ page }: { page: keyof typeof notices }) {
  const title = page === 'privacy' ? 'Privacy Policy' : 'Terms of Use'
  return (
    <>
      <PageIntro
        current={title}
        eyebrow="U DRIVE · CUSTOMER INFORMATION"
        title={title}
        description={
          page === 'privacy'
            ? 'How information is handled when you plan a rental on this website.'
            : 'What to know when browsing the fleet and preparing a rental request.'
        }
      />
      <article className="wrap legal-copy">
        {notices[page].map(([heading, text]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{text}</p>
          </section>
        ))}
        <Link href="/contact" className="text-link">
          Contact U Drive <ArrowRight size={15} />
        </Link>
      </article>
    </>
  )
}
