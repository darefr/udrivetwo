'use client'
import { useState } from 'react'
import { Editor, Action, type Item, type Spec, type Save } from './controls'
import { roles } from '@/lib/platform/contracts'
import { todayInNepal, addRentalDays } from '@/lib/trip'
const choose = (name: string, label: string, options: string[]): Spec => ({
  name,
  label,
  type: 'select',
  options,
})
const flag = (name: string, label: string): Spec => ({
  name,
  label,
  type: 'check',
})
const number = (
  name: string,
  label: string,
  optional = false,
  max = 1000000,
): Spec => ({ name, label, type: 'number', optional, min: 0, max })
const rates = [
  number('daily_rate', 'Daily base rate'),
  number('self_rate', 'Self Drive daily rate (optional)', true),
  number('driver_rate', 'With Driver inclusive daily rate (optional)', true),
]
export function FleetEditor({
  row,
  areas,
  save,
  priceOnly = false,
  archive,
}: {
  row?: Item
  areas: Item[]
  save: Save
  priceOnly?: boolean
  archive: () => Promise<unknown>
}) {
  const [images, setImages] = useState<{ image: string; label: string }[]>(
    row?.gallery || [],
  )
  const [upload, setUpload] = useState(''),
    [busy, setBusy] = useState(false)
  const values = {
    ...row,
    slug: row?.slug || '',
    daily_rate: row?.dailyRate || '',
    active: row?.active ?? true,
    available: row?.available ?? true,
    sort_order: row?.sort_order ?? 0,
    doors: row?.doors ?? 5,
    seats: row?.seats ?? 5,
    self: row?.modes?.includes('self-drive') ?? true,
    chauffeur: row?.modes?.includes('with-driver') ?? true,
  }
  const fields: Spec[] = priceOnly
    ? rates
    : [
        { name: 'name', label: 'Vehicle name' },
        {
          name: 'slug',
          label: 'Vehicle URL identifier',
          readonly: !!row,
          hint: 'Lowercase letters, numbers and hyphens.',
        },
        { name: 'brand', label: 'Brand' },
        { name: 'model', label: 'Model' },
        choose('bodyType', 'Body type', ['SUV', 'Sedan', 'Hatchback']),
        choose('tier', 'Rental category', ['Budget', 'Standard', 'Premium']),
        {
          name: 'location',
          label: 'Base location',
          type: 'select',
          options: areas.map((a) => [a.slug, a.name]),
        },
        number('seats', 'Seats', false, 50),
        number('doors', 'Doors', false, 8),
        choose('transmission', 'Transmission', [
          'Automatic',
          'Manual',
          'Confirm variant',
        ]),
        choose('fuel', 'Fuel / powertrain', [
          'Electric',
          'Petrol',
          'Diesel',
          'Hybrid',
          'Confirm variant',
        ]),
        ...rates,
        { name: 'overview', label: 'Description', type: 'long' },
        {
          name: 'features',
          label: 'Features (one per line)',
          type: 'list',
          optional: true,
        },
        number('sort_order', 'Display order', false, 10000),
        flag('self', 'Offer Self Drive'),
        flag('chauffeur', 'Offer With Driver'),
        flag('active', 'Published in fleet'),
        flag('available', 'Accept requests'),
        flag('featured', 'Featured on homepage'),
        flag('popular', 'Popular vehicle'),
      ]
  return (
    <>
      <Editor
        title={
          priceOnly
            ? `Pricing · ${row?.name}`
            : row
              ? `Edit ${row.name}`
              : 'Add vehicle'
        }
        fields={fields}
        values={values}
        onSave={async (d) => {
          if (priceOnly) return save(d)
          if (busy) throw new Error('Wait for the image upload to finish.')
          if (!images.length) throw new Error('Add at least one vehicle image.')
          const { self, chauffeur, ...v } = d
          return save({
            ...v,
            features: v.features,
            modes: [
              ...(self ? ['self-drive'] : []),
              ...(chauffeur ? ['with-driver'] : []),
            ],
            gallery: images,
          })
        }}
      >
        {!priceOnly && (
          <section className="desk-stack" aria-label="Vehicle gallery">
            <h4>Vehicle gallery</h4>
            {images.map((img, i) => (
              <div key={img.image + i} className="desk-toolbar">
                <img src={img.image} alt="" width="84" height="60" />
                <label>
                  Image description
                  <input
                    required
                    maxLength={120}
                    value={img.label}
                    onChange={(e) =>
                      setImages((list) =>
                        list.map((x, n) =>
                          n === i ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setImages((list) => list.filter((_, n) => n !== i))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <label className="desk-control">
              Upload vehicle photo (JPEG, PNG or WebP, max 4 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || images.length >= 16}
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setBusy(true)
                  setUpload('Uploading…')
                  try {
                    if (f.size > 4194304)
                      throw new Error('Choose an image under 4 MB.')
                    const r = await fetch('/api/media', {
                      method: 'POST',
                      body: f,
                    })
                    const d = await r.json()
                    if (!r.ok) throw new Error(d.error)
                    setImages((list) => [
                      ...list,
                      { image: d.path, label: 'Vehicle photo' },
                    ])
                    setUpload(
                      'Uploaded. Save the vehicle to apply the gallery.',
                    )
                  } catch (err) {
                    setUpload((err as Error).message)
                  } finally {
                    setBusy(false)
                  }
                }}
              />
            </label>
            <p role="status">{upload}</p>
          </section>
        )}
      </Editor>
      {row && !priceOnly && row.active && (
        <Action
          run={archive}
          confirm="Unpublish this vehicle? Existing rental records will be kept."
        >
          Deactivate vehicle
        </Action>
      )}
    </>
  )
}
export function LocationEditor({
  row,
  save,
  archive,
}: {
  row?: Item
  save: Save
  archive: () => Promise<unknown>
}) {
  const [destination, setDestination] = useState(!!row?.details?.image)
  return (
    <>
      <label className="account-check">
        <input
          type="checkbox"
          checked={destination}
          onChange={(e) => setDestination(e.target.checked)}
        />
        Publish a destination card for this location
      </label>
      <Editor
        title={row ? 'Edit service location' : 'Add service location'}
        fields={[
          { name: 'name', label: 'Location name' },
          { name: 'slug', label: 'URL identifier', readonly: !!row },
          number('sort_order', 'Display order'),
          flag('active', 'Enabled for pickup'),
          ...(destination
            ? ([
                { name: 'category', label: 'Category' },
                { name: 'tagline', label: 'Card subtitle' },
                { name: 'description', label: 'Description', type: 'long' },
                {
                  name: 'image',
                  label: 'Image path',
                  hint: 'Use an existing /images/ asset or uploaded /api/media/ image.',
                },
                { name: 'imageAlt', label: 'Image description' },
                { name: 'stops', label: 'Stops (one per line)', type: 'list' },
                { name: 'advice', label: 'Travel advice', type: 'long' },
              ] as Spec[])
            : []),
        ]}
        values={{ active: true, sort_order: 0, ...row, ...row?.details }}
        onSave={(d) => {
          const { name, slug, sort_order, active, ...details } = d
          return save({
            name,
            slug,
            sort_order,
            active,
            details: destination ? details : null,
          })
        }}
      />
      {row?.active && (
        <Action
          run={archive}
          confirm="Remove this location from new rental requests?"
        >
          Deactivate location
        </Action>
      )}
    </>
  )
}
export function SimpleEditor({
  area,
  row,
  save,
}: {
  area: string
  row: Item
  save: Save
}) {
  const configs: Record<string, Spec[]> = {
    offers: [
      { name: 'code', label: 'Offer code', readonly: !!row.code },
      { name: 'description', label: 'Offer description' },
      number('percent', 'Percent off vehicle subtotal', false, 100),
      { name: 'starts_on', type: 'date', label: 'Valid from' },
      { name: 'ends_on', type: 'date', label: 'Valid through' },
      flag('active', 'Offer enabled'),
    ],
    reviews: [
      choose('state', 'Moderation status', [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'HIDDEN',
      ]),
      { name: 'body', type: 'long', label: 'Review text' },
      flag('featured', 'Feature this review'),
    ],
    users: [
      choose('role', 'Access role', [...roles]),
      flag('enabled', 'Account enabled'),
    ],
    settings: [
      { name: 'company', label: 'Company name' },
      {
        name: 'email',
        label: 'Desk notification email',
        type: 'email',
        optional: true,
      },
      { name: 'whatsapp', label: 'WhatsApp number', type: 'tel' },
      { name: 'hours', label: 'Business hours' },
      { name: 'currency', label: 'Default currency (ISO code)' },
      number('deliveryFee', 'Delivery fee'),
      number('extraFee', 'Additional charge per rental'),
      number('maxDays', 'Maximum rental days', false, 365),
      number('holdHours', 'Pending request hold (hours)', false, 336),
      { name: 'policies', label: 'Rental policies', type: 'long' },
      { name: 'cancellation', label: 'Cancellation policy', type: 'long' },
      flag('emailEnabled', 'Email booking notifications'),
      flag('whatsappEnabled', 'WhatsApp booking notifications'),
      flag('assistantEnabled', 'Enable rental assistant'),
    ],
  }
  return (
    <Editor
      title={
        area === 'settings'
          ? 'Business configuration'
          : row.name || row.code || 'Record details'
      }
      fields={configs[area]}
      values={{
        active: true,
        starts_on: todayInNepal(),
        ends_on: addRentalDays(todayInNepal(), 30),
        ...row,
      }}
      onSave={save}
    />
  )
}
