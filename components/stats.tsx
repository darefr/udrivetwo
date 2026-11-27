'use client'

import { useEffect, useRef, useState } from 'react'
import { fleet, rentalModes } from '@/lib/rental-data'

function Count({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (
      !ref.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    let frame = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        const start = performance.now()
        const draw = (now: number) => {
          const t = Math.min(1, (now - start) / 550)
          setShown(Math.round(value * t))
          if (t < 1) frame = requestAnimationFrame(draw)
        }
        frame = requestAnimationFrame(draw)
      },
      { threshold: 0.7 },
    )
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value])
  return (
    <span ref={ref} aria-label={String(value)}>
      {String(shown).padStart(2, '0')}
    </span>
  )
}
export function Stats() {
  return (
    <div className="stats">
      <div>
        <strong>
          <Count value={fleet.length} />
        </strong>
        <span>Fleet vehicles</span>
      </div>
      <div>
        <strong>
          <Count value={rentalModes.length} />
        </strong>
        <span>Rental options</span>
      </div>
      <div>
        <strong className="coverage-stat">Nepal-wide</strong>
        <span>Service coverage</span>
      </div>
    </div>
  )
}
