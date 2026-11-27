'use client'

import { useEffect, useRef, useState } from 'react'
import {
  languages,
  maxHistory,
  maxQuestion,
  maxRequestTurns,
  readTurn,
  requestRentalReply,
  type ChatLanguage,
  type ChatTurn,
} from './rental-assistant'

const sessionKey = 'udrive:rental-chat:v1'
export function useRentalChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [language, setLanguage] = useState<ChatLanguage>('auto')
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [restored, setRestored] = useState(false)
  const inflight = useRef<AbortController | null>(null)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey)
      if (raw && raw.length < 120000) {
        const data = JSON.parse(raw)
        if (Array.isArray(data.turns))
          setTurns(
            data.turns
              .slice(-maxHistory)
              .map(readTurn)
              .filter((t: ChatTurn | null): t is ChatTurn => !!t),
          )
        if (languages.includes(data.language)) setLanguage(data.language)
      }
    } catch {
      /* Session storage is optional in restricted browsers. */
    }
    setRestored(true)
    return () => inflight.current?.abort()
  }, [])
  useEffect(() => {
    if (!restored) return
    try {
      if (!turns.length && language === 'auto')
        sessionStorage.removeItem(sessionKey)
      else
        sessionStorage.setItem(sessionKey, JSON.stringify({ turns, language }))
    } catch {
      /* The mounted conversation still works without browser storage. */
    }
  }, [turns, language, restored])
  const send = async (question: string, retry = false) => {
    const text = question.trim()
    if (!restored || inflight.current || !text || text.length > maxQuestion)
      return
    const controller = new AbortController()
    inflight.current = controller
    const next: ChatTurn[] = retry
      ? turns
      : [...turns, { role: 'user' as const, text }].slice(-maxHistory)
    setTurns(next)
    setDraft('')
    setError('')
    setPending(true)
    const timer = window.setTimeout(() => controller.abort('timeout'), 12000)
    try {
      const reply = await requestRentalReply(
        { messages: next.slice(-maxRequestTurns), language },
        controller.signal,
      )
      if (inflight.current === controller && !controller.signal.aborted)
        setTurns([...next, reply].slice(-maxHistory))
    } catch {
      if (inflight.current === controller)
        setError(
          'The rental guide could not finish that reply. Try again or contact our team.',
        )
    } finally {
      window.clearTimeout(timer)
      if (inflight.current === controller) {
        inflight.current = null
        setPending(false)
      }
    }
  }
  const clear = () => {
    inflight.current?.abort()
    inflight.current = null
    setPending(false)
    setTurns([])
    setDraft('')
    setError('')
  }
  return {
    turns,
    language,
    setLanguage,
    draft,
    setDraft,
    pending,
    error,
    send,
    clear,
    restored,
  }
}
export type RentalChat = ReturnType<typeof useRentalChat>
