import { expect, test } from '@playwright/test'
import { fleet, matchesCategory, whatsappHref } from '../lib/rental-data'
import {
  addRentalDays,
  daysBetween,
  readTrip,
  todayInNepal,
  validDate,
  type Trip,
} from '../lib/trip'
import {
  enquiryRows,
  enquiryText,
  validateStep,
  type Handover,
} from '../lib/booking'
import { catalogReply } from '../lib/rental-guide'
import { readAssistantRequest, type ChatTurn } from '../lib/rental-assistant'

const start = addRentalDays(todayInNepal(), 10)
const trip: Trip = {
  vehicle: 'byd-atto-3',
  mode: 'with-driver',
  pickup: 'Pokhara',
  start,
  end: addRentalDays(start, 5),
}
const customer = {
  name: 'Example Traveller',
  email: 'traveller@example.test',
  phone: '+977 9800000000',
  message: 'Two bags.',
}
const hand: Handover = {
  delivery: 'pickup',
  address: '',
  differentReturn: true,
  returnPoint: 'Kathmandu',
}
const ask = (text: string, history: ChatTurn[] = []) =>
  catalogReply({
    language: 'auto',
    messages: [...history, { role: 'user', text }],
  })

test('real calendar days and validated trip links', () => {
  expect(validDate('2025-02-29')).toBe(false)
  expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  expect(daysBetween(start, start)).toBe(0)
  expect(daysBetween(trip.end, start)).toBe(0)
  expect(readTrip({ ...trip, end: start }).end).toBe('')
  expect(readTrip({ vehicle: 'unknown', start: '2000-01-01' }).vehicle).toBe('')
  expect(readTrip({ start: '2000-01-01' }).start).toBe('')
  for (const town of ['Lumbini', 'Bandipur', 'Dhulikhel', 'Mustang']) {
    const suggestion = ask(`Pickup in ${town}?`)
    expect(suggestion.context?.pickup).toBe(town)
    expect(readTrip({ pickup: suggestion.context?.pickup }).pickup).toBe(town)
  }
})
test('an estimate uses the selected catalog rate, never a driver fee guess', () => {
  for (const v of fleet) {
    const rows = Object.fromEntries(
      enquiryRows({ ...trip, vehicle: v.slug }, hand, customer, v, {
        days: 5,
        rate: v.dailyRate,
        subtotal: v.dailyRate * 5,
        total: v.dailyRate * 5,
        delivery: 0,
        additional: 0,
        discount: 0,
        currency: 'NPR',
        driverQuoted: true,
      }),
    )
    expect(rows['Estimated total']).toBe(
      `NPR ${(v.dailyRate * 5).toLocaleString('en-US')}`,
    )
    expect(rows['Rental type']).toBe('With Driver')
    expect(rows['Driver service']).toContain('fee to be confirmed')
    expect(rows['Return location']).toBe('Kathmandu')
  }
  expect(
    Object.fromEntries(
      enquiryRows({ ...trip, mode: 'self-drive' }, hand, customer),
    )['Driver service'],
  ).toBeUndefined()
})
test('actionable field errors and required email', () => {
  expect(
    validateStep(4, trip, hand, { ...customer, email: '' }),
  ).toHaveProperty('email')
  expect(validateStep(4, trip, hand, customer)).toEqual({})
  expect(
    validateStep(4, trip, hand, {
      ...customer,
      name: ' ',
      email: 'not-an-email',
      phone: 'abc',
    }),
  ).toHaveProperty('email')
  expect(
    Object.keys(
      validateStep(4, trip, hand, { ...customer, name: '', phone: '' }),
    ),
  ).toEqual(['name', 'phone'])
  expect(
    validateStep(
      2,
      trip,
      { ...hand, delivery: 'delivery', returnPoint: '' },
      customer,
    ),
  ).toMatchObject({
    address: expect.any(String),
    returnPoint: expect.any(String),
  })
  expect(
    validateStep(3, { ...trip, end: start }, hand, customer),
  ).toHaveProperty('end')
})
test('WhatsApp links have the actual recipient and an unaltered enquiry', () => {
  const text = enquiryText(
    enquiryRows(trip, hand, {
      ...customer,
      message: 'Pokhara & return? नेपाली',
    }),
  )
  const url = new URL(whatsappHref(text))
  expect(url.origin + url.pathname).toBe('https://wa.me/9779800899505')
  expect(url.searchParams.get('text')).toBe(text)
  expect(new URL(whatsappHref()).searchParams.get('text')).toBe(
    'I want to know more about your cars and rental options.',
  )
})
test('catalog filters also work for additional vehicle types', () => {
  const added = {
    ...fleet[0],
    fuel: 'Petrol' as const,
    bodyType: 'Sedan' as const,
  }
  expect(matchesCategory(added, 'Petrol')).toBe(true)
  expect(matchesCategory(added, 'Sedan')).toBe(true)
  expect(matchesCategory(added, 'Electric')).toBe(false)
  expect(
    fleet.filter((v) => matchesCategory(v, 'Budget')).map((v) => v.slug),
  ).toContain('byd-atto-1')
})
for (const [question, expected] of [
  ['Which car is cheapest?', 'NPR 6,500'],
  ['I need a car for 5 days.', 'NPR 32,500'],
  ['Can I rent with a driver?', 'chauffeur fee'],
  ['Do you deliver outside Kathmandu?', 'delivery or one-way fee'],
  ['How much is BYD Atto 3?', 'NPR 9,000'],
  ['Which car is good for a family?', '5-seat'],
  ['How can I book a car?', 'WhatsApp'],
  ['Can I rent a car in Pokhara?', 'in Pokhara'],
  ['Self drive available?', 'self drive is offered'],
  ['Is this car available tomorrow?', 'not live availability'],
  ['BYD Atto 3 ko paanch din ko kati?', 'NPR 45,000'],
  ['एटो ३ को ५ दिनको भाडा कति?', 'NPR 45,000'],
])
  test(`guide: ${question}`, () => {
    const reply = ask(question)
    expect(reply.text).toContain(expected)
    expect(reply.source).toBe('catalog')
  })
