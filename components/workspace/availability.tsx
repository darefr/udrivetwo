'use client'
import { Action, Editor, Empty, Records, type Item } from './controls'
import { addRentalDays, daysBetween, todayInNepal } from '@/lib/trip'
export function Availability({
  data,
  from,
  to,
  select,
  write,
}: {
  data: Item
  from: string
  to: string
  select: (id: string) => void
  write: (id: string, body: Item, method?: string) => Promise<unknown>
}) {
  const vehicle = data.vehicles.find((v: Item) => v.slug === data.vehicle)
  if (!vehicle) return <Empty>Add a vehicle to manage its calendar.</Empty>
  const dates = Array.from(
    { length: Math.min(366, daysBetween(from, to) + 1) },
    (_, i) => addRentalDays(from, i),
  )
  const occupied = new Map(data.days.map((d: Item) => [d.day, d]))
  return (
    <>
      <label className="desk-control">
        Vehicle calendar
        <select
          className="form-select"
          value={data.vehicle}
          onChange={(e) => select(e.target.value)}
        >
          {data.vehicles.map((v: Item) => (
            <option key={v.slug} value={v.slug}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        <strong>{vehicle.name}:</strong>{' '}
        {vehicle.available
          ? 'Accepting rental requests'
          : 'Unavailable for new requests'}
        . The return date is free for the next rental.
      </p>
      <Action
        run={() =>
          write(vehicle.slug, { available: !vehicle.available }, 'PATCH')
        }
      >
        {vehicle.available ? 'Mark unavailable' : 'Mark available'}
      </Action>
      <div className="desk-days" aria-label="Vehicle calendar">
        {dates.map((day) => {
          const record = occupied.get(day) as Item | undefined
          return (
            <div key={day} data-busy={!!record || !vehicle.available}>
              <time dateTime={day}>
                {new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: 'UTC',
                })}
              </time>
              <small>
                {record?.reason || (!vehicle.available ? 'Off fleet' : 'Free')}
              </small>
            </div>
          )
        })}
      </div>
      <Editor
        title="Block rental dates"
        fields={[
          { name: 'start', label: 'Block from', type: 'date' },
          { name: 'end', label: 'Available again on', type: 'date' },
          { name: 'reason', label: 'Reason' },
        ]}
        values={{
          start: todayInNepal(),
          end: addRentalDays(todayInNepal(), 1),
        }}
        submit="Block dates"
        onSave={(v) => write('', { ...v, vehicle: vehicle.slug })}
      />
      <h3>Manual blocks</h3>
      {data.rows.length ? (
        data.rows.map((b: Item) => (
          <div className="desk-entry" key={b.id}>
            <strong>{b.reason}</strong>
            <p>
              {b.starts_on} to {b.ends_on} (exclusive)
            </p>
            <Action
              run={() => write(b.id, {}, 'DELETE')}
              confirm="Release this date block?"
            >
              Unblock dates
            </Action>
          </div>
        ))
      ) : (
        <Empty>No manual blocks in this period.</Empty>
      )}
      <h3>Occupied rental days</h3>
      <Records
        rows={data.days.filter((d: Item) => d.booking_id)}
        columns={[
          ['day', 'Date'],
          ['booking_id', 'Booking'],
        ]}
      />
    </>
  )
}
