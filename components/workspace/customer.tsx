'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { api, useRentalPlatform } from '../platform-provider'
import {
  Workspace,
  Editor,
  Records,
  Metrics,
  Notices,
  Conversation,
  Action,
  Empty,
  type Item,
} from './controls'
import { RentalDetail } from './booking-detail'
import { todayInNepal } from '@/lib/trip'
const tabs = [
  'overview',
  'bookings',
  'upcoming',
  'active',
  'history',
  'notifications',
  'profile',
  'support',
]
export function CustomerDesk({
  claim,
  checkout,
}: {
  claim: boolean
  checkout: boolean
}) {
  const { user, whatsapp } = useRentalPlatform()
  const router = useRouter(),
    params = useSearchParams()
  const tab = tabs.includes(params.get('tab') || '')
    ? params.get('tab')!
    : 'overview'
  const id = params.get('id'),
    status = params.get('status') || '',
    page = Math.max(0, Number(params.get('page')) || 0)
  const isList = ['bookings', 'upcoming', 'active', 'history'].includes(tab)
  const key = isList
    ? `account/bookings${id ? '/' + encodeURIComponent(id) : '?' + new URLSearchParams({ status, page: String(page), view: tab === 'bookings' ? 'all' : tab })}`
    : `account/${tab === 'support' ? 'messages' : tab}`
  const { data, error, mutate } = useSWR<Item | Item[]>(
    key,
    (k: string) => api(k),
    { refreshInterval: 15000, shouldRetryOnError: false },
  )
  if (!user) return null
  const open = (record: Item) =>
    router.push(`/account?tab=bookings&id=${record.id}`)
  const run = async (path: string, body: Item) => {
    const r = await api(path, body)
    await mutate()
    router.refresh()
    return r
  }
  const list = Array.isArray(data) ? data : []
  const d = (data || {}) as Item
  const rows = list.filter((r) =>
    tab === 'active'
      ? r.status === 'ACTIVE'
      : tab === 'upcoming'
        ? ['PENDING', 'CONFIRMED'].includes(r.status) &&
          r.start >= todayInNepal()
        : tab === 'history'
          ? ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(r.status)
          : true,
  )
  const columns: [string, string][] = [
    ['vehicle', 'Vehicle'],
    ['start', 'Pickup'],
    ['status', 'Status'],
  ]
  return (
    <Workspace tab={tab} tabs={tabs} name={user.name}>
      {claim && (
        <Action run={() => run('auth/claim', {})}>
          Link my recent guest request
        </Action>
      )}
      {user.role !== 'CUSTOMER' && (
        <Link className="text-link" href="/admin">
          Open rental desk
        </Link>
      )}
      {error ? (
        <p role="alert" className="form-error">
          {error.message}
        </p>
      ) : !data ? (
        <p aria-live="polite">Loading your account…</p>
      ) : (
        <>
          {tab === 'overview' && (
            <>
              <Metrics values={d.metrics} />
              <h3>Recent rentals</h3>
              <Records
                rows={d.bookings}
                columns={columns}
                onOpen={open}
                empty="You haven’t requested a rental yet."
              />
              <Link className="action primary" href="/fleet">
                Explore the fleet
              </Link>
            </>
          )}
          {isList &&
            (id ? (
              <>
                <Link className="text-link" href="/account?tab=bookings">
                  Back to my bookings
                </Link>
                <RentalDetail b={d} refresh={mutate} pay={checkout} />
              </>
            ) : (
              <>
                {tab === 'bookings' && (
                  <label className="desk-control">
                    Booking status
                    <select
                      className="form-select"
                      value={status}
                      onChange={(e) =>
                        router.push(
                          `/account?tab=bookings&status=${e.target.value}`,
                        )
                      }
                    >
                      <option value="">All statuses</option>
                      {[
                        'PENDING',
                        'CONFIRMED',
                        'ACTIVE',
                        'COMPLETED',
                        'CANCELLED',
                        'REJECTED',
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                )}
                <Records rows={rows} columns={columns} onOpen={open} />
                <div className="action-row">
                  {page > 0 && (
                    <Link
                      href={`/account?tab=${tab}&status=${status}&page=${page - 1}`}
                    >
                      Previous page
                    </Link>
                  )}
                  {list.length === 50 && (
                    <Link
                      href={`/account?tab=${tab}&status=${status}&page=${page + 1}`}
                    >
                      Next page
                    </Link>
                  )}
                </div>
              </>
            ))}
          {tab === 'notifications' && (
            <Notices
              rows={list}
              read={(id) => run(`account/notifications/${id}`, {})}
            />
          )}{' '}
          {tab === 'profile' && (
            <>
              <p>
                {user.email} ·{' '}
                {user.email_verified ? 'Verified email' : 'Email not verified'}
              </p>
              {!user.email_verified && (
                <Action run={() => run('auth/verify-again', {})}>
                  Send verification link
                </Action>
              )}
              <Editor
                title="Personal details"
                fields={[
                  { name: 'name', label: 'Full name' },
                  {
                    name: 'phone',
                    label: 'Phone number',
                    type: 'tel',
                    optional: true,
                  },
                ]}
                values={d}
                onSave={(v) => run('auth/profile', v)}
              />
              <Editor
                title="Change email address"
                fields={[
                  { name: 'email', label: 'New email address', type: 'email' },
                  {
                    name: 'current',
                    label: 'Current password',
                    type: 'password',
                  },
                ]}
                onSave={(v) => run('auth/email', v)}
                submit="Verify new email"
              />
              <Editor
                title="Change password"
                fields={[
                  {
                    name: 'current',
                    label: 'Current password',
                    type: 'password',
                  },
                  {
                    name: 'password',
                    label: 'New password (at least 10 characters)',
                    type: 'password',
                  },
                ]}
                onSave={(v) => run('auth/password', v)}
                submit="Change password"
              />
            </>
          )}
          {tab === 'support' && (
            <>
              <p>
                Ask about a booking, route, pickup or price. A rental desk reply
                will appear here.
              </p>
              <a
                className="text-link"
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                Open WhatsApp
              </a>
              <Editor
                title="Contact U Drive"
                fields={[
                  { name: 'topic', label: 'Subject' },
                  {
                    name: 'booking',
                    label: 'Booking reference',
                    optional: true,
                  },
                  {
                    name: 'message',
                    label: 'Your message',
                    type: 'long',
                    max: 2000,
                  },
                ]}
                values={{ booking: params.get('booking') || '' }}
                submit="Send message"
                onSave={(v) =>
                  run('account/messages', {
                    ...v,
                    booking: v.booking || undefined,
                    name: user.name,
                    email: user.email,
                  })
                }
              />
              <h3>Your conversations</h3>
              {list.length ? (
                list.map((t) => (
                  <Conversation
                    key={t.id}
                    item={t}
                    onSave={(v) => run(`account/messages/${t.id}`, v)}
                  />
                ))
              ) : (
                <Empty>No messages yet.</Empty>
              )}
            </>
          )}
        </>
      )}
    </Workspace>
  )
}
