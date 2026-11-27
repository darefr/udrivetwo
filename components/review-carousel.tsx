'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
import {
  demoReviews,
  modeLabel,
  rentalModes,
  type RentalMode,
  type Review,
} from '@/lib/rental-data'
import { CardRail } from './card-rail'
import { useInteractive } from '@/lib/use-interactive'

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article
      className="review-card"
      aria-label={`Illustrative traveller story from ${review.name}`}
    >
      <div className="review-top">
        <span
          className="stars"
          role="img"
          aria-label={`${review.rating} out of 5 stars, illustrative rating`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={14}
              aria-hidden="true"
              fill={i < review.rating ? 'currentColor' : 'none'}
            />
          ))}
        </span>
        <span className="sample-tag">Sample story</span>
      </div>
      <blockquote>{`“${review.text}”`}</blockquote>
      <div className="review-author">
        <span className="review-avatar" aria-hidden="true">
          {review.avatar ? (
            <Image src={review.avatar} alt="" width={40} height={40} />
          ) : (
            review.name
              .split(' ')
              .map((part) => part[0])
              .join('')
          )}
        </span>
        <div>
          <strong>{review.name}</strong>
          <p>
            {modeLabel(review.rentalType)}
            <span>·</span>
            {review.vehicle}
          </p>
        </div>
      </div>
    </article>
  )
}

export function ReviewCarousel({
  standalone = false,
}: {
  standalone?: boolean
}) {
  const [filter, setFilter] = useState<'all' | RentalMode>('all')
  const ready = useInteractive()
  const reviews = demoReviews.filter(
    (r) => filter === 'all' || r.rentalType === filter,
  )
  return (
    <section className="section review-section" aria-label="Traveller stories">
      <div className="wrap">
        <CardRail
          kind="review"
          label="Traveller story carousel"
          resetKey={filter}
          heading={{
            eyebrow: 'TRAVELLER NOTES',
            title: standalone
              ? 'A closer look at the experience.'
              : 'From the passenger seat.',
            description:
              'Illustrative rental stories, not verified customer reviews.',
            href: standalone ? undefined : '/reviews',
            linkText: 'All reviews',
          }}
          filters={
            standalone && (
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter stories by rental type"
              >
                {[
                  { value: 'all' as const, label: 'All stories' },
                  ...rentalModes,
                ].map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    disabled={!ready}
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )
          }
        >
          {reviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </CardRail>
      </div>
    </section>
  )
}
