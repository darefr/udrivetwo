'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatLanguage } from './rental-assistant'

type SpeechSession = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>
      }) => void)
    | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type VoiceWindow = Window & {
  SpeechRecognition?: new () => SpeechSession
  webkitSpeechRecognition?: new () => SpeechSession
}
export function useDictation(
  language: ChatLanguage,
  onText: (text: string) => void,
) {
  const [listening, setListening] = useState(false)
  const [notice, setNotice] = useState('')
  const active = useRef<SpeechSession | null>(null)
  useEffect(
    () => () => {
      const r = active.current
      if (r) {
        r.onresult = null
        r.onend = null
        r.onerror = null
        r.abort()
      }
    },
    [],
  )
  const toggle = () => {
    if (active.current) {
      active.current.stop()
      return
    }
    const w = window as VoiceWindow
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Recognition) {
      setNotice(
        'Voice input is not supported by this browser. Type your question, or use your keyboard’s dictation.',
      )
      return
    }
    const r = new Recognition()
    r.lang =
      language === 'ne' ||
      language === 'roman' ||
      (language === 'auto' && navigator.language.startsWith('ne'))
        ? 'ne-NP'
        : 'en-US'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e) => {
      const transcript = Array.from(
        e.results,
        (result) => result[0]?.transcript ?? '',
      )
        .join(' ')
        .trim()
      if (transcript) onText(transcript)
      setNotice('Review your transcript, then press Send.')
    }
    r.onerror = (e) => {
      setListening(false)
      setNotice(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone access was not granted. You can still type your question.'
          : 'No speech was captured. Try again, or type your question.',
      )
      active.current = null
    }
    r.onend = () => {
      setListening(false)
      active.current = null
    }
    active.current = r
    try {
      r.start()
      setListening(true)
      setNotice(
        'Listening with your browser’s speech service. Tap the microphone to stop.',
      )
    } catch {
      setListening(false)
      active.current = null
      setNotice('Dictation is unavailable here. Please type your question.')
    }
  }
  return { listening, notice, toggle }
}
