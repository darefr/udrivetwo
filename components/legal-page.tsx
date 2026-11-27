import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageIntro } from './shared'
import { CookieSettingsLink } from './privacy-controls'

const notices = {
  privacy: [
    [
      'Rental planning',
      'Your vehicle, rental type, pickup location, and dates travel between pages in the page URL. Do not put personal information in a shared rental link.',
    ],
    [
      'Forms and downloads',
      'Submitting a booking stores your contact details, dates, pickup instructions and estimate in the rental database. Sending a website enquiry stores your message for the desk. Staff with appropriate permissions can manage these records. Opening WhatsApp prepares a separate message; you decide whether to send it. Downloaded copies remain on your device.',
    ],
    [
      'Accounts and essential cookies',
      'Accounts store your profile and a salted password hash, not your password. An essential HTTP-only session cookie identifies your signed-in browser. Remember me extends the session to 30 days. Recovery and email changes use expiring single-use links. Optional social sign-in receives identity details from the provider. Guest booking linkage and social sign-in use additional short-lived essential cookies.',
    ],
    [
      'External services',
      'Booking and account emails are processed by our configured delivery provider. Official WhatsApp Business messages may notify the desk; customer WhatsApp updates require consent at booking. The direct WhatsApp link opens outside this website without sending a message automatically. Development deliveries are captured privately rather than sent.',
    ],
    [
      'Rental assistant',
      'The guide uses the current catalog and can check a vehicle for specific dates. Signed-in customers can ask about their own booking status. It cannot reserve a vehicle. When AI assistance is enabled, a limited question may be sent for intent classification; prices and status come from our database, not model-generated figures. Conversation history stays in this tab session and can be cleared. Do not enter payment or identity documents. Optional voice dictation uses your browser’s speech service, which may process audio outside this website; the transcript is not submitted until you press Send.',
    ],
    [
      'Cookie choices and optional analytics',
      'Analytics is off unless you select Allow analytics. Essential only leaves all rental features available. A first-party preference cookie, udrive_privacy_v1, remembers your choice for up to 180 days. If your browser blocks that cookie, the choice lasts only until the page reloads. Use Cookie settings in the footer to change it at any time.',
    ],
    [
      'What analytics measures',
      'With permission, Vercel Web Analytics counts visits to catalogue and information pages, booking-button clicks, prepared enquiries and WhatsApp handoffs. A handoff is not a message sent or a confirmed booking. Events use fixed names and public page paths, without URL parameters, fragments, form fields, chat text or account credentials. Vercel may include the referring site, approximate region, browser and device type in aggregate statistics. It does not use advertising cookies; its visitor hash expires after 24 hours. Withdrawing consent stops future measurement, not statistics already collected.',
    ],
    [
      'Hosting and retention',
      'Vercel hosts this website and may process IP addresses, request times and paths to deliver pages, maintain security and diagnose errors. Submitted account, booking, payment and support records persist in the rental database. Staff actions are audited. Clearing cookies does not delete these records or external messages. Contact the desk to request access, correction or deletion, subject to applicable accounting, rental and legal retention obligations.',
    ],
    [
      'Questions and data requests',
      'Contact U Drive Car Rental Kathmandu on +977 980-0899505 to ask what enquiry information the desk holds or to request access, correction or deletion. Identify the enquiry by its approximate date; do not send payment details or identity documents through the website. Applicable law may require some rental records to be retained. Your browser also lets you remove this site’s cookie and tab data.',
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
    [
      'Acceptable use',
      'Use this site for lawful travel planning and genuine enquiries. Share only information you have permission to provide. Do not impersonate another person, send spam, interfere with the service or submit payment or identity documents in the assistant or enquiry forms.',
    ],
    [
      'Intellectual property',
      'U Drive and its licensors retain their respective rights in the website text, images, layout and branding. Vehicle names and third-party marks belong to their respective owners. You may save a copy of your own rental plan. Commercial reuse of site material requires permission from the relevant rights holder.',
    ],
    [
      'Website information and liability',
      'Submitting a request records it as pending and temporarily holds its dates. It does not mean the rental is confirmed or that a payment has been taken. We aim to keep information accurate but cannot guarantee uninterrupted access, an available car or current road conditions. To the extent permitted by law, U Drive is not liable for indirect losses arising from reliance on an unconfirmed estimate or itinerary. Nothing here limits liability or consumer rights that cannot lawfully be limited.',
    ],
    [
      'Governing law and disputes',
      'These website terms are governed by the laws of Nepal, subject to any mandatory protections that apply to you. Please contact our Kathmandu rental desk first so we can try to resolve a concern. Unresolved matters may be brought before a competent court; nothing here removes a right you have under applicable law.',
    ],
  ],
}

export function LegalPage({ page }: { page: keyof typeof notices }) {
  const title = page === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'
  const sections = notices[page].map(([heading, text]) => ({
    heading,
    text,
    id: heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  }))
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
      <div className="wrap policy-layout">
        <nav className="policy-index" aria-label="On this page">
          <p className="eyebrow">ON THIS PAGE</p>
          {sections.map(({ id, heading }) => (
            <a key={id} href={`#${id}`}>
              {heading}
            </a>
          ))}
        </nav>
        <article className="legal-copy">
          <p className="policy-date">
            Last updated <time dateTime="2026-11-27">27 November 2026</time>
          </p>
          {sections.map(({ id, heading, text }) => (
            <section key={id} id={id} tabIndex={-1}>
              <h2>{heading}</h2>
              <p>{text}</p>
              {id === 'cookie-choices-and-optional-analytics' && (
                <CookieSettingsLink />
              )}
              {id === 'what-analytics-measures' && (
                <a
                  className="policy-source"
                  href="https://vercel.com/docs/analytics/privacy-policy"
                  rel="noreferrer"
                >
                  Vercel analytics privacy information
                </a>
              )}
              {id === 'external-services' && (
                <a
                  className="policy-source"
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  rel="noreferrer"
                >
                  WhatsApp privacy policy
                </a>
              )}
            </section>
          ))}
          <Link href="/contact" className="text-link">
            Contact U Drive <ArrowRight size={15} />
          </Link>
        </article>
      </div>
    </>
  )
}
