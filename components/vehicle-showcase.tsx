'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from 'lucide-react'
import { featuredVehicles as fleet, money } from '@/lib/rental-data'

const interval = 2800
const counter = (n: number) => String(n).padStart(2, '0')

export function VehicleShowcase({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [visible, setVisible] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [loaded, setLoaded] = useState<number[]>([])
  const region = useRef<HTMLElement>(null)
  const photos = useRef<(HTMLImageElement | null)[]>([])
  const vehicle = fleet[index]

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const respectMotion = () => setPaused(preference.matches)
    const onVisibility = () => setVisible(!document.hidden)
    respectMotion()
    onVisibility()
    preference.addEventListener('change', respectMotion)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    )
    if (region.current) observer.observe(region.current)
    let mounted = true
    photos.current.forEach((img, i) => {
      if (!img) return
      // Decode before making a frame eligible, including images loaded before hydration.
      img
        .decode()
        .then(() => {
          if (mounted) setLoaded((old) => (old.includes(i) ? old : [...old, i]))
        })
        .catch(() => {})
    })
    return () => {
      mounted = false
      observer.disconnect()
      preference.removeEventListener('change', respectMotion)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (paused || hovered || !inView || !visible || loaded.length < 2) return
    const timer = window.setTimeout(
      () =>
        setIndex((i) => {
          for (let offset = 1; offset < fleet.length; offset++) {
            const next = (i + offset) % fleet.length
            if (loaded.includes(next)) return next
          }
          return i
        }),
      interval,
    )
    return () => window.clearTimeout(timer)
  }, [index, paused, hovered, inView, visible, loaded])

  if (!vehicle)
    return (
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero-inner">{children}</div>
      </section>
    )

  const step = (direction: number) => {
    const next = (index + direction + fleet.length) % fleet.length
    if (loaded.includes(next)) setIndex(next)
  }

  return (
    <section
      className="hero"
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      ref={region}
      data-vehicle={vehicle.slug}
      onFocusCapture={(e) => {
        if (
          e.target.matches(':focus-visible') &&
          !e.target.closest('[data-playback]')
        )
          setPaused(true)
      }}
    >
      <div className="showcase-photos" aria-hidden="true">
        {fleet.map((car, i) => (
          <picture
            key={car.slug}
            className="hero-photo"
            data-active={index === i}
          >
            <source media="(max-width: 900px)" srcSet={car.showcase.mobile} />
            <img
              ref={(el) => {
                photos.current[i] = el
              }}
              src={car.showcase.desktop}
              alt=""
              width="1226"
              height="498"
              loading="eager"
              decoding="async"
              fetchPriority={i === 0 ? 'high' : 'low'}
              onLoad={async (event) => {
                const img = event.currentTarget
                try {
                  await img.decode()
                } catch {
                  if (!img.naturalWidth) return
                }
                setLoaded((old) => (old.includes(i) ? old : [...old, i]))
              }}
            />
          </picture>
        ))}
      </div>
      <div className="hero-shade" />
      <div className="wrap hero-inner">
        {children}
        <div
          className="showcase-dashboard"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            className="showcase-controls"
            aria-label="Vehicle showcase controls"
          >
            <span
              className="showcase-count"
              aria-label={`Vehicle ${index + 1} of ${fleet.length}`}
            >
              <b>{counter(index + 1)}</b>
              <i>/</i>
              {counter(fleet.length)}
            </span>
            <span className="showcase-track" aria-hidden="true">
              {fleet.map((car, i) => (
                <i key={car.slug} data-active={i === index} />
              ))}
            </span>
            <button
              type="button"
              aria-label="Previous vehicle"
              disabled={
                !loaded.includes((index + fleet.length - 1) % fleet.length)
              }
              onClick={() => step(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next vehicle"
              disabled={!loaded.includes((index + 1) % fleet.length)}
              onClick={() => step(1)}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              data-playback
              aria-label={
                paused ? 'Play vehicle showcase' : 'Pause vehicle showcase'
              }
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play size={12} /> : <Pause size={12} />}
            </button>
          </div>
          <Link
            href={`/fleet/${vehicle.slug}`}
            className="showcase-car"
            aria-live={paused ? 'polite' : 'off'}
            aria-atomic="true"
          >
            <span className="showcase-kicker">
              Featured vehicle <span aria-hidden="true">/</span>{' '}
              {vehicle.fuel === 'Electric' ? 'Electric ' : ''}
              {vehicle.bodyType}
            </span>
            <span className="showcase-car-line">
              <strong>{vehicle.name}</strong>
              <span className="showcase-price">
                {money(vehicle.dailyRate)} <small>/ day</small>
              </span>
              <ArrowUpRight size={15} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}
