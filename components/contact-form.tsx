'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  MapPin,
  MountainSnow,
} from 'lucide-react'
import { FieldGroup } from './ui/field'
import { FormField, PreviewNote } from './form-parts'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { downloadText } from '@/lib/trip'
import { recordConversion } from '@/lib/privacy'
import { business, whatsappHref, whatsAppContact } from '@/lib/rental-data'

type Enquiry = { name: string; email: string; topic: string; message: string }
export function ContactForm({
  vehicle,
  feedback = false,
}: {
  vehicle?: string
  feedback?: boolean
}) {
  const [values, setValues] = useState<Enquiry>({
    name: '',
    email: '',
    topic: feedback
      ? 'Traveller feedback'
      : vehicle
        ? 'Vehicle details'
        : 'Rental enquiry',
    message: vehicle ? `I have a question about the ${vehicle}.` : '',
  })
  const [prepared, setPrepared] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => setReady(true), [])
  useEffect(() => {
    if (prepared) heading.current?.focus()
  }, [prepared])
  const update = (key: keyof Enquiry, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setError('')
  }
  const prepare = (e: FormEvent) => {
    e.preventDefault()
    if (values.name.trim().length < 2 || values.message.trim().length < 10) {
      setError('Add your name and a message of at least 10 characters.')
      return
    }
    setPrepared(true)
    recordConversion('Contact enquiry prepared')
  }
  const draft = `U DRIVE CAR RENTAL KATHMANDU\nENQUIRY DRAFT — NOT SENT\n\nName: ${values.name}\nEmail: ${values.email}\nSubject: ${values.topic}\n\n${values.message}`
  return (
    <section className="section">
      <div className="wrap contact-layout">
        <div>
          {prepared ? (
            <div className="enquiry-review">
              <p className="eyebrow">ENQUIRY PREVIEW</p>
              <h2 ref={heading} tabIndex={-1}>
                Your enquiry is ready.
              </h2>
              <p className="section-description">
                Open WhatsApp to send these details to the Kathmandu rental
                desk. You can edit the message before sending it.
              </p>
              <dl className="review-details">
                {[
                  ['Name', values.name],
                  ['Email', values.email],
                  ['Subject', values.topic],
                  ['Message', values.message],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="action-row">
                <a
                  className="action primary"
                  href={whatsappHref(
                    `Hello U Drive, ${values.topic.toLowerCase()}:\n\n${values.message.trim()}\n\n${values.name.trim()}\n${values.email.trim()}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open WhatsApp <ArrowRight size={16} />
                </a>
                <button
                  className="action outline"
                  onClick={() => downloadText('u-drive-enquiry.txt', draft)}
                >
                  <Download size={16} />
                  Download enquiry
                </button>
                <button
                  className="action outline"
                  onClick={() => setPrepared(false)}
                >
                  <ArrowLeft size={15} />
                  Edit enquiry
                </button>
              </div>
            </div>
          ) : (
            <form
              method="post"
              onSubmit={prepare}
              className="enquiry-form"
              data-ready={ready}
            >
              <p className="eyebrow">
                {values.topic === 'Traveller feedback'
                  ? 'TRAVELLER FEEDBACK'
                  : 'TRAVEL ENQUIRIES'}
              </p>
              <h2>
                {values.topic === 'Traveller feedback'
                  ? 'Tell us about your rental.'
                  : 'Tell us about your plans.'}
              </h2>
              <FieldGroup className="form-grid">
                <FormField id="contact-name" label="Full name">
                  <Input
                    id="contact-name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    value={values.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your full name"
                  />
                </FormField>
                <FormField id="contact-email" label="Email address">
                  <Input
                    id="contact-email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    value={values.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormField>
                <FormField
                  id="contact-topic"
                  label="What is your enquiry about?"
                  wide
                >
                  <select
                    className="form-select"
                    id="contact-topic"
                    value={values.topic}
                    onChange={(e) => update('topic', e.target.value)}
                  >
                    {[
                      'Rental enquiry',
                      'Vehicle details',
                      'Pickup & delivery',
                      'Account enquiry',
                      'Traveller feedback',
                      'Other question',
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </FormField>
                <FormField id="contact-message" label="Your message" wide>
                  <Textarea
                    id="contact-message"
                    required
                    minLength={10}
                    maxLength={2000}
                    value={values.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder={
                      values.topic === 'Traveller feedback'
                        ? 'Your car, route, and what stood out during your rental'
                        : 'Share your travel dates, destination, or question'
                    }
                  />
                </FormField>
              </FieldGroup>
              <PreviewNote>
                Review your message first, then choose Open WhatsApp to share it
                with U Drive. Nothing is sent automatically.
              </PreviewNote>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button
                className="action primary"
                type="submit"
                disabled={!ready}
              >
                Prepare enquiry <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
        <aside className="contact-aside">
          <Image
            src="/images/drive-kathmandu.webp"
            alt="A silver crossover on a Kathmandu street"
            width={508}
            height={508}
          />
          <div>
            <p className="eyebrow">OUR HOME BASE</p>
            <h3>Kathmandu, Nepal.</h3>
            <p>
              Local journeys and Nepal-wide travel, with pickup or delivery
              arranged for your route.
            </p>
            <span>
              <MapPin size={16} />
              Kathmandu pickup
            </span>
            <span>
              <MountainSnow size={16} />
              Nepal-wide service
            </span>
            <a
              className="footer-whatsapp"
              href={whatsAppContact.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/whatsapp.svg" alt="" width={16} height={16} />
              {business.whatsappNumber}
            </a>
            <Link href="/faq" className="text-link">
              Browse rental FAQs <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </section>
  )
}
