'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { inject, pageview } from '@vercel/analytics'
import {
  canMeasure,
  filterAnalytics,
  readChoice,
  recordConversion,
  saveChoice,
  settingsEvent,
  subscribeChoice,
  type Choice,
} from '@/lib/privacy'
import { useInteractive } from '@/lib/use-interactive'

export function CookieSettingsLink() {
  return (
    <a
      className="cookie-settings-link"
      href="/privacy#cookie-choices-and-optional-analytics"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        window.dispatchEvent(
          new CustomEvent(settingsEvent, { detail: event.currentTarget }),
        )
      }}
    >
      Cookie settings
    </a>
  )
}

export function PrivacyControls() {
  const ready = useInteractive()
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => null)
  const pathname = usePathname()
  const [editing, setEditing] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const banner = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const previousPage = useRef<string | null>(null)
  const visible = ready && (!choice || editing)

  useEffect(() => {
    const open = (event: Event) => {
      opener.current = (event as CustomEvent<HTMLElement>).detail
      setEditing(true)
      requestAnimationFrame(() =>
        heading.current?.focus({ preventScroll: true }),
      )
    }
    window.addEventListener(settingsEvent, open)
    return () => window.removeEventListener(settingsEvent, open)
  }, [])

  useEffect(() => {
    if (!visible || !banner.current) return
    const el = banner.current
    const size = () =>
      document.documentElement.style.setProperty(
        '--cookie-clearance',
        `${Math.ceil(el.getBoundingClientRect().height) + 24}px`,
      )
    const observer = new ResizeObserver(size)
    observer.observe(el)
    size()
    return () => {
      observer.disconnect()
      document.documentElement.style.removeProperty('--cookie-clearance')
    }
  }, [visible])

  useEffect(() => {
    if (choice !== 'analytics' || !canMeasure(pathname)) {
      previousPage.current = null
      return
    }
    // Manual, allowlisted paths avoid measuring query changes, unknown slugs or account previews.
    inject({
      framework: 'next',
      debug: false,
      disableAutoTrack: true,
      beforeSend: filterAnalytics,
    })
    if (previousPage.current !== pathname) {
      pageview({ path: pathname, route: pathname })
      previousPage.current = pathname
    }
    const follow = (event: MouseEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return
      const link = event.target.closest('a')
      if (link?.matches('a[href^="https://wa.me/"]'))
        recordConversion('WhatsApp handoff opened')
      else if (link?.matches('a[href="/booking"],a[href^="/booking?"]'))
        recordConversion('Booking CTA clicked')
    }
    document.addEventListener('click', follow, true)
    return () => document.removeEventListener('click', follow, true)
  }, [choice, pathname])

  function choose(value: Choice) {
    saveChoice(value)
    setEditing(false)
    const target = opener.current?.isConnected
      ? opener.current
      : document.getElementById('main-content')
    target?.focus({ preventScroll: true })
    opener.current = null
  }
  if (!visible) return null
  return (
    <section
      className="privacy-banner"
      ref={banner}
      aria-labelledby="privacy-choice-title"
    >
      <div className="privacy-banner-heading">
        <ShieldCheck size={20} aria-hidden="true" />
        <h2 id="privacy-choice-title" ref={heading} tabIndex={-1}>
          Your privacy choices
        </h2>
      </div>
      <p>
        May we count visits and rental enquiries? No form details are included.{' '}
        <Link href="/privacy" prefetch={false}>
          Privacy policy
        </Link>
      </p>
      {editing && choice && (
        <p className="current-choice">
          Current choice:{' '}
          {choice === 'analytics' ? 'analytics allowed' : 'essential only'}.
        </p>
      )}
      <div className="privacy-actions">
        <button type="button" onClick={() => choose('essential')}>
          Essential only
        </button>
        <button type="button" onClick={() => choose('analytics')}>
          Allow analytics
        </button>
      </div>
    </section>
  )
}
