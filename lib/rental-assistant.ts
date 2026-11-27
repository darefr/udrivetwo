import { getVehicle, pickupLocations, type RentalMode } from './rental-data'

export const languages = ['auto', 'en', 'ne', 'roman'] as const
export type ChatLanguage = (typeof languages)[number]
export type ReplyLanguage = Exclude<ChatLanguage, 'auto'>
export type RentalContext = {
  vehicle?: string
  days?: number
  pickup?: string
  mode?: RentalMode
}
export type ChatTurn = {
  role: 'user' | 'assistant'
  text: string
  language?: ReplyLanguage
  context?: RentalContext
  action?: 'booking' | 'fleet' | 'team' | 'faq'
  source?: 'catalog' | 'offline' | 'ai'
}
export type AssistantRequest = { messages: ChatTurn[]; language: ChatLanguage }
export type AssistantReply = ChatTurn & {
  role: 'assistant'
  source: NonNullable<ChatTurn['source']>
}
export type RentalResponder = (
  request: AssistantRequest,
  signal?: AbortSignal,
) => AssistantReply | Promise<AssistantReply>
export const maxQuestion = 600
export const maxHistory = 30
export const maxRequestTurns = 16
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export function readTurn(value: unknown): ChatTurn | null {
  if (
    !isObject(value) ||
    (value.role !== 'user' && value.role !== 'assistant') ||
    typeof value.text !== 'string'
  )
    return null
  const text = value.text.trim()
  if (!text || text.length > (value.role === 'user' ? maxQuestion : 3000))
    return null
  if (value.role === 'user') return { role: 'user', text }
  const context: RentalContext = {}
  if (isObject(value.context)) {
    const c = value.context
    if (typeof c.vehicle === 'string' && getVehicle(c.vehicle))
      context.vehicle = c.vehicle
    if (
      typeof c.days === 'number' &&
      Number.isInteger(c.days) &&
      c.days > 0 &&
      c.days <= 365
    )
      context.days = c.days
    if (typeof c.pickup === 'string' && pickupLocations.includes(c.pickup))
      context.pickup = c.pickup
    if (c.mode === 'self-drive' || c.mode === 'with-driver')
      context.mode = c.mode
  }
  return {
    role: 'assistant',
    text,
    context,
    language:
      value.language === 'ne' || value.language === 'roman'
        ? value.language
        : 'en',
    source:
      value.source === 'ai' || value.source === 'offline'
        ? value.source
        : 'catalog',
    action:
      value.action === 'booking' ||
      value.action === 'fleet' ||
      value.action === 'team' ||
      value.action === 'faq'
        ? value.action
        : undefined,
  }
}
export function readAssistantRequest(value: unknown): AssistantRequest | null {
  if (
    !isObject(value) ||
    !languages.includes(value.language as ChatLanguage) ||
    !Array.isArray(value.messages) ||
    !value.messages.length ||
    value.messages.length > maxRequestTurns
  )
    return null
  const messages = value.messages.map(readTurn)
  if (messages.some((m) => !m) || messages.at(-1)?.role !== 'user') return null
  return {
    messages: messages as ChatTurn[],
    language: value.language as ChatLanguage,
  }
}

export async function requestRentalReply(
  input: AssistantRequest,
  signal: AbortSignal,
): Promise<AssistantReply> {
  try {
    const response = await fetch('/api/rental-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify(input),
      signal,
    })
    if (!response.ok)
      throw new Error('The rental guide did not return a reply.')
    const turn = readTurn(await response.json())
    if (turn?.role !== 'assistant' || !turn.source)
      throw new Error('Invalid rental guide reply.')
    return turn as AssistantReply
  } catch (error) {
    if (signal.aborted) throw error
    const { catalogReply } = await import('./rental-guide')
    return { ...catalogReply(input), source: 'offline' }
  }
}
