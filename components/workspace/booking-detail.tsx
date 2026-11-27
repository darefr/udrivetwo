'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  Editor,
  Records,
  Action,
  formatDate,
  type Item,
  type Spec,
} from './controls'
import { api, useRentalPlatform } from '../platform-provider'
import { money, modeLabel } from '@/lib/rental-data'
import { transitions, type Status } from '@/lib/platform/contracts'
export function RentalDetail({
  b,
  staff = false,
  refresh,
  pay = false,
}: {
  b: Item
  staff?: boolean
  refresh: () => Promise<unknown>
  pay?: boolean
}) {
  const { fleet, pickupLocations, whatsapp } = useRentalPlatform()
  const [edit, setEdit] = useState(false)
  const endpoint = `${staff ? 'admin' : 'account'}/bookings/${b.id}`
  const save = async (d: Item) => {
    const r = await api(endpoint, { version: b.version, ...d }, 'PATCH')
    await refresh()
    setEdit(false)
    return r
  }
  const options = transitions[b.status as Status] || []
  const fields: Spec[] = [
    {
      name: 'vehicle',
      label: 'Vehicle',
      type: 'select',
      options: fleet.map((v) => [v.slug, v.name]),
    },
    {
      name: 'mode',
      label: 'Rental type',
      type: 'select',
      options: [
        ['self-drive', 'Self Drive'],
        ['with-driver', 'With Driver'],
      ],
    },
    {
      name: 'pickup',
      label: 'Pickup location',
      type: 'select',
      options: pickupLocations,
    },
    { name: 'start', label: 'Pickup date', type: 'date' },
    { name: 'end', label: 'Return date', type: 'date' },
    {
      name: 'delivery',
      label: 'Handover',
      type: 'select',
      options: ['pickup', 'delivery'],
    },
    { name: 'address', label: 'Delivery address', optional: true },
    { name: 'returnPoint', label: 'Return location', optional: true },
    { name: 'name', label: 'Customer name' },
    { name: 'email', label: 'Contact email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'offer', label: 'Offer code', optional: true },
    {
      name: 'message',
      label: 'Customer message',
      type: 'long',
      optional: true,
    },
  ]
  return (
    <article className="desk-entry">
      <p className="eyebrow">RENTAL REQUEST · {b.id}</p>
      <h3>
        {b.vehicle} <span className="desk-badge">{b.status}</span>
      </h3>
      <dl className="review-details">
        {Object.entries({
          'Rental type': modeLabel(b.mode),
          'Pickup date': b.start,
          'Return date': b.end,
          Pickup: b.pickup,
          Handover: b.delivery,
          'Delivery address': b.address,
          'Return location': b.return_point || 'Same as pickup',
          Customer: b.contact_name,
          'Contact email': b.contact_email,
          Phone: b.contact_phone,
          'Trip notes': b.message,
          'Daily rate': money(b.quote.rate, b.currency),
          'Rental duration': `${b.quote.days} days`,
          'Delivery & additional charges': money(
            b.quote.additional + b.quote.delivery,
            b.currency,
          ),
          Discount: money(b.quote.discount, b.currency),
          'Estimated total': money(b.total, b.currency),
          'Payment status': b.payment_status,
          Requested: formatDate(b.created_at),
        })
          .filter(([, v]) => !!v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <div className="action-row">
        <a
          className="text-link"
          href={`https://wa.me/${(staff ? b.contact_phone : whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(`Regarding U Drive booking ${b.id}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          {staff ? 'WhatsApp customer' : 'Contact rental desk'}
        </a>
        {staff && (
          <a
            className="text-link"
            href={`mailto:${b.contact_email}?subject=${encodeURIComponent(b.id)}`}
          >
            Email customer
          </a>
        )}
        {!staff && (
          <Link
            className="text-link"
            href={`/account?tab=support&booking=${b.id}`}
          >
            Message about this rental
          </Link>
        )}
      </div>
      <h4>Booking history</h4>
      <Records
        rows={b.history || []}
        columns={[
          ['event', 'Update'],
          ['status', 'Status'],
          ['created_at', 'Date'],
        ]}
      />
      {staff ? (
        <>
          <Editor
            key={`${b.id}-${b.version}`}
            title="Desk actions"
            fields={[
              {
                name: 'status',
                label: 'Booking status',
                type: 'select',
                options: [b.status, ...options],
              },
              {
                name: 'note',
                label: 'Internal note — not visible to customer',
                type: 'long',
                optional: true,
                max: 2000,
              },
            ]}
            values={{ status: b.status, note: b.internal_note }}
            onSave={save}
          />
          {['PENDING', 'CONFIRMED'].includes(b.status) && (
            <button
              className="text-link"
              type="button"
              onClick={() => setEdit(!edit)}
            >
              {edit ? 'Close editor' : 'Modify rental details'}
            </button>
          )}
          {edit && (
            <Editor
              title="Modify rental"
              fields={fields}
              values={{
                ...b,
                vehicle: b.vehicle_id,
                name: b.contact_name,
                email: b.contact_email,
                phone: b.contact_phone,
                offer: b.offer_code,
                returnPoint: b.return_point,
              }}
              onSave={(r) => save({ rental: r })}
            />
          )}
        </>
      ) : (
        <>
          {options.includes('CANCELLED') && (
            <Action
              run={() => save({ status: 'CANCELLED' })}
              confirm="Cancel this rental request and release its dates?"
            >
              Cancel booking
            </Action>
          )}
          {pay &&
            b.status === 'CONFIRMED' &&
            b.payment_status === 'PENDING' && (
              <Action
                run={async () => {
                  const { url } = await api(`account/checkout/${b.id}`, {})
                  window.location.assign(url)
                }}
              >
                Open secure checkout
              </Action>
            )}
          {b.status === 'COMPLETED' && (
            <Editor
              title="Review your rental"
              fields={[
                {
                  name: 'rating',
                  label: 'Rating (out of five)',
                  type: 'select',
                  options: ['5', '4', '3', '2', '1'],
                },
                { name: 'body', label: 'Your review', type: 'long', max: 2000 },
              ]}
              onSave={(d) => api('account/reviews', { ...d, booking: b.id })}
              submit="Submit review"
            />
          )}
        </>
      )}
    </article>
  )
}
