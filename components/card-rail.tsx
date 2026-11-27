'use client'

import {
  Children,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useInteractive } from '@/lib/use-interactive'
import { SectionHeading } from './shared'

type Props = {
  kind: 'destination' | 'review'
  label: string
  heading: Omit<ComponentProps<typeof SectionHeading>, 'controls'>
  filters?: ReactNode
  resetKey?: string
  children: ReactNode
}

const pad = (n: number) => String(n).padStart(2, '0')
const cardsIn = (el: HTMLElement) => Array.from(el.children) as HTMLElement[]
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'instant'
    : 'smooth'

function snapPoints(el: HTMLElement) {
  const end = el.scrollWidth - el.clientWidth
  return [...new Set(cardsIn(el).map((card) => Math.min(card.offsetLeft, end)))]
}

export function CardRail({
  kind,
  label,
  heading,
  filters,
  resetKey,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const ready = useInteractive()
  const total = Children.count(children)
  const [view, setView] = useState({
    first: 1,
    last: 1,
    start: true,
    end: false,
  })
  const drag = useRef<{
    id: number
    x: number
    left: number
    moved: boolean
  } | null>(null)
  const ignoreClick = useRef(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft
    const right = left + el.clientWidth
    const visible = cardsIn(el).flatMap((card, i) => {
      const middle = card.offsetLeft + card.offsetWidth / 2
      return middle >= left && middle <= right ? [i + 1] : []
    })
    const next = {
      first: visible[0] ?? 1,
      last: visible.at(-1) ?? 1,
      start: left <= 2,
      end: right >= el.scrollWidth - 2,
    }
    setView((v) =>
      v.first === next.first &&
      v.last === next.last &&
      v.start === next.start &&
      v.end === next.end
        ? v
        : next,
    )
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ left: 0, behavior: 'instant' })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', onScroll)
    }
  }, [measure, total, resetKey])

  const step = (direction: -1 | 1) => {
    const el = ref.current
    if (!el) return
    const points = snapPoints(el)
    const target =
      direction === 1
        ? points.find((p) => p > el.scrollLeft + 2)
        : points.reverse().find((p) => p < el.scrollLeft - 2)
    if (target !== undefined)
      el.scrollTo({ left: target, behavior: scrollBehavior() })
  }

  const finishDrag = (e: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.id !== e.pointerId) return
    const el = e.currentTarget
    drag.current = null
    if (!state.moved) return
    const left = el.scrollLeft
    const nearest = snapPoints(el).reduce(
      (best, p) => (Math.abs(p - left) < Math.abs(best - left) ? p : best),
      0,
    )
    delete el.dataset.dragging
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    el.scrollTo({ left: nearest, behavior: scrollBehavior() })
  }

  return (
    <>
      <SectionHeading
        {...heading}
        controls={
          <div
            className={`carousel-controls ${kind}-rail-controls`}
            role="group"
            aria-label={`${label} controls`}
          >
            <button
              type="button"
              className="icon-button"
              aria-controls={id}
              aria-label={`Previous ${kind}`}
              disabled={!ready || view.start}
              onClick={() => step(-1)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
            <span role="status" aria-atomic="true">
              <span aria-hidden="true">
                {pad(view.first)}
                {view.last !== view.first ? `–${pad(view.last)}` : ''} /{' '}
                {pad(total)}
              </span>
              <span className="sr-only">
                Showing {view.first}
                {view.last !== view.first
                  ? ` through ${view.last}`
                  : ''} of {total}{' '}
                {kind === 'review' ? 'stories' : 'destinations'}.
              </span>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-controls={id}
              aria-label={`Next ${kind}`}
              disabled={!ready || view.end}
              onClick={() => step(1)}
            >
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        }
      />
      {filters}
      <p id={`${id}-help`} className="sr-only">
        Swipe, drag, or use the arrow buttons. With the carousel focused, use
        Left and Right to move, Home for the beginning, or End for the last
        cards.
      </p>
      <div
        ref={ref}
        id={id}
        className={`card-rail ${kind}-rail`}
        role="region"
        aria-label={label}
        aria-roledescription="carousel"
        aria-describedby={`${id}-help`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (
            e.altKey ||
            e.ctrlKey ||
            e.metaKey ||
            e.target !== e.currentTarget
          )
            return
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key))
            return
          e.preventDefault()
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            step(e.key === 'ArrowRight' ? 1 : -1)
          else
            e.currentTarget.scrollTo({
              left: e.key === 'Home' ? 0 : e.currentTarget.scrollWidth,
              behavior: scrollBehavior(),
            })
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          ignoreClick.current = false
          if (
            e.pointerType !== 'mouse' ||
            e.button !== 0 ||
            e.ctrlKey ||
            e.metaKey ||
            e.shiftKey ||
            e.altKey
          )
            return
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            left: e.currentTarget.scrollLeft,
            moved: false,
          }
        }}
        onPointerMove={(e) => {
          const state = drag.current
          if (!state || state.id !== e.pointerId || !e.buttons) return
          const dx = e.clientX - state.x
          if (!state.moved && Math.abs(dx) < 6) return
          if (!state.moved) {
            state.moved = true
            ignoreClick.current = true
            e.currentTarget.dataset.dragging = 'true'
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          e.currentTarget.scrollLeft = state.left - dx
        }}
        onPointerLeave={() => {
          if (!drag.current?.moved) drag.current = null
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onClickCapture={(e) => {
          if (ignoreClick.current && e.detail !== 0) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        {children}
      </div>
    </>
  )
}