test('guide retains vehicle and duration and escalates unknown questions', () => {
  const first = ask('Which car is cheapest?')
  const second = ask('for five days?', [first])
  expect(second.text).toContain('NPR 32,500')
  expect(ask('Atto 3 instead', [second]).text).toContain('NPR 45,000')
  expect(ask('What is your cancellation fee?').action).toBe('team')
  expect(ask('A question outside the rental catalog').action).toBe('team')
  for (const question of [
    'Atto 3 for -2 days',
    'Atto 3 for 0 days',
    'Atto 3 for 2.5 days',
    'Atto 3 for 370 days',
  ])
    expect(ask(question).action).toBe('team')
  expect(ask('Kun gadi sasto chha?').language).toBe('roman')
  expect(ask('सबैभन्दा सस्तो गाडी कुन हो?').language).toBe('ne')
})
test('assistant API refuses malformed input and does not cache conversations', async ({
  request,
}) => {
  expect(readAssistantRequest({ language: 'xx', messages: [] })).toBeNull()
  for (const data of [
    { language: 'en', messages: [] },
    { language: 'en', messages: [{ role: 'user', text: 'a'.repeat(601) }] },
  ])
    expect(
      (await request.post('/api/rental-assistant', { data })).status(),
    ).toBe(400)
  expect(
    (
      await request.post('/api/rental-assistant', {
        data: 'not-json',
        headers: { 'Content-Type': 'text/plain' },
      })
    ).status(),
  ).toBe(415)
  const result = await request.post('/api/rental-assistant', {
    data: {
      language: 'en',
      messages: [{ role: 'user', text: 'Which car is cheapest?' }],
    },
  })
  expect(result.ok()).toBe(true)
  expect(result.headers()['cache-control']).toBe('no-store')
  expect((await result.json()).source).toBe('catalog')
})
