import {
  destinations,
  fleet,
  money as formatMoney,
  type Vehicle,
} from './rental-data'
import type {
  AssistantReply,
  AssistantRequest,
  ChatTurn,
  RentalContext,
  ReplyLanguage,
} from './rental-assistant'

const normalize = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[‐‑–—-](?!\d)/g, ' ')
const numWords: [RegExp, string][] = [
  [/\b(one|ek)\b|एक(?=\s*दिन)/g, '1'],
  [/\b(two|dui)\b|दुई/g, '2'],
  [/\b(three|tin|teen)\b|तीन/g, '3'],
  [/\b(four|char|chaar)\b|चार/g, '4'],
  [/\b(five|panch|paanch|pach)\b|पाँच|पांच/g, '5'],
  [/\b(six|chha)\b(?=\s+(?:days?|din))|छ(?=\s*दिन)/g, '6'],
  [/\b(seven|saat|sat)\b|सात/g, '7'],
  [/\b(eight|aath)\b|आठ/g, '8'],
  [/\b(nine|nau)\b|नौ/g, '9'],
  [/\b(ten|das)\b|दस/g, '10'],
]
const modelText = (text: string) =>
  normalize(text)
    .replace(/दीपल|डिपल|दिपल/g, 'deepal')
    .replace(/एटो|अटो|एट्टो/g, 'atto')
    .replace(/नेक्सन|नेक्सोन/g, 'nexon')
    .replace(/\W/gu, '')
function namedCar(text: string, fleet: Vehicle[]) {
  const compact = modelText(text)
  return fleet.find((v) =>
    [
      v.name,
      v.name.split(' ').slice(1).join(' '),
      ...(v.slug === 'deepal-s05' ? ['deepal', 's05'] : []),
    ]
      .map(modelText)
      .some((name) => name.length > 1 && compact.includes(name)),
  )
}
function detect(text: string, previous?: ReplyLanguage): ReplyLanguage {
  if (/[\u0900-\u097f]/u.test(text)) return 'ne'
  if (
    /\b(malai|mero|hamilai|gadi|gaadi|sasto|sabai|kati|kun|chha|cha|chahiyo|chaincha|milcha|milchha|paincha|paaincha|din|dinko|dinlai|lagi|bahira|bhada|bhaada|kasari|parivar|bata|sanga|ho|ma|huncha|hoina)\b/.test(
      text,
    )
  )
    return 'roman'
  if (text.length < 12 && !/\b(car|cheap|price|book|day|days)\b/.test(text))
    return previous ?? 'en'
  return 'en'
}
function duration(text: string) {
  let n = text
  for (const [pattern, value] of numWords) n = n.replace(pattern, value)
  const found = n.match(
    /(-?\d{1,5}(?:\.\d+)?)\s*(days?\b|din(?:ko|lai|ka)?\b|दिन|weeks?\b|hapta|हप्ता)/,
  )
  if (found)
    return Number(found[1]) * (/week|hapta|हप्ता/.test(found[2]) ? 7 : 1)
  return /\ba week\b|एक हप्ता/.test(text) ? 7 : undefined
}
const cityAliases: Record<string, RegExp> = {
  pokhara: /पोखरा/,
  kathmandu: /काठमाडौं|काठमाडौँ|काठमाण्डौ|ktm\b/,
  chitwan: /चितवन/,
  nagarkot: /नगरकोट/,
}

