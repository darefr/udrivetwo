'use client'

import { useState } from 'react'
import { destinations } from '@/lib/rental-data'
import { DestinationCard } from './destination-card'

import { useInteractive } from '@/lib/use-interactive'

export function DestinationBrowser() {
  const ready = useInteractive()
  const [filter, setFilter] = useState('All destinations')
  const filtered = destinations.filter(
    (d) => filter === 'All destinations' || d.category === filter,
  )
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE NEPAL</p>
            <h2>Choose your next stop.</h2>
          </div>
        </div>
        <div
          className="filter-tabs"
          role="group"
          aria-label="Filter destinations"
        >
          {[
            'All destinations',
            ...new Set(destinations.map((d) => d.category)),
          ].map((f) => (
            <button
              key={f}
              disabled={!ready}
              aria-pressed={f === filter}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="roadbook-grid" aria-live="polite">
          {filtered.map((d) => (
            <DestinationCard destination={d} key={d.slug} />
          ))}
        </div>
      </div>
    </section>
  )
}
