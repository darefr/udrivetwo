'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronDown, Sparkles } from 'lucide-react'
import { whatsAppContact } from '@/lib/rental-data'
import { useRentalChat } from '@/lib/use-rental-chat'
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from './ui/popover'

const ChatPanel = dynamic(
  () => import('./rental-chat').then((mod) => mod.RentalChatPanel),
  {
    loading: () => (
      <div className="assistant-loading" role="status">
        <PopoverTitle>U Drive Rental AI Assistant</PopoverTitle>
        <p>Opening the rental guide…</p>
      </div>
    ),
  },
)

export function FloatingContact() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const dock = useRef<HTMLElement>(null)
  const chat = useRentalChat()
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    const el = dock.current
    if (!el) return
    if (open) {
      el.style.removeProperty('--dock-clearance')
      return
    }
    let frame = 0
    const place = () => {
      frame = 0
      const { left, right, height } = el.getBoundingClientRect()
      const viewport = window.innerHeight
      const banner = document
        .querySelector('.privacy-banner')
        ?.getBoundingClientRect()
      const safeBottom =
        banner &&
        banner.right >= left &&
        banner.top < viewport &&
        banner.bottom > viewport / 2
          ? Math.ceil(viewport - banner.top + 8)
          : 16
      // Keep the dock viewport-fixed. Only change parking slots when it would mask a control.
      const obstacles = Array.from(
        document.querySelectorAll<HTMLElement>(
          'main input, main select, main textarea, main button:not(:disabled), main .action, main .small-book, main .image-open, main .round-arrow, main .showcase-controls, main .text-link, footer a',
        ),
      )
        .map((node) => node.getBoundingClientRect())
        .filter(
          (r) =>
            r.height &&
            r.right >= left - 3 &&
            r.left <= right + 3 &&
            r.bottom > 74 &&
            r.top < viewport,
        )
      let bottom = safeBottom
      while (
        bottom + height < viewport - 80 &&
        obstacles.some(
          (r) =>
            r.bottom + 5 > viewport - bottom - height &&
            r.top - 5 < viewport - bottom,
        )
      )
        bottom += height + 12
      if (bottom + height >= viewport - 80) bottom = safeBottom
      el.style.setProperty('--dock-clearance', `${bottom}px`)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place)
    }
    place()
    const main = document.querySelector('main')
    const observer = new ResizeObserver(schedule)
    if (main) observer.observe(main)
    const consentObserver = new MutationObserver(schedule)
    consentObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    document.addEventListener('focusin', schedule)
    return () => {
      observer.disconnect()
      consentObserver.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule)
      document.removeEventListener('focusin', schedule)
    }
  }, [pathname, open])
  return (
    <aside
      ref={dock}
      className="support-dock"
      data-ready={chat.restored}
      aria-label="U Drive rental support"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="support-button assistant-button"
          aria-label={
            open ? 'Minimize U Drive assistant' : 'Open U Drive AI assistant'
          }
          title="U Drive Rental Assistant"
        >
          {open ? <ChevronDown size={22} /> : <Sparkles size={22} />}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={10}
          className="assistant-panel rental-chat-panel"
          aria-label="U Drive Rental Assistant"
        >
          <ChatPanel chat={chat} onClose={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
      <a
        className="support-button whatsapp-button"
        href={whatsAppContact.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={whatsAppContact.label}
        title={whatsAppContact.label}
      >
        <img src="/images/whatsapp.svg" alt="" width={26} height={26} />
      </a>
    </aside>
  )
}
