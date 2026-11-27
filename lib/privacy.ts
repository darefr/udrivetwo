import { track, type BeforeSend } from '@vercel/analytics'
import { indexablePaths } from './site-routes'

export const preferenceCookie = 'udrive_privacy_v1'
export const settingsEvent = 'udrive:open-privacy'
const changed = 'udrive:privacy-changed'
export type Choice = 'essential' | 'analytics'
let unsavedChoice: Choice | null = null

function cookieChoice(): Choice | null {
  try {
    const value = document.cookie
      .split('; ')
      .find((item) => item.startsWith(`${preferenceCookie}=`))
      ?.slice(preferenceCookie.length + 1)
    return value === 'analytics' || value === 'essential' ? value : null
  } catch {
    return null
  }
}
export function readChoice() {
  return unsavedChoice ?? cookieChoice()
}
export function saveChoice(value: Choice) {
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${preferenceCookie}=${value}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`
  } catch {
    /* A blocked preference cookie must not prevent declining analytics. */
  }
  unsavedChoice = cookieChoice() === value ? null : value
  window.dispatchEvent(new Event(changed))
}
export function subscribeChoice(update: () => void) {
  window.addEventListener(changed, update)
  window.addEventListener('focus', update)
  window.addEventListener('pageshow', update)
  document.addEventListener('visibilitychange', update)
  return () => {
    window.removeEventListener(changed, update)
    window.removeEventListener('focus', update)
    window.removeEventListener('pageshow', update)
    document.removeEventListener('visibilitychange', update)
  }
}

const measurable = new Set(indexablePaths)
export const canMeasure = (path: string) =>
  readChoice() === 'analytics' && measurable.has(path)
export const filterAnalytics: BeforeSend = (event) => {
  try {
    const url = new URL(event.url, location.origin)
    if (url.origin !== location.origin || !canMeasure(url.pathname)) return null
    return { ...event, url: url.origin + url.pathname }
  } catch {
    return null
  }
}
export type Conversion =
  | 'Booking CTA clicked'
  | 'Rental enquiry prepared'
  | 'Contact enquiry prepared'
  | 'WhatsApp handoff opened'
export function recordConversion(name: Conversion) {
  if (canMeasure(location.pathname)) track(name)
}
