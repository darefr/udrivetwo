'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { CalendarDays } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { displayDate, validDate } from '@/lib/trip'

const Calendar = dynamic(
  () => import('@/components/ui/calendar').then((module) => module.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="calendar-loading" role="status">
        Loading calendar…
      </div>
    ),
  },
)
const localDate = (key: string) => new Date(`${key}T12:00:00`)
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function DatePicker({
  id,
  label,
  value,
  min,
  onChange,
  compact = false,
  invalid = false,
}: {
  id: string
  label: string
  value: string
  min: string
  onChange: (value: string) => void
  compact?: boolean
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState('')
  const choose = (key: string) => {
    onChange(key)
    setOpen(false)
    setError('')
  }
  const apply = () => {
    if (!validDate(draft) || draft < min) {
      setError(`Enter a valid date on or after ${displayDate(min)}.`)
      return
    }
    choose(draft)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setDraft(value)
        setError('')
        setOpen(next)
      }}
    >
      <PopoverTrigger
        id={id}
        type="button"
        aria-label={`${label}: ${displayDate(value)}`}
        data-value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={
          compact
            ? 'search-control travel-date-trigger'
            : 'form-date-trigger travel-date-trigger'
        }
      >
        <CalendarDays size={16} />
        <span>{displayDate(value)}</span>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={7} className="date-popover">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        <Calendar
          className="travel-calendar"
          mode="single"
          autoFocus
          selected={value ? localDate(value) : undefined}
          defaultMonth={localDate(value || min)}
          startMonth={localDate(min)}
          disabled={{ before: localDate(min) }}
          onSelect={(date) => {
            if (date) choose(dateKey(date))
          }}
        />
        <div className="date-manual">
          <label htmlFor={`${id}-manual`}>
            Enter a date <span>(YYYY-MM-DD)</span>
          </label>
          <div>
            <input
              id={`${id}-manual`}
              type="text"
              autoComplete="off"
              maxLength={10}
              value={draft}
              placeholder="YYYY-MM-DD"
              aria-invalid={!!error}
              onChange={(e) => {
                setDraft(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)
                  return
                if (e.key === 'Enter') {
                  e.preventDefault()
                  apply()
                }
              }}
            />
            <button type="button" onClick={apply}>
              Apply
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="date-error">
            {error}
          </p>
        )}
        {value && (
          <button
            type="button"
            className="clear-date"
            onClick={() => choose('')}
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
