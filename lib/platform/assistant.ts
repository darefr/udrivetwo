import { generateText, Output } from 'ai'
import { z } from 'zod'
import { catalog } from './catalog'
import { query, settings, database } from './database'
import { session } from './security'
import { estimate } from './bookings'
import { catalogReply } from '../rental-guide'
import { validDate } from '../trip'
import { money } from '../rental-data'
import type { RentalResponder, AssistantReply } from '../rental-assistant'
const intents = [
  'budget',
  'family',
  'prices',
  'booking',
  'pickup',
  'contact',
  'self-drive',
  'with-driver',
  'other',
] as const
export const rentalResponder: RentalResponder = async (input, signal) => {
  const [live, cfg] = await Promise.all([catalog(), settings()])
  const original = input.messages.at(-1)!.text
  const mode = /with driver|chauffeur|चालकसहित/i.test(original)
    ? 'with-driver'
    : input.messages
        .slice()
        .reverse()
        .find((m) => m.context?.mode)?.context?.mode
  const source = {
    fleet: live.fleet.map((v) => ({
      ...v,
      dailyRate:
        (mode === 'with-driver' ? v.driver_rate : v.self_rate) ?? v.dailyRate,
    })),
    destinations: live.destinations,
    currency: cfg.currency,
  }
  const base = catalogReply(input, source)
  const ne = base.language === 'ne'
  const roman = base.language === 'roman'
  const say = (en: string, dev: string, rom: string) =>
    ne ? dev : roman ? rom : en
  const answer = (
    text: string,
    action: AssistantReply['action'] = 'team',
  ): AssistantReply => ({ ...base, text, action, source: 'catalog' })
  if (!cfg.assistantEnabled)
    return answer(
      say(
        'The rental guide is paused. Please contact the Kathmandu desk.',
        'अहिले सहायक बन्द छ। कृपया काठमाडौं टोलीलाई सम्पर्क गर्नुहोस्।',
        'Guide banda chha. Kathmandu team lai samparka garnuhos.',
      ),
    )
  const reference = original.match(/\bUD-[A-F0-9]{16}\b/i)?.[0].toUpperCase()
  if (
    reference ||
    /my booking|booking status|reservation status|मेरो बुकिङ|बुकिङको अवस्था|mero booking/i.test(
      original,
    )
  ) {
    const u = await session()
    if (!u)
      return answer(
        say(
          'Sign in to see your own booking status. I cannot look up a rental by phone number or email.',
          'आफ्नो बुकिङ अवस्था हेर्न साइन इन गर्नुहोस्। फोन वा इमेलबाट अरूको बुकिङ हेर्न मिल्दैन।',
          'Aafno booking status herna sign in garnuhos.',
        ),
      )
    const [b] = await query(
      'SELECT b.id,b.status,v.name,b.pickup_date::text AS start,b.return_date::text AS finish FROM bookings b JOIN vehicles v ON v.slug=b.vehicle_id WHERE b.customer_id=$1 AND ($2::text IS NULL OR b.id=$2) ORDER BY b.created_at DESC LIMIT 1',
      [u.customer_id, reference ?? null],
    )
    return b
      ? answer(
          `${say('Your rental', 'तपाईंको बुकिङ', 'Tapai ko booking')}: ${b.id}\n${b.name} · ${b.start} – ${b.finish}\n${say('Status', 'अवस्था', 'Status')}: ${b.status}`,
        )
      : answer(
          say(
            'No matching rental was found in your account. Contact the desk with your reference.',
            'तपाईंको खातामा यो बुकिङ भेटिएन। टोलीसँग सम्पर्क गर्नुहोस्।',
            'Tapai ko account ma booking bhetiyena. Team lai sodhnuhos.',
          ),
        )
  }
  if (
    /availab|free on|खाली|उपलब्ध|khali/i.test(original) &&
    !/(self.drive|with.driver) available\??$/i.test(original)
  ) {
    const dates = original.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []
    const car = live.fleet.find((v) => v.slug === base.context?.vehicle)
    if (!car || dates.length !== 2 || !dates.every(validDate))
      return answer(
        say(
          'Which vehicle, pickup date and return date should I check? Use YYYY-MM-DD for both dates. A catalog listing alone is not availability.',
          'कुन गाडी र कुन मितिका लागि हो? लिने र फर्काउने दुवै मिति YYYY-MM-DD मा दिनुहोस्।',
          'Kun gadi ra kun dates chahinchha? Pickup ra return date YYYY-MM-DD ma dinuhos.',
        ),
      )
    try {
      const r = await estimate(await database(), {
        vehicle: car.slug,
        mode: mode ?? 'self-drive',
        pickup: base.context?.pickup || live.pickupLocations[0],
        start: dates[0],
        end: dates[1],
        delivery: 'pickup',
        offer: '',
      })
      return answer(
        `${car.name} · ${dates.join(' – ')}\n${say('Open for a request at the time of this check. This is not a reservation.', 'अहिले अनुरोध गर्न मिल्छ। बुकिङ पुष्टि भएको होइन।', 'Ahile request garna milchha. Booking confirm bhayeko hoina.')}\n${say('Estimate', 'अनुमान', 'Estimate')}: ${money(r.quote.total, r.quote.currency)}`,
        'booking',
      )
    } catch {
      return answer(
        say(
          'I cannot offer this car for that date range. Try other dates or contact the desk.',
          'यी मितिका लागि यो गाडी दिन सकिँदैन। अरू मिति छान्नुहोस् वा टोलीलाई सम्पर्क गर्नुहोस्।',
          'Yi dates ma yo gadi dina sakidaina. Aru dates wa team lai sodhnuhos.',
        ),
      )
    }
  }
  if (/business hours|opening hours|office hours|खुल्ने समय/i.test(original))
    return answer(`${cfg.company}\n${cfg.hours}\nWhatsApp: ${cfg.whatsapp}`)
  if (/contact|whatsapp|सम्पर्क/i.test(original))
    return answer(
      `${cfg.company}\nWhatsApp: ${cfg.whatsapp}${cfg.email ? '\n' + cfg.email : ''}`,
    )
  if (process.env.AI_MODE !== 'gateway' || base.action !== 'team') return base
  try {
    const { output } = await generateText({
      model: process.env.AI_MODEL || 'openai/gpt-5.4-mini',
      output: Output.object({
        schema: z.object({
          intent: z.enum(intents),
          vehicle: z.string().nullable(),
          days: z.number().int().min(1).max(365).nullable(),
        }),
      }),
      system:
        'Classify a rental question. Do not answer it. Extract only a vehicle or duration explicitly present; otherwise return null. Use other for unsupported topics. Rental models: ' +
        source.fleet.map((v) => v.name).join(', '),
      prompt: original
        .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
        .replace(/\+?[\d ()-]{7,}/g, '[number]'),
      maxRetries: 0,
      abortSignal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(7000)])
        : AbortSignal.timeout(7000),
    })
    if (output.intent === 'other') return base
    const named = source.fleet.find((v) => v.name === output.vehicle)
    const canonical = {
      budget: 'cheapest car',
      family: 'family vehicle',
      prices: 'daily rates',
      booking: 'how to book',
      pickup: 'delivery outside Kathmandu',
      contact: 'contact team',
      'self-drive': 'self drive',
      'with-driver': 'chauffeur',
    }[output.intent]
    const result = catalogReply(
      {
        language: base.language || 'en',
        messages: [
          ...input.messages.slice(0, -1),
          {
            role: 'user',
            text: `${canonical} ${named?.name || ''} ${output.days ? output.days + ' days' : ''}`,
          },
        ],
      },
      source,
    )
    return { ...result, source: 'ai' }
  } catch {
    return base
  }
}