export function catalogReply(
  { messages, language: requested }: AssistantRequest,
  source = { fleet, destinations, currency: 'NPR' },
): AssistantReply {
  const { fleet: carsInCatalog, destinations: areas } = source
  const money = (value: number) => formatMoney(value, source.currency)
  const text = normalize(messages.at(-1)?.text ?? '')
  const prior = messages
    .slice(0, -1)
    .reverse()
    .find((m) => m.role === 'assistant')
  const language =
    requested === 'auto' ? detect(text, prior?.language) : requested
  const say = (en: string, ne: string, roman: string) =>
    ({ en, ne, roman })[language]
  const context: RentalContext = { ...prior?.context }
  const answer = (
    reply: string,
    action: ChatTurn['action'] = 'booking',
  ): AssistantReply => ({
    role: 'assistant',
    text: reply,
    source: 'catalog',
    language,
    context,
    action,
  })
  const named = namedCar(text, carsInCatalog)
  if (named) context.vehicle = named.slug
  const city = areas.find(
    (d) =>
      text.includes(d.name.toLowerCase()) || cityAliases[d.slug]?.test(text),
  )
  if (city) context.pickup = city.name
  const self =
    /self\s*drive|without (?:a )?driver|no driver|aafai|afai|आफैं|आफै|सेल्फ|चालक बिना/.test(
      text,
    )
  const driver = !self && /driver|chauffeur|चालक|ड्राइभर|ड्राइवर/.test(text)
  if (self || driver) context.mode = self ? 'self-drive' : 'with-driver'
  const requestedDays = duration(text)
  if (
    requestedDays !== undefined &&
    (!Number.isInteger(requestedDays) ||
      requestedDays < 1 ||
      requestedDays > 365)
  )
    return answer(
      say(
        'The guide estimates whole-day rentals from 1 to 365 days. For another duration, the team can quote your trip.',
        '१ देखि ३६५ पूरा दिनको अनुमान निकाल्न सकिन्छ। अरू अवधिका लागि टोलीसँग कुरा गर्नुहोस्।',
        'Guide le 1 dekhi 365 pura din ko estimate dinchha. Aru duration ko lagi team sanga kura garnuhos.',
      ),
      'team',
    )
  if (requestedDays) context.days = requestedDays
  const days = context.days
  const cars = carsInCatalog
    .filter(
      (v) =>
        v.availability !== 'Unavailable' &&
        (!context.mode || v.modes.includes(context.mode)),
    )
    .sort((a, b) => a.dailyRate - b.dailyRate)
  if (!cars.length)
    return answer(
      say(
        'Please ask our rental desk for cars for this trip.',
        'यो यात्राका लागि हाम्रो टोलीलाई सोध्नुहोस्।',
        'Yo trip ko lagi rental team lai sodhnuhos.',
      ),
      'team',
    )
  const lowest = cars[0]
  const highest = cars[cars.length - 1]
  const budget = /cheap|lowest|budget|affordable|sasto|सस्तो|कम मूल्य/.test(text)
  const family =
    /family|families|children|parents|parivar|pariwar|बच्चा|परिवार/.test(text)
  const pricing =
    /price|rate|cost|how much|estimate|total|kati|bhada|bhaada|कति|मूल्य|भाडा|दर/.test(
      text,
    )
  const pickup =
    /deliver|pickup|pick up|drop off|handover|outside (?:of )?(?:kathmandu|the valley|the city|ktm)|airport|hotel|bahira|नेपालभर|बाहिर|डेलिभरी|एयरपोर्ट|छोड्न|पुर्‍याउ|पिकअप/.test(
      text,
    )
  const fees = say(
    'Driver and delivery fees are quoted separately. The team confirms availability for your dates.',
    'चालक र डेलिभरी शुल्क छुट्टै तय हुन्छ। तपाईंको मितिमा गाडी उपलब्ध छ कि छैन टोलीले पुष्टि गर्छ।',
    'Driver ra delivery fee chhuttai hunchha. Tapai ko dates ma gadi available chha ki chhaina, team le confirm garchha.',
  )
  const estimate = (v: Vehicle) =>
    days
      ? say(
          `For ${days} ${days === 1 ? 'day' : 'days'}, the vehicle estimate is ${money(v.dailyRate * days)} (${money(v.dailyRate)}/day).`,
          `${days} दिनका लागि गाडीको अनुमानित भाडा ${money(v.dailyRate * days)} हो (प्रतिदिन ${money(v.dailyRate)})।`,
          `${days} din ko vehicle estimate ${money(v.dailyRate * days)} ho (${money(v.dailyRate)}/day).`,
        )
      : ''
  const join = (...parts: string[]) => parts.filter(Boolean).join('\n\n')
  if (
    /refund|cancel|deposit|insurance|accident|damage|payment|licen[cs]e|documents?|passport|जमानत|धरौटी|बीमा|लाइसेन्स|कागजात|डिपोजिट/.test(
      text,
    )
  )
    return answer(
      say(
        'The rental desk must confirm the licence, identification, deposit, insurance and cancellation terms for your trip. Tell them your car and dates on WhatsApp; please do not upload identity or payment details here.',
        'लाइसेन्स, परिचयपत्र, धरौटी, बीमा र रद्द गर्ने सर्त टोलीले पुष्टि गर्छ। WhatsApp मा गाडी र मिति बताउनुहोस्। यहाँ परिचयपत्र वा भुक्तानी विवरण नपठाउनुहोस्।',
        'Licence, ID, deposit, insurance ra cancellation terms team le confirm garchha. WhatsApp ma gadi ra dates pathaunuhos; yaha ID wa payment details napathaunuhos.',
      ),
      'team',
    )
  if (
    /book|reserve|reservation|kasari|बुकिङ|बुकिंग|बुक गर्ने|कसरी/.test(text) &&
    !pricing &&
    !budget
  )
    return answer(
      say(
        'Choose your vehicle and rental type, add the handover location and dates, then enter your contact details. Review the estimate and select Submit booking request to receive a reference. WhatsApp is optional. No account or payment is needed. Only the rental desk can confirm a reservation.',
        'गाडी र भाडाको प्रकार छान्नुहोस्। स्थान, मिति र सम्पर्क विवरण राखेर अनुमान हेर्नुहोस्। त्यसपछि WhatsApp मा अनुरोध पठाउनुहोस्। खाता वा अग्रिम भुक्तानी चाहिँदैन। बुकिङ टोलीले पुष्टि गर्छ।',
        'Gadi ra rental type chhannuhos, location, dates ra contact details rakhnu hos. Estimate herera WhatsApp ma enquiry send garnuhos. Account chahidaina; booking team le confirm garchha.',
      ),
    )
  if (budget || family) {
    const car = family
      ? (cars.find(
          (v) => v.seats >= 5 && v.bodyType === 'SUV' && v.fuel === 'Electric',
        ) ?? cars.find((v) => v.seats >= 5))
      : lowest
    if (!car)
      return answer(
        say(
          'Tell the rental team your passenger and luggage count so they can suggest a suitable car.',
          'यात्रु र सामानको संख्या टोलीलाई बताउनुहोस्।',
          'Passenger ra luggage count team lai bhannuhos.',
        ),
        'team',
      )
    context.vehicle = car.slug
    const lead = family
      ? say(
          `For a family, consider the ${car.name}: a ${car.seats}-seat ${car.bodyType} at ${money(car.dailyRate)}/day. That includes the driver’s seat. How many people and bags are travelling?`,
          `परिवारका लागि ${car.name} हेर्नुहोस्। चालकसहित ${car.seats} सिट भएको यो ${car.bodyType} को दैनिक भाडा ${money(car.dailyRate)} हो। कति यात्रु र सामान छन्?`,
          `Family ko lagi ${car.name} ramro option ho: driver sahit ${car.seats} seats, ${money(car.dailyRate)}/day. Kati jana ra kati luggage chha?`,
        )
      : say(
          `The lowest published rate is the ${car.name} at ${money(car.dailyRate)} per day. It is a ${car.seats}-seat ${car.bodyType.toLowerCase()}.`,
          `सबैभन्दा सस्तो विकल्प ${car.name} हो। ${car.seats} सिट भएको यो गाडीको दैनिक भाडा ${money(car.dailyRate)} हो।`,
          `Sabai bhanda sasto ${car.name} ho: ${money(car.dailyRate)} per day, ${car.seats} seats.`,
        )
    return answer(join(lead, estimate(car), fees))
  }
  if (
    /availab|free on|vacan|खाली|उपलब्ध/.test(text) &&
    !self &&
    !driver &&
    !pricing
  )
    return answer(
      say(
        `I can check published details, but not live availability. Send the team your pickup and return dates${named ? ` for the ${named.name}` : ''} to check the calendar.`,
        'म दैनिक भाडा बताउन सक्छु, तर उपलब्धता प्रत्यक्ष हेर्न सक्दिनँ। गाडी र मिति WhatsApp मा पठाएर पुष्टि गर्नुहोस्।',
        'Ma published rate batauna sakchhu, live availability herna sakdina. Gadi ra pickup/return dates WhatsApp ma pathayera confirm garnuhos.',
      ),
      'team',
    )
  if (pickup || (city && !pricing && !named && !requestedDays)) {
    const area = city?.name ?? 'Nepal'
    return answer(
      say(
        `Yes, you can request a handover ${city ? `in ${area}` : 'outside Kathmandu, across Nepal'}. U Drive is based in Kathmandu. Share both pickup and return points plus your dates; the team will agree access, timing and any delivery or one-way fee.`,
        `${city ? area + ' मा' : 'काठमाडौंबाहिर नेपालभर'} गाडी लिन वा फिर्ता गर्न अनुरोध गर्न सक्नुहुन्छ। मिति र दुवै स्थान बताउनुहोस्। काठमाडौंको टोलीले समय र डेलिभरी शुल्क पुष्टि गर्छ।`,
        `${city ? area + ' ma' : 'Kathmandu bahira Nepal bhari'} pickup wa delivery request garna milchha. Pickup ra return location ani dates dinuhos. Timing ra delivery fee Kathmandu team le confirm garchha.`,
      ),
    )
  }
  if ((self || driver) && !pricing && !requestedDays && !named)
    return answer(
      self
        ? say(
            'Yes, self drive is offered. Choose Self Drive in the rental planner and tell us your route. The team will confirm the vehicle, licence requirements and deposit before handover.',
            'हो, सेल्फ ड्राइभ उपलब्ध छ। फारममा Self Drive छानेर आफ्नो रुट दिनुहोस्। गाडी, लाइसेन्स र धरौटीबारे टोलीले पुष्टि गर्छ।',
            'Ho, self drive milchha. Planner ma Self Drive chhanera route dinuhos. Gadi, licence ra deposit ko detail team le confirm garchha.',
          )
        : say(
            'Yes. Choose With Driver and share your route, passenger count and dates. The listed daily rate is for the car; the chauffeur fee is confirmed separately before you book.',
            'हो, चालकसहित गाडी लिन सक्नुहुन्छ। With Driver छानेर रुट, यात्रु संख्या र मिति बताउनुहोस्। दैनिक भाडा गाडीको मात्र हो; चालक शुल्क छुट्टै पुष्टि हुन्छ।',
            'Ho, driver sahit gadi lina milchha. With Driver chhanera route, passengers ra dates dinuhos. Car ko rate ra driver fee chhuttai ho.',
          ),
    )
  if (named || pricing || requestedDays) {
    const car = named ?? carsInCatalog.find((v) => v.slug === context.vehicle)
    if (car)
      return answer(
        join(
          say(
            `${car.name} is listed at ${money(car.dailyRate)} per day. ${car.seats} seats · ${car.bodyType}.`,
            `${car.name} को दैनिक भाडा ${money(car.dailyRate)} हो। ${car.seats} सिट · ${car.bodyType}।`,
            `${car.name} ko daily rate ${money(car.dailyRate)} ho. ${car.seats} seats · ${car.bodyType}.`,
          ),
          estimate(car),
          fees,
        ),
      )
    if (days)
      return answer(
        join(
          say(
            `For ${days} days, the vehicle estimate ranges from ${money(lowest.dailyRate * days)} for the ${lowest.name} to ${money(highest.dailyRate * days)} for the ${highest.name}. Which car are you considering?`,
            `${days} दिनको अनुमान ${lowest.name} का लागि ${money(lowest.dailyRate * days)} देखि ${highest.name} का लागि ${money(highest.dailyRate * days)} सम्म हुन्छ। कुन गाडी हेर्दै हुनुहुन्छ?`,
            `${days} din ko estimate ${lowest.name} ma ${money(lowest.dailyRate * days)} dekhi ${highest.name} ma ${money(highest.dailyRate * days)} samma hunchha. Kun gadi herdaichha?`,
          ),
          fees,
        ),
        'fleet',
      )
    return answer(
      join(
        say(
          'Here are the published vehicle rates per day:',
          'गाडीहरूको प्रकाशित दैनिक भाडा:',
          'Published daily rates yesta chhan:',
        ),
        cars.map((v) => `${v.name} — ${money(v.dailyRate)}`).join('\n'),
        fees,
      ),
      'fleet',
    )
  }
  if (
    /whatsapp|human|team|person|support|phone|contact|मान्छे|सम्पर्क|फोन/.test(text)
  )
    return answer(
      say(
        'The Kathmandu rental desk can help with your exact dates, special requests and final pricing. Open the WhatsApp link below to speak to U Drive.',
        'ठ्याक्कै मिति, विशेष अनुरोध र अन्तिम मूल्यका लागि तलको WhatsApp लिंकबाट हाम्रो टोलीसँग कुरा गर्नुहोस्।',
        'Exact dates, special request ra final price ko lagi tala ko WhatsApp link bata team sanga kura garnuhos.',
      ),
      'team',
    )
  return answer(
    say(
      'I’m the U Drive catalog guide, not a live AI or reservation system. I can compare our cars, calculate a daily-rate estimate, and explain rental options or delivery. Try “BYD Atto 3 for 5 days”, or ask the rental desk for a tailored answer.',
      'म U Drive को क्याटलग गाइड हुँ, प्रत्यक्ष AI वा बुकिङ प्रणाली होइन। म गाडी, दैनिक भाडा र डेलिभरीबारे बताउन सक्छु। “BYD Atto 3 को ५ दिनको भाडा कति?” सोध्नुहोस्, वा टोलीसँग कुरा गर्नुहोस्।',
      'Ma U Drive ko catalog guide ho, live AI wa booking system hoina. Gadi compare garna, rate nikalna ra delivery bare batauna sakchhu. “Atto 3 ko 5 din ko kati?” sodhnuhos, wa team sanga kura garnuhos.',
    ),
    'team',
  )
}
