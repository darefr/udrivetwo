'use client'
import { createContext, useContext, type ReactNode } from 'react'
import type { catalog } from '@/lib/platform/catalog'
import type { Principal } from '@/lib/platform/contracts'
import { rentalContact } from '@/lib/contact-link'
type Context = Awaited<ReturnType<typeof catalog>> & {
  user: Principal | null
  whatsapp: string
  currency: string
  policies: string
  cancellation: string
  social: { google: boolean; facebook: boolean }
}
const Platform = createContext<Context | null>(null)
export function PlatformProvider({
  value,
  children,
}: {
  value: Context
  children: ReactNode
}) {
  return <Platform.Provider value={value}>{children}</Platform.Provider>
}
export function useRentalPlatform() {
  const context = useContext(Platform)
  if (!context) throw new Error('Rental context is unavailable')
  return context
}
export function useContact() {
  return rentalContact(useRentalPlatform().whatsapp)
}
export async function api<T = Record<string, any>>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const r = await fetch(`/api/platform/${path}`, {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    ...(body !== undefined
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  })
  const result = await r.json()
  if (!r.ok) throw new Error(result.error || 'Please try again.')
  return result
}
