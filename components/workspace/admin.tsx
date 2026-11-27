'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { api, useRentalPlatform } from '../platform-provider'
import { rights, statuses, type Section } from '@/lib/platform/contracts'
import { todayInNepal, addRentalDays, validDate } from '@/lib/trip'
import {
  Workspace,
  Records,
  Metrics,
  Empty,
  Action,
  Editor,
  Notices,
  Conversation,
  labelize,
  type Item,
} from './controls'
import { FleetEditor, LocationEditor, SimpleEditor } from './resource-editor'
import { RentalDetail } from './booking-detail'
import { Availability } from './availability'
const columns: Partial<Record<Section, [string, string][]>> = {
  bookings: [
    ['id', 'Reference'],
    ['contact_name', 'Customer'],
    ['vehicle', 'Vehicle'],
    ['start', 'Pickup'],
    ['status', 'Status'],
  ],
  vehicles: [
    ['name', 'Vehicle'],
    ['dailyRate', 'Daily rate'],
    ['active', 'Published'],
    ['available', 'Available'],
  ],
  pricing: [
    ['name', 'Vehicle'],
    ['dailyRate', 'Base rate'],
    ['self_rate', 'Self Drive'],
    ['driver_rate', 'With Driver'],
  ],
  customers: [
    ['name', 'Customer'],
    ['email', 'Email'],
    ['enabled', 'Enabled'],
  ],
  payments: [
    ['booking_id', 'Booking'],
    ['status', 'Payment status'],
    ['currency', 'Currency'],
    ['due', 'Estimate'],
    ['received', 'Verified received'],
  ],
  reviews: [
    ['customer', 'Customer'],
    ['vehicle', 'Vehicle'],
    ['rating', 'Rating'],
    ['state', 'Moderation'],
  ],
  locations: [
    ['name', 'Location'],
    ['active', 'Active'],
    ['sort_order', 'Order'],
  ],
  offers: [
    ['code', 'Code'],
    ['percent', 'Discount %'],
    ['ends_on', 'Valid through'],
    ['active', 'Enabled'],
  ],
  users: [
    ['name', 'User'],
    ['email', 'Email'],
    ['role', 'Role'],
    ['enabled', 'Enabled'],
  ],
  activity: [
    ['created_at', 'Date'],
    ['actor', 'Actor'],
    ['action', 'Action'],
    ['entity', 'Record'],
    ['entity_id', 'Reference'],
  ],
}
export function AdminDesk() {
  const { user } = useRentalPlatform()
  const router = useRouter(),
    p = useSearchParams()
  const allowed = user ? rights[user.role] : []
  const tab = allowed.includes(p.get('tab') as Section)
    ? (p.get('tab') as Section)
    : 'overview'
  const id = p.get('id') || '',
    from = validDate(p.get('from') || '')
      ? p.get('from')!
      : todayInNepal().slice(0, 7) + '-01',
    to = p.get('to') || addRentalDays(from, 30)
  const [search, setSearch] = useState(p.get('search') || '')
  const navigate = (change: Record<string, string>) => {
    const q = new URLSearchParams(p.toString())
    Object.entries(change).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)))
    router.push('/admin?' + q.toString(), { scroll: false })
  }
  const key = `admin/${tab}?${new URLSearchParams({ ...Object.fromEntries(p), from, to })}`
  const { data, error, mutate } = useSWR<Item>(key, (s: string) => api(s), {
    refreshInterval: 15000,
    shouldRetryOnError: false,
  })
  if (!user) return null
  const rows: Item[] = data?.rows || []
  const row =
    data?.detail || rows.find((r) => (r.id || r.slug || r.code) === id)
  const write = async (target: string, body: Item, method = 'POST') => {
    const r = await api(
      `admin/${tab}${target ? '/' + encodeURIComponent(target) : ''}`,
      body,
      method,
    )
    await mutate()
    router.refresh()
    return r
  }
  const save = async (v: Item) => {
    const r = await write(
      id === 'new' ? '' : id,
      v,
      id && id !== 'new' ? 'PATCH' : 'POST',
    )
    if (id === 'new') navigate({ id: r.id })
    return r
  }
  const open = (r: Item) => navigate({ id: r.id || r.slug || r.code })
  const back = (
    <Link href={`/admin?tab=${tab}`} className="text-link">
      Back to list
    </Link>
  )
  const showTable = !!columns[tab] && !id
  const listPage = Number(p.get('page')) || 0
  return (
    <Workspace admin tab={tab} tabs={allowed} name={user.name}>
      {!id &&
        [
          'bookings',
          'customers',
          'vehicles',
          'pricing',
          'payments',
          'users',
        ].includes(tab) && (
          <form
            className="desk-toolbar"
            onSubmit={(e) => {
              e.preventDefault()
              navigate({ search, page: '' })
            }}
          >
            <label>
              Search
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === 'bookings'
                    ? 'Reference, name, email or vehicle'
                    : 'Search records'
                }
              />
            </label>
            {tab === 'bookings' && (
              <label>
                Status
                <select
                  value={p.get('status') || ''}
                  onChange={(e) =>
                    navigate({ status: e.target.value, page: '' })
                  }
                >
                  <option value="">All statuses</option>
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="action outline">Search</button>
          </form>
        )}
      {['reports', 'availability'].includes(tab) && (
        <form
          key={`${tab}-${from}-${to}`}
          className="desk-toolbar"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            navigate({ from: String(f.get('from')), to: String(f.get('to')) })
          }}
        >
          <label>
            From
            <input type="date" name="from" required defaultValue={from} />
          </label>
          <label>
            Through
            <input type="date" name="to" required defaultValue={to} />
          </label>
          <button className="action outline">Apply dates</button>
        </form>
      )}
      {!id && ['vehicles', 'locations', 'offers'].includes(tab) && (
        <button
          className="action primary"
          onClick={() => navigate({ id: 'new' })}
        >
          Add{' '}
          {tab === 'vehicles'
            ? 'vehicle'
            : tab === 'locations'
              ? 'location'
              : 'offer'}
        </button>
      )}
      {error ? (
        <p role="alert" className="form-error">
          {error.message}
        </p>
      ) : !data ? (
        <p aria-live="polite">Loading desk records…</p>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              <Metrics values={data.metrics} />
              {allowed.includes('bookings') && (
                <>
                  <h3>Recent bookings</h3>
                  <Records
                    rows={data.recentBookings}
                    columns={columns.bookings!}
                    onOpen={(r) => navigate({ tab: 'bookings', id: r.id })}
                  />
                </>
              )}
              {allowed.includes('customers') && (
                <>
                  <h3>Recent customers</h3>
                  <Records
                    rows={data.recentCustomers}
                    columns={[
                      ['name', 'Name'],
                      ['email', 'Email'],
                      ['created_at', 'Joined'],
                    ]}
                    onOpen={(r) => navigate({ tab: 'customers', id: r.id })}
                  />
                </>
              )}
              <h3>Recent notifications</h3>
              <Records
                rows={data.recentNotifications}
                columns={[
                  ['title', 'Update'],
                  ['created_at', 'Date'],
                ]}
              />
            </>
          )}
          {showTable && (
            <>
              <Records
                rows={rows}
                columns={columns[tab]!}
                onOpen={tab === 'activity' ? undefined : open}
              />
              {[
                'bookings',
                'customers',
                'payments',
                'users',
                'activity',
              ].includes(tab) && (
                <div className="action-row">
                  {listPage > 0 && (
                    <button
                      className="text-link"
                      onClick={() => navigate({ page: String(listPage - 1) })}
                    >
                      Previous page
                    </button>
                  )}
                  {rows.length === 50 && (
                    <button
                      className="text-link"
                      onClick={() => navigate({ page: String(listPage + 1) })}
                    >
                      Next page
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {id && tab !== 'messages' && back}
          {tab === 'bookings' && row && (
            <RentalDetail key={row.id} b={row} staff refresh={mutate} />
          )}{' '}
          {id &&
            ['vehicles', 'pricing'].includes(tab) &&
            (row || id === 'new') && (
              <FleetEditor
                key={id + tab}
                row={row}
                areas={data.areas}
                save={save}
                priceOnly={tab === 'pricing'}
                archive={() => write(id, {}, 'DELETE')}
              />
            )}{' '}
          {tab === 'payments' && row && (
            <article className="desk-entry">
              <h3>
                {row.booking_id} · {row.status}
              </h3>
              <p>
                Estimated: {row.currency} {row.due}. Recorded receipts:{' '}
                {row.currency} {row.received}.
              </p>
              {!row.provider || row.provider === 'desk' ? (
                <Editor
                  title="Record an existing external receipt"
                  fields={[
                    {
                      name: 'direction',
                      label: 'Entry type',
                      type: 'select',
                      options: ['RECEIPT', 'REFUND'],
                    },
                    {
                      name: 'method',
                      label: 'Settlement method',
                      type: 'select',
                      options: ['Bank transfer', 'Cash'],
                    },
                    {
                      name: 'amount',
                      label: `Amount in ${row.currency}`,
                      type: 'number',
                      min: 1,
                    },
                    {
                      name: 'reference',
                      label: 'Unique bank or receipt reference',
                    },
                    {
                      name: 'confirmed',
                      label:
                        'I verified this transfer or cash receipt outside the website. This entry does not move money.',
                      type: 'check',
                    },
                  ]}
                  submit="Record verified receipt"
                  onSave={(d) => write(row.id, d)}
                />
              ) : (
                <p>
                  Online payment status is set only by a verified provider
                  lookup.
                </p>
              )}
            </article>
          )}
          {tab === 'customers' && row && (
            <article className="desk-entry">
              <h3>{row.name}</h3>
              <p>
                {row.email} · {row.phone || 'No phone on file'}
              </p>
              <div className="action-row">
                <a href={`mailto:${row.email}`} className="text-link">
                  Email customer
                </a>
                {row.phone && (
                  <a
                    href={`https://wa.me/${row.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    Open WhatsApp
                  </a>
                )}
              </div>
              <h4>Rental history</h4>
              <Records
                rows={row.bookings}
                columns={[
                  ['vehicle', 'Vehicle'],
                  ['start', 'Pickup'],
                  ['status', 'Status'],
                ]}
                onOpen={
                  allowed.includes('bookings')
                    ? (r) => navigate({ tab: 'bookings', id: r.id })
                    : undefined
                }
              />
              <Editor
                title="Customer management"
                fields={[
                  {
                    name: 'note',
                    label: 'Internal customer notes',
                    type: 'long',
                    optional: true,
                  },
                  ...(allowed.includes('bookings')
                    ? [
                        {
                          name: 'enabled',
                          label: 'Account enabled',
                          type: 'check' as const,
                        },
                      ]
                    : []),
                ]}
                values={row}
                onSave={(v) => save({ enabled: row.enabled, ...v })}
              />
            </article>
          )}
          {tab === 'availability' && (
            <Availability
              data={data}
              from={from}
              to={to}
              select={(vehicle) => navigate({ vehicle })}
              write={write}
            />
          )}{' '}
          {tab === 'locations' && id && (
            <LocationEditor
              key={id}
              row={row}
              save={save}
              archive={() => write(id, {}, 'DELETE')}
            />
          )}{' '}
          {['offers', 'users', 'reviews'].includes(tab) &&
            id &&
            (row || id === 'new') && (
              <SimpleEditor
                key={id + tab}
                area={tab}
                row={row || {}}
                save={save}
              />
            )}{' '}
          {tab === 'settings' && (
            <SimpleEditor
              area="settings"
              row={data.settings}
              save={(v) => write('', v, 'PATCH')}
            />
          )}{' '}
          {tab === 'reports' && (
            <>
              <p>
                Estimates include confirmed, active and completed rentals. They
                are not payments received.
              </p>
              {Object.entries(data.groups as Record<string, Item[]>).map(
                ([name, items]) => (
                  <section className="desk-entry" key={name}>
                    <h3>{name}</h3>
                    <Records
                      rows={items}
                      columns={Object.keys(items[0] || { label: '' }).map(
                        (k) => [k, labelize(k)],
                      )}
                    />
                  </section>
                ),
              )}
            </>
          )}{' '}
          {tab === 'notifications' && (
            <>
              <Notices rows={rows} read={(nid) => write(nid, {})} />
              {allowed.includes('settings') && (
                <>
                  <h3>Delivery queue</h3>
                  <p>
                    DEV_CAPTURED means saved to the private development mailbox,
                    not delivered.
                  </p>
                  <Records
                    rows={data.deliveries}
                    columns={[
                      ['channel', 'Channel'],
                      ['kind', 'Event'],
                      ['status', 'Delivery'],
                      ['attempts', 'Attempts'],
                    ]}
                  />
                  {data.deliveries
                    .filter((j: Item) => ['FAILED', 'RETRY'].includes(j.status))
                    .map((j: Item) => (
                      <Action
                        key={j.id}
                        run={() => write('retry', { job: j.id })}
                      >
                        Retry {j.channel} · {j.id.slice(0, 8)}
                      </Action>
                    ))}
                </>
              )}
            </>
          )}
          {tab === 'messages' &&
            (rows.length ? (
              <>
                {id && back}
                {(id ? rows.filter((r) => r.id === id) : rows).map((t) => (
                  <Conversation
                    key={t.id}
                    item={t}
                    onSave={(v) => write(t.id, v)}
                  />
                ))}
              </>
            ) : (
              <Empty>No support messages yet.</Empty>
            ))}
        </>
      )}
    </Workspace>
  )
}
