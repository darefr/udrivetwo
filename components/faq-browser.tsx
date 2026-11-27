'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { faqs } from '@/lib/rental-data'
import { FAQ, PageIntro } from './shared'

import { useInteractive } from '@/lib/use-interactive'

export function FAQPage() {
  const ready = useInteractive()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All questions')
  const items = faqs.filter(
    (f) =>
      (category === 'All questions' || f.category === category) &&
      `${f.question} ${f.answer}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  )
  return (
    <>
      <PageIntro
        current="FAQs"
        eyebrow="HELP CENTRE"
        title="A few useful answers."
        description="Rental options, daily rates, delivery, and the details that help you plan."
      />
      <section className="section">
        <div className="wrap faq-browser">
          <div className="faq-search">
            <Search size={18} />
            <input
              disabled={!ready}
              aria-label="Search frequently asked questions"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your question"
            />
            {search && (
              <button
                aria-label="Clear question search"
                onClick={() => setSearch('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="filter-tabs" aria-label="Question categories">
            {['All questions', 'Rentals', 'Coverage', 'Pricing', 'Booking'].map(
              (c) => (
                <button
                  key={c}
                  disabled={!ready}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ),
            )}
          </div>
          <div aria-live="polite">
            {items.length ? (
              <FAQ items={items} />
            ) : (
              <div className="empty-result">
                <h2>No matching questions</h2>
                <p>Try a different search or view all rental questions.</p>
                <button
                  className="action outline"
                  onClick={() => {
                    setCategory('All questions')
                    setSearch('')
                  }}
                >
                  Show all questions
                </button>
              </div>
            )}
          </div>
          <div className="faq-contact">
            <h3>Still planning your trip?</h3>
            <Link href="/contact" className="text-link">
              Contact U Drive
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
