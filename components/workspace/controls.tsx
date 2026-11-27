'use client'
import { useId, useState, type ReactNode, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Inbox, LogOut, MapPin } from 'lucide-react'
import { FormField } from '../form-parts'
import { FieldGroup } from '../ui/field'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { api } from '../platform-provider'
export type Item = Record<string, any>
export const labels: Record<string, string> = {
  overview: 'Overview',
  bookings: 'My bookings',
  upcoming: 'Upcoming rentals',
  active: 'Active rentals',
  history: 'Booking history',
  notifications: 'Notifications',
  profile: 'Profile',
  support: 'Support',
  vehicles: 'Vehicles',
  customers: 'Customers',
  availability: 'Availability',
  pricing: 'Pricing',
  payments: 'Payments',
  reviews: 'Reviews',
  locations: 'Locations',
  offers: 'Offers',
  messages: 'Communication',
  reports: 'Reports',
  settings: 'Settings',
  users: 'Staff & access',
  activity: 'Activity log',
}
export function Workspace({
  admin = false,
  tab,
  tabs,
  name,
  children,
}: {
  admin?: boolean
  tab: string
  tabs: readonly string[]
  name: string
  children: ReactNode
}) {
  const [error, setError] = useState('')
  const router = useRouter()
  return (
    <section className="wrap desk-workspace">
      <header className="desk-mast">
        <div>
          <p className="eyebrow">
            {admin ? 'U DRIVE · OPERATIONS' : 'YOUR U DRIVE ACCOUNT'}
          </p>
          <h1>{admin ? 'Rental desk.' : `Welcome, ${name.split(' ')[0]}.`}</h1>
          <p>
            {admin
              ? 'Bookings, fleet and customer service in one place.'
              : 'Your rentals, messages and travel details in one place.'}
          </p>
        </div>
        <span className="inline-icon">
          <MapPin size={16} />
          Kathmandu, Nepal
        </span>
      </header>
      <div className="desk-layout">
        <aside className="desk-navigation">
          <label className="desk-mobile-menu">
            <span>Workspace section</span>
            <select
              className="form-select"
              value={tab}
              onChange={(e) =>
                router.push(
                  `${admin ? '/admin' : '/account'}?tab=${e.target.value}`,
                  { scroll: false },
                )
              }
            >
              {tabs.map((t) => (
                <option key={t} value={t}>
                  {admin && t === 'bookings' ? 'Bookings' : labels[t]}
                </option>
              ))}
            </select>
          </label>
          <nav aria-label={admin ? 'Administration' : 'Customer account'}>
            {tabs.map((t) => (
              <Link
                key={t}
                aria-current={tab === t ? 'page' : undefined}
                href={`${admin ? '/admin' : '/account'}?tab=${t}`}
              >
                {admin && t === 'bookings' ? 'Bookings' : labels[t] || t}
              </Link>
            ))}
          </nav>
          <button
            className="text-link"
            onClick={async () => {
              try {
                await api('auth/logout', {})
                window.location.assign('/sign-in')
              } catch (e) {
                setError((e as Error).message)
              }
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
          {error && <p role="alert">{error}</p>}
        </aside>
        <div className="desk-panel">
          <h2>{admin && tab === 'bookings' ? 'Bookings' : labels[tab]}</h2>
          {children}
        </div>
      </div>
    </section>
  )
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="desk-empty">
      <Inbox size={22} />
      <p>{children}</p>
    </div>
  )
}
export function Metrics({
  values,
}: {
  values: Record<string, string | number>
}) {
  return (
    <dl className="desk-metrics">
      {Object.entries(values).map(([key, v]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
export const formatDate = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kathmandu',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'
export const labelize = (s: string) =>
  s.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
export function Records({
  rows,
  columns,
  onOpen,
  empty = 'No records match this view.',
}: {
  rows: Item[]
  columns: [string, string][]
  onOpen?: (r: Item) => void
  empty?: string
}) {
  if (!rows.length) return <Empty>{empty}</Empty>
  return (
    <div
      className="desk-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Records"
    >
      <table className="desk-table">
        <thead>
          <tr>
            {columns.map(([k, l]) => (
              <th key={k} scope="col">
                {l}
              </th>
            ))}
            {onOpen && (
              <th scope="col">
                <span className="sr-only">Details</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r.slug || r.code || i}>
              {columns.map(([k]) => (
                <td key={k}>
                  {k === 'status' || k === 'state' ? (
                    <span className="desk-badge">{r[k]}</span>
                  ) : k.endsWith('_at') ? (
                    formatDate(r[k])
                  ) : typeof r[k] === 'boolean' ? (
                    r[k] ? (
                      'Yes'
                    ) : (
                      'No'
                    )
                  ) : (
                    String(r[k] ?? '—')
                  )}
                </td>
              ))}
              {onOpen && (
                <td>
                  <button
                    type="button"
                    className="text-link"
                    aria-label={`Open ${r.name || r.id || r.code || r.slug}`}
                    onClick={() => onOpen(r)}
                  >
                    Open <ArrowUpRight size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
export type Spec = {
  name: string
  label: string
  type?:
    | 'text'
    | 'email'
    | 'tel'
    | 'number'
    | 'date'
    | 'password'
    | 'long'
    | 'select'
    | 'check'
    | 'list'
  options?: (string | [string, string])[]
  optional?: boolean
  readonly?: boolean
  min?: number
  max?: number
  hint?: string
}
export type Save = (values: Item) => Promise<unknown>
export function Editor({
  title,
  fields,
  values = {},
  submit = 'Save changes',
  onSave,
  children,
}: {
  title?: string
  fields: Spec[]
  values?: Item
  submit?: string
  onSave: Save
  children?: ReactNode
}) {
  const id = useId()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    const f = new FormData(e.currentTarget)
    const data: Item = {}
    for (const s of fields) {
      const raw = String(f.get(s.name) ?? '').trim()
      data[s.name] =
        s.type === 'check'
          ? f.has(s.name)
          : s.type === 'number'
            ? raw
              ? Number(raw)
              : null
            : s.type === 'list'
              ? raw
                  .split('\n')
                  .map((x) => x.trim())
                  .filter(Boolean)
              : s.type === 'password'
                ? String(f.get(s.name) ?? '')
                : raw
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = (await onSave(data)) as Item | undefined
      if (r?.redirect) {
        window.location.assign(r.redirect)
        return
      }
      setMessage(r?.message || 'Changes saved.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="desk-editor" method="post" onSubmit={send}>
      {title && <h3>{title}</h3>}
      <fieldset disabled={busy}>
        <FieldGroup className="desk-fields">
          {fields.map((s) => {
            const fid = `${id}-${s.name}`
            const props = {
              id: fid,
              name: s.name,
              required: !s.optional,
              readOnly: s.readonly,
              defaultValue: values[s.name] ?? '',
              min: s.min,
              max: s.max,
              autoComplete: s.type === 'password' ? 'new-password' : 'off',
            }
            if (s.type === 'check')
              return (
                <label className="account-check" key={fid}>
                  <input
                    type="checkbox"
                    name={s.name}
                    defaultChecked={!!values[s.name]}
                  />
                  {s.label}
                </label>
              )
            return (
              <FormField
                id={fid}
                label={s.label}
                key={fid}
                wide={s.type === 'long' || s.type === 'list'}
              >
                {s.type === 'select' ? (
                  <select {...props} className="form-select">
                    {s.optional && <option value="">None</option>}
                    {s.options?.map((o) => {
                      const [v, l] = Array.isArray(o) ? o : [o, o]
                      return (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      )
                    })}
                  </select>
                ) : s.type === 'long' || s.type === 'list' ? (
                  <Textarea
                    {...props}
                    maxLength={s.max || 4000}
                    defaultValue={
                      Array.isArray(values[s.name])
                        ? values[s.name].join('\n')
                        : (values[s.name] ?? '')
                    }
                  />
                ) : (
                  <Input
                    {...props}
                    type={s.type || 'text'}
                    maxLength={s.type === 'number' ? undefined : s.max || 254}
                  />
                )}{' '}
                {s.hint && <small>{s.hint}</small>}
              </FormField>
            )
          })}
        </FieldGroup>
        {children}
        <button className="action primary" type="submit">
          {busy ? 'Saving…' : submit}
        </button>
      </fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-response" role="status">
          {message}
        </p>
      )}
    </form>
  )
}
export function Action({
  children,
  run,
  confirm,
}: {
  children: ReactNode
  run: () => Promise<unknown>
  confirm?: string
}) {
  const [busy, setBusy] = useState(false),
    [msg, setMsg] = useState('')
  return (
    <div>
      <button
        type="button"
        className="action outline"
        disabled={busy}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return
          setBusy(true)
          try {
            const r = (await run()) as Item | undefined
            setMsg(r?.message || 'Updated.')
          } catch (e) {
            setMsg((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Working…' : children}
      </button>
      {msg && (
        <p role="status" className="step-help">
          {msg}
        </p>
      )}
    </div>
  )
}
export function Notices({
  rows,
  read,
}: {
  rows: Item[]
  read: (id: string) => Promise<unknown>
}) {
  return rows.length ? (
    <div className="desk-stack">
      {rows.map((n) => (
        <article className="desk-entry" key={n.id}>
          <p className="eyebrow">
            {n.read ? 'READ' : 'UNREAD'} · {formatDate(n.created_at)}
          </p>
          <h3>{n.title}</h3>
          <p className="desk-preserve">{n.body}</p>
          <div className="action-row">
            <Link className="text-link" href={n.link}>
              View details <ArrowUpRight size={14} />
            </Link>
            {!n.read && <Action run={() => read(n.id)}>Mark read</Action>}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <Empty>
      No notifications yet. Updates about your rentals will appear here.
    </Empty>
  )
}
export function Conversation({ item, onSave }: { item: Item; onSave: Save }) {
  return (
    <article className="desk-entry">
      <p className="eyebrow">
        {item.booking_id || 'SUPPORT ENQUIRY'} · {formatDate(item.created_at)}
      </p>
      <h3>{item.topic}</h3>
      <p>
        {item.name} · {item.email}
      </p>
      {item.conversation.map((m: Item, i: number) => (
        <div className="desk-message" key={i}>
          <strong>{m.staff ? 'Rental desk' : item.name}</strong>
          <p>{m.body}</p>
          <small>{formatDate(m.created_at)}</small>
        </div>
      ))}
      <Editor
        fields={[{ name: 'message', label: 'Reply', type: 'long', max: 2000 }]}
        onSave={onSave}
        submit="Send reply"
      />
    </article>
  )
}
