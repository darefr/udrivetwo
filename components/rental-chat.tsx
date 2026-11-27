'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Languages,
  LoaderCircle,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { whatsAppContact } from '@/lib/rental-data'
import {
  maxQuestion,
  type ChatLanguage,
  type ChatTurn,
} from '@/lib/rental-assistant'
import type { RentalChat } from '@/lib/use-rental-chat'
import { useDictation } from '@/lib/use-dictation'
import { tripHref } from '@/lib/trip'
import { Bubble, BubbleContent } from './ui/bubble'
import { Message, MessageContent } from './ui/message'
import { Marker, MarkerContent } from './ui/marker'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from './ui/message-scroller'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from './ui/input-group'
import { PopoverHeader, PopoverTitle } from './ui/popover'

const prompts = {
  en: [
    'Which car is cheapest?',
    'I need a car for 5 days.',
    'Can I rent with a driver?',
    'Pickup in Pokhara?',
  ],
  ne: [
    'सबैभन्दा सस्तो गाडी कुन हो?',
    '५ दिनको भाडा कति?',
    'चालकसहित गाडी पाइन्छ?',
    'पोखरामा गाडी पाइन्छ?',
  ],
  roman: [
    'Kun gadi sasto chha?',
    '5 din ko kati parchha?',
    'Driver sanga milchha?',
    'Pokhara ma pickup milchha?',
  ],
}
function ReplyAction({ turn, close }: { turn: ChatTurn; close: () => void }) {
  if (!turn.action) return null
  if (turn.action === 'team')
    return (
      <a
        className="chat-action"
        href={whatsAppContact.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp the team <ArrowUpRight size={13} />
      </a>
    )
  const context = turn.context ?? {}
  const href =
    turn.action === 'booking'
      ? tripHref('/booking', {
          vehicle: context.vehicle,
          mode: context.mode,
          pickup: context.pickup,
          duration: context.days?.toString(),
        })
      : `/${turn.action}`
  return (
    <Link className="chat-action" href={href} onClick={close}>
      {turn.action === 'booking'
        ? 'Plan this rental'
        : turn.action === 'fleet'
          ? 'Compare vehicles'
          : 'Rental FAQs'}
      <ArrowRight size={13} />
    </Link>
  )
}
export function RentalChatPanel({
  chat,
  onClose,
}: {
  chat: RentalChat
  onClose: () => void
}) {
  const [resetting, setResetting] = useState(false)
  const [showPrompts, setShowPrompts] = useState(false)
  const recent = chat.turns.filter((m) => m.role === 'assistant').at(-1)
  const language =
    chat.language === 'auto' ? (recent?.language ?? 'en') : chat.language
  const voice = useDictation(
    chat.language === 'auto' ? language : chat.language,
    (text) =>
      chat.setDraft((prev) =>
        `${prev}${prev ? ' ' : ''}${text}`.slice(0, maxQuestion),
      ),
  )
  const ask = (text: string) => {
    if (voice.listening) return
    setShowPrompts(false)
    void chat.send(text)
  }
  const welcome =
    language === 'ne'
      ? 'नमस्ते! कहाँ जाने योजना छ?'
      : language === 'roman'
        ? 'Namaste! Kata jane plan chha?'
        : 'Namaste. Where are you headed?'
  return (
    <>
      <PopoverHeader className="assistant-heading">
        <span className="assistant-heading-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <PopoverTitle>U Drive Rental AI Assistant</PopoverTitle>
          <p>
            {recent?.source === 'ai'
              ? 'AI rental assistant'
              : 'Catalog guide · Live AI not connected'}
          </p>
        </div>
        <button
          type="button"
          className="assistant-minimize"
          onClick={onClose}
          aria-label="Minimize assistant"
        >
          <X size={17} />
        </button>
      </PopoverHeader>
      <div className="chat-toolbar">
        <label>
          <Languages size={14} />
          <span className="sr-only">Assistant language</span>
          <select
            value={chat.language}
            onChange={(e) => chat.setLanguage(e.target.value as ChatLanguage)}
          >
            <option value="auto">Auto language</option>
            <option value="en">English</option>
            <option value="ne">नेपाली</option>
            <option value="roman">Roman Nepali</option>
          </select>
        </label>
        {chat.turns.length > 0 && (
          <button type="button" onClick={() => setResetting(!resetting)}>
            <RotateCcw size={12} />
            Clear chat
          </button>
        )}
      </div>
      {resetting && (
        <div
          className="chat-reset"
          role="group"
          aria-label="Clear conversation confirmation"
        >
          <p>Clear this tab’s conversation?</p>
          <button
            type="button"
            onClick={() => {
              chat.clear()
              setResetting(false)
            }}
          >
            Clear
          </button>
          <button type="button" onClick={() => setResetting(false)}>
            Keep chat
          </button>
        </div>
      )}
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="chat-transcript">
          <MessageScrollerViewport aria-label="Rental conversation">
            <MessageScrollerContent
              role="log"
              aria-live="polite"
              aria-label="Conversation history"
              className="chat-messages"
            >
              {!chat.turns.length && (
                <MessageScrollerItem messageId="welcome">
                  <div className="chat-welcome">
                    <p className="eyebrow">KATHMANDU RENTAL DESK</p>
                    <h3 lang={language === 'roman' ? 'ne-Latn' : language}>
                      {welcome}
                    </h3>
                    <p>
                      {language === 'ne'
                        ? 'गाडी तुलना गर्नुहोस्, दैनिक भाडा हेर्नुहोस् वा डेलिभरीबारे सोध्नुहोस्।'
                        : language === 'roman'
                          ? 'Gadi compare garnuhos, rental estimate hernuhos, wa delivery bare sodhnuhos.'
                          : 'Compare cars, work out a rental estimate, or ask about a handover anywhere in Nepal.'}
                    </p>
                    <span>English · नेपाली · Roman Nepali</span>
                  </div>
                </MessageScrollerItem>
              )}
              {chat.turns.map((turn, i) => (
                <MessageScrollerItem
                  key={`${i}-${turn.text.slice(0, 20)}`}
                  messageId={`turn-${i}`}
                >
                  <Message align={turn.role === 'user' ? 'end' : 'start'}>
                    <MessageContent>
                      <Bubble
                        align={turn.role === 'user' ? 'end' : 'start'}
                        variant={turn.role === 'user' ? 'secondary' : 'outline'}
                      >
                        <BubbleContent>
                          <span className="sr-only">
                            {turn.role === 'user' ? 'You: ' : 'U Drive: '}
                          </span>
                          <p
                            className="chat-text"
                            lang={
                              turn.language === 'roman'
                                ? 'ne-Latn'
                                : turn.language
                            }
                          >
                            {turn.text}
                          </p>
                          {turn.role === 'assistant' && (
                            <ReplyAction turn={turn} close={onClose} />
                          )}
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
              {(!chat.turns.length || showPrompts) && (
                <MessageScrollerItem messageId="suggestions">
                  <div
                    className="chat-questions"
                    aria-label="Suggested rental questions"
                  >
                    {prompts[language].map((q) => (
                      <button
                        type="button"
                        disabled={chat.pending || !chat.restored}
                        key={q}
                        onClick={() => ask(q)}
                      >
                        {q}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                </MessageScrollerItem>
              )}
              {chat.pending && (
                <MessageScrollerItem messageId="pending">
                  <Marker role="status">
                    <LoaderCircle className="animate-spin" size={15} />
                    <MarkerContent>Looking up rental details…</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              )}
              {chat.error && (
                <MessageScrollerItem messageId="retry">
                  <div className="chat-error" role="alert">
                    {chat.error}
                    <button
                      type="button"
                      onClick={() =>
                        void chat.send(chat.turns.at(-1)?.text ?? '', true)
                      }
                    >
                      Retry reply
                    </button>
                  </div>
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton aria-label="Jump to latest message" />
        </MessageScroller>
      </MessageScrollerProvider>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault()
          ask(chat.draft)
        }}
      >
        <div className="chat-help-row">
          {chat.turns.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowPrompts(!showPrompts)}
              aria-expanded={showPrompts}
            >
              Quick questions
            </button>
          ) : (
            <span>For dates and final availability</span>
          )}
          <a
            href={whatsAppContact.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            Talk to U Drive <ArrowUpRight size={12} />
          </a>
        </div>
        <InputGroup className="chat-input">
          <InputGroupTextarea
            rows={1}
            aria-label="Your rental question"
            placeholder={
              language === 'ne'
                ? 'भाडाबारे सोध्नुहोस्…'
                : language === 'roman'
                  ? 'Rental bare sodhnuhos…'
                  : 'Ask about your rental…'
            }
            maxLength={maxQuestion}
            value={chat.draft}
            onChange={(e) => chat.setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)
                return
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(chat.draft)
              }
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              size="icon-sm"
              disabled={chat.pending}
              aria-label={
                voice.listening
                  ? 'Stop voice input'
                  : 'Dictate with your browser speech service'
              }
              aria-pressed={voice.listening}
              title="Dictate with your browser speech service"
              onClick={voice.toggle}
            >
              {voice.listening ? <MicOff /> : <Mic />}
            </InputGroupButton>
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={
                chat.pending ||
                !chat.draft.trim() ||
                !chat.restored ||
                voice.listening
              }
              aria-label="Send message"
            >
              <ArrowUp />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {voice.notice && (
          <p className="voice-notice" role="status">
            {voice.notice}
          </p>
        )}
        <p className="chat-footnote">
          {recent?.source === 'offline'
            ? 'Offline catalog guide'
            : 'Tab-session chat'}{' '}
          · No live availability or reservations.
        </p>
      </form>
    </>
  )
}
