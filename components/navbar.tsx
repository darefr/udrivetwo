'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  MapPin,
  Menu,
  MountainSnow,
  UserRound,
  X,
} from 'lucide-react'
import { Brand } from './brand'
import {
  business,
  destinations,
  featuredVehicles,
  money,
  navLinks,
  whatsAppContact,
} from '@/lib/rental-data'
import { cn } from '@/lib/utils'

function MobileMenu({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  useEffect(() => {
    const d = dialog.current
    d?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
      d?.close()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="mobile-drawer"
      aria-labelledby="mobile-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
    >
      <div className="drawer-content">
        <div className="drawer-head">
          <Brand onNavigate={onClose} />
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <h2 id="mobile-title" className="sr-only">
          Main navigation
        </h2>
        <nav className="mobile-links" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              onClick={onClose}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
              <ArrowUpRight size={17} />
            </Link>
          ))}
          <div className="mobile-rental-links">
            <Link href="/self-drive" onClick={onClose}>
              Self Drive
            </Link>
            <Link href="/with-driver" onClick={onClose}>
              With Driver
            </Link>
          </div>
        </nav>
        <nav className="drawer-account" aria-label="Your U Drive account">
          <Link onClick={onClose} href="/sign-in" className="action primary">
            <UserRound size={16} />
            Sign In
          </Link>
          <Link
            onClick={onClose}
            href="/create-account"
            className="action outline"
          >
            Create Account <ArrowRight size={15} />
          </Link>
        </nav>
        <section className="drawer-booking" aria-label="Quick booking">
          <p className="eyebrow">QUICK BOOKING</p>
          <h3>Already have a trip in mind?</h3>
          <p>Choose your car and dates for an instant rental estimate.</p>
          <Link href="/booking" onClick={onClose} className="action primary">
            Rent Now <ArrowRight size={15} />
          </Link>
        </section>
        <section className="drawer-section" aria-labelledby="drawer-cars">
          <h3 id="drawer-cars">Popular vehicles</h3>
          <nav className="drawer-car-list" aria-label="Popular rental vehicles">
            {featuredVehicles.slice(0, 4).map((car) => (
              <Link
                key={car.slug}
                href={`/fleet/${car.slug}`}
                onClick={onClose}
              >
                <img
                  src={car.image}
                  alt=""
                  width={58}
                  height={38}
                  loading="lazy"
                />
                <span>
                  <strong>{car.name}</strong>
                  <small>{money(car.dailyRate)} / day</small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </nav>
        </section>
        <section className="drawer-section" aria-labelledby="drawer-routes">
          <h3 id="drawer-routes">Explore Nepal</h3>
          <nav className="drawer-route-list" aria-label="Popular destinations">
            {destinations.slice(0, 4).map((d) => (
              <Link
                key={d.slug}
                href={`/destinations/${d.slug}`}
                onClick={onClose}
              >
                <MapPin size={14} />
                {d.name}
              </Link>
            ))}
          </nav>
        </section>
        <section
          className="drawer-section drawer-help"
          aria-labelledby="drawer-support"
        >
          <h3 id="drawer-support">Your Kathmandu rental desk</h3>
          <p>
            Local pickup, Nepal-wide delivery, and a real person to help plan
            the handover.
          </p>
          <a
            className="drawer-contact"
            href={whatsAppContact.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/images/whatsapp.svg" alt="" width={19} height={19} />
            <span>
              WhatsApp U Drive<small>{business.whatsappNumber}</small>
            </span>
            <ArrowUpRight size={15} />
          </a>
          <div className="mobile-rental-links">
            <Link href="/faq" onClick={onClose}>
              Rental FAQs
            </Link>
            <Link href="/contact" onClick={onClose}>
              Contact team
            </Link>
          </div>
        </section>
      </div>
    </dialog>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const [mobile, setMobile] = useState(false)
  const [rental, setRental] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!mobile) return
    const desktop = window.matchMedia('(min-width: 1131px)')
    const closeOnDesktop = () => {
      if (desktop.matches) setMobile(false)
    }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [mobile])
  const closeMobile = () => {
    setMobile(false)
    requestAnimationFrame(() => menuTrigger.current?.focus())
  }
  const trigger = useRef<HTMLButtonElement>(null)
  const drop = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!rental) return
    const outside = (e: PointerEvent) => {
      if (!drop.current?.contains(e.target as Node)) setRental(false)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRental(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [rental])
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="wrap utility-inner">
          <span>
            <MapPin size={13} /> Kathmandu, Nepal{' '}
            <span className="utility-div" /> <span>Nepal-wide service</span>
          </span>
          <div className="utility-right">
            <MountainSnow size={15} />
            <span>From the valley to the mountains</span>
            <span className="utility-div" />
            <Link href="/faq" prefetch={false}>
              <CircleHelp size={13} /> FAQs
            </Link>
          </div>
        </div>
      </div>
      <div className="nav-wrap">
        <div className="wrap nav-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {navLinks.map((link) =>
              link.href === '/rental-options' ? (
                <div
                  className="rental-nav"
                  key={link.href}
                  ref={drop}
                  onBlur={(e) => {
                    if (
                      !e.currentTarget.contains(e.relatedTarget as Node | null)
                    )
                      setRental(false)
                  }}
                >
                  <button
                    ref={trigger}
                    onClick={() => setRental(!rental)}
                    aria-expanded={rental}
                    aria-controls="rental-navigation"
                    className={cn(
                      'nav-item',
                      [
                        '/self-drive',
                        '/with-driver',
                        '/rental-options',
                      ].includes(pathname) && 'active',
                    )}
                  >
                    Rental Options
                    <ChevronDown size={13} />
                  </button>
                  {rental && (
                    <div className="nav-dropdown" id="rental-navigation">
                      {[
                        ['/self-drive', 'Self Drive'],
                        ['/with-driver', 'With Driver'],
                        ['/rental-options', 'Compare options'],
                      ].map(([url, label]) => (
                        <Link
                          key={url}
                          href={url}
                          onClick={() => setRental(false)}
                        >
                          {label}
                          <ArrowUpRight size={15} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  className={cn(
                    'nav-item',
                    (link.href === '/'
                      ? pathname === '/'
                      : pathname.startsWith(link.href)) && 'active',
                  )}
                  prefetch={false}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  key={link.href}
                  href={link.href}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>
          <div className="nav-actions">
            <Link className="sign-in-link" href="/sign-in" prefetch={false}>
              <UserRound size={16} />
              Sign In
            </Link>
            <Link className="action primary nav-book" href="/booking">
              Rent Now
              <ArrowUpRight size={16} />
            </Link>
            <button
              ref={menuTrigger}
              className="icon-button menu-button"
              aria-label="Open navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Menu size={23} />
            </button>
          </div>
        </div>
      </div>
      {mobile && <MobileMenu onClose={closeMobile} />}
    </header>
  )
}
