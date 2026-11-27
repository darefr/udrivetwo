import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { addRentalDays, todayInNepal } from '../lib/trip'

const start = addRentalDays(todayInNepal(), 10)
const end = addRentalDays(start, 5)
const ready = async (page: Page) =>
  expect(page.locator('.support-dock[data-ready="true"]')).toBeVisible()
const next = async (page: Page, step: number) => {
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('.rental-planner')).toHaveAttribute(
    'data-step',
    String(step),
  )
}

test('search, dates, recalculation, seven steps, review and WhatsApp handoff', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.rental-search')).toHaveAttribute(
    'data-ready',
    'true',
  )
  await page
    .getByLabel('Pickup Location', { exact: true })
    .selectOption('Pokhara')
  await page.getByLabel('Vehicle', { exact: true }).selectOption('byd-atto-3')
  await page
    .getByLabel('Rental Type', { exact: true })
    .selectOption('with-driver')
  await page.getByRole('button', { name: 'Pickup Date: Select date' }).click()
  await page.getByLabel('Enter a date').fill(start)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.getByRole('button', { name: 'Find a Car' }).click()
  await expect(page.locator('.rental-search').getByRole('alert')).toContainText(
    'later return date',
  )
  await page.getByRole('button', { name: 'Return Date: Select date' }).click()
  await page.getByLabel('Enter a date').fill(start)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.locator('.date-error')).toContainText('on or after')
  await page.getByLabel('Enter a date').fill(end)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.getByRole('button', { name: 'Find a Car' }).click()
  await expect(page.locator('.vehicle-card')).toHaveCount(1)
  await page.locator('.vehicle-card .small-book').click()
  await expect(page.locator('#booking-vehicle')).toHaveValue('byd-atto-3')
  await expect(page.locator('.estimated-total')).toContainText('NPR 45,000')
  await page.locator('#booking-vehicle').selectOption('byd-atto-1')
  await expect(page.locator('.estimated-total')).toContainText('NPR 32,500')
  await next(page, 2)
  await expect(page.getByRole('radio', { name: 'With Driver' })).toBeChecked()
  await page.getByRole('radio', { name: 'Self Drive' }).check()
  await expect(page.locator('.summary-lines')).not.toContainText(
    'Driver service',
  )
  await page.getByRole('radio', { name: 'With Driver' }).check()
  await next(page, 3)
  await expect(page.locator('#booking-pickup')).toHaveValue('Pokhara')
  await page.locator('#booking-handover').selectOption('delivery')
  await page
    .getByRole('checkbox', { name: 'Return the car to a different location' })
    .check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.locator('#booking-address')).toBeFocused()
  await page.locator('#booking-address').fill('Lakeside, Pokhara')
  await page.locator('#booking-returnPoint').fill('Kathmandu airport')
  await next(page, 4)
  await next(page, 5)
  await page.getByRole('button', { name: 'Review rental', exact: true }).click()
  await expect(page.locator('#booking-name')).toBeFocused()
  await page.locator('#booking-name').fill('Example Traveller')
  await page.locator('#booking-phone').fill('abc')
  await page.locator('#booking-email').fill('invalid')
  await page.getByRole('button', { name: 'Review rental', exact: true }).click()
  await expect(page.locator('#booking-phone-error')).toBeVisible()
  await expect(page.locator('#booking-email-error')).toBeVisible()
  await page.locator('#booking-phone').fill('+977 9800000000')
  await page.locator('#booking-email').fill('traveller@example.com')
  await page.getByRole('button', { name: 'Review rental', exact: true }).click()
  await expect(page.locator('.review-details')).toContainText(
    'Kathmandu airport',
  )
  await expect(page.locator('.review-details')).toContainText('5 days')
  await page.getByRole('button', { name: 'Continue to contact' }).click()
  await expect(page.locator('.rental-planner')).toHaveAttribute(
    'data-step',
    '7',
  )
  const href = await page
    .getByRole('link', { name: 'Open WhatsApp', exact: true })
    .getAttribute('href')
  const url = new URL(href!)
  expect(url.pathname).toBe('/9779800899505')
  expect(url.searchParams.get('text')).toContain('NPR 32,500')
  expect(url.searchParams.get('text')).toContain('With Driver')
  expect(url.searchParams.get('text')).toContain('Kathmandu airport')
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download a copy' }).click()
  const file = await downloaded
  expect(await readFile((await file.path())!, 'utf8')).toBe(
    url.searchParams.get('text'),
  )
  expect(page.url()).not.toContain('example.com')
})

test('fleet sorting, empty categories, reset, and detail gallery', async ({
  page,
}) => {
  await page.goto('/fleet')
  await ready(page)
  await page.getByLabel('Sort vehicles').selectOption('low')
  await expect(page.locator('.vehicle-card h3').first()).toHaveText(
    'BYD Atto 1',
  )
  await page.getByRole('button', { name: 'Premium', exact: true }).click()
  await expect(page.locator('.vehicle-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Sedan', exact: true }).click()
  await expect(page.getByText('No cars match this selection.')).toBeVisible()
  await page.getByRole('link', { name: 'Reset filters' }).click()
  await expect(page.locator('.vehicle-card')).toHaveCount(4)
  await page.getByRole('link', { name: 'View Deepal S05 details' }).click()
  await page.getByRole('button', { name: 'Enlarge vehicle photo' }).click()
  await page.getByRole('button', { name: 'Next photo' }).click()
  await expect(page.locator('.lightbox-footer')).toContainText(
    'Rear three-quarter view',
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.gallery-dialog')).not.toBeVisible()
})

test('mobile drawer includes useful scrollable sections and restores focus', async ({
  page,
}) => {
  await page.goto('/')
  await ready(page)
  const trigger = page.getByRole('button', { name: 'Open navigation' })
  await trigger.click()
  const menu = page.getByRole('dialog', { name: 'Main navigation' })
  await expect(menu).toBeVisible()
  await expect(menu.locator('.drawer-account + .drawer-booking')).toHaveCount(1)
  await expect(
    menu.getByRole('link', { name: 'Sign In', exact: true }),
  ).toHaveCount(1)
  await expect(
    menu.getByRole('link', { name: 'Create Account', exact: true }),
  ).toHaveCount(1)
  await expect(menu.locator('.drawer-route-list a')).toHaveCount(4)
  expect(await menu.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  )
  for (const label of [
    'Popular vehicles',
    'Explore Nepal',
    'Your Kathmandu rental desk',
  ])
    await expect(menu.getByRole('heading', { name: label })).toBeVisible()
  await expect(
    menu.getByRole('link', { name: 'Rent Now', exact: true }),
  ).toHaveAttribute('href', '/booking')
  await menu
    .getByRole('link', { name: 'Create Account' })
    .scrollIntoViewIfNeeded()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await menu.getByRole('link', { name: 'Sign In', exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(menu).not.toBeVisible()
})

test('session chat, honest source, multilingual follow-up and rental handoff', async ({
  page,
}) => {
  await page.goto('/')
  await ready(page)
  await page.getByRole('button', { name: 'Open U Drive AI assistant' }).click()
  const chat = page.getByRole('dialog', { name: 'U Drive Rental AI Assistant' })
  await expect(chat).toContainText('Live AI not connected')
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    '**/api/rental-assistant',
    async (route) => {
      await gate
      await route.continue()
    },
    { times: 1 },
  )
  await chat.getByRole('button', { name: 'Which car is cheapest?' }).click()
  await expect(chat.getByRole('status')).toContainText(
    'Looking up rental details',
  )
  release()
  await expect(chat.getByRole('log')).toContainText('NPR 6,500')
  await chat.getByRole('textbox').fill('paanch din ko kati?')
  await chat.getByRole('button', { name: 'Send message' }).click()
  await expect(chat.getByRole('log')).toContainText('NPR 32,500')
  await page.reload()
  await ready(page)
  await page.getByRole('button', { name: 'Open U Drive AI assistant' }).click()
  await expect(chat.getByRole('log')).toContainText('paanch din ko kati?')
  await chat.getByLabel('Assistant language').selectOption('ne')
  await chat.getByRole('textbox').fill('एटो ३ को भाडा कति?')
  await chat.getByRole('textbox').press('Enter')
  await expect(chat.getByRole('log')).toContainText('NPR 45,000')
  await chat.getByRole('link', { name: 'Plan this rental' }).last().click()
  await expect(page.locator('#booking-vehicle')).toHaveValue('byd-atto-3')
  await expect(page).toHaveURL(/duration=5/)
  await next(page, 2)
  await next(page, 3)
  await next(page, 4)
  await page.locator('#booking-start').click()
  await page.getByLabel('Enter a date').fill(start)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.locator('#booking-end')).toHaveAttribute('data-value', end)
  await expect(page.locator('.estimated-total')).toContainText('NPR 45,000')
})

test('assistant handles offline mode, unsupported voice and clearing history', async ({
  page,
}) => {
  await page.goto('/')
  await ready(page)
  await page.evaluate(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    })
  })
  await page.route('**/api/rental-assistant', (r) => r.abort())
  await page.getByRole('button', { name: 'Open U Drive AI assistant' }).click()
  const chat = page.locator('.rental-chat-panel')
  await chat
    .getByRole('button', { name: 'Dictate with your browser speech service' })
    .click()
  await expect(chat.locator('.voice-notice')).toContainText('not supported')
  await chat.getByRole('button', { name: 'Pickup in Pokhara?' }).click()
  await expect(chat).toContainText('Offline catalog guide')
  await expect(chat.getByRole('log')).toContainText('in Pokhara')
  await chat.getByRole('button', { name: 'Clear chat', exact: true }).click()
  await chat.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(chat.getByRole('log')).not.toContainText('You:')
})

test('hero rotation, manual controls, mobile reviews and frequently asked questions', async ({
  page,
}) => {
  await page.goto('/')
  await ready(page)
  const hero = page.locator('.hero')
  const first = await hero.getAttribute('data-vehicle')
  await expect(hero).not.toHaveAttribute('data-vehicle', first!, {
    timeout: 6500,
  })
  await hero.getByRole('button', { name: 'Pause vehicle showcase' }).click()
  const paused = await hero.getAttribute('data-vehicle')
  await hero.getByRole('button', { name: 'Next vehicle' }).click()
  await expect(hero).not.toHaveAttribute('data-vehicle', paused!)
  const slug = await hero.getAttribute('data-vehicle')
  await expect(hero.locator('.showcase-car')).toHaveAttribute(
    'href',
    `/fleet/${slug}`,
  )
  await expect(hero.locator('picture[data-active="true"] img')).toHaveAttribute(
    'src',
    new RegExp(slug!),
  )
  await page.getByRole('button', { name: 'Next review' }).click()
  await expect(page.locator('.review-rail .review-card')).toHaveCount(12)
  await expect(page.locator('.review-rail-controls')).toContainText('02 / 12')
  await expect(page.locator('.review-rail')).toBeInViewport()
  await page.locator('.home-faq summary').first().click()
  await expect(page.locator('.home-faq details[open]')).toHaveCount(1)
  await expect(page.locator('.support-dock')).toBeInViewport()
})

test('voice transcripts can be edited and are never automatically sent', async ({
  page,
}) => {
  await page.goto('/')
  await ready(page)
  await page.evaluate(() => {
    class TestSpeechRecognition {
      onresult?: (event: { results: { transcript: string }[][] }) => void
      onend?: () => void
      start() {
        this.onresult?.({ results: [[{ transcript: 'Atto 3 for five days' }]] })
        setTimeout(() => this.onend?.(), 0)
      }
      abort() {
        this.onend?.()
      }
      stop() {
        this.onend?.()
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      value: TestSpeechRecognition,
      configurable: true,
    })
  })
  await page.getByRole('button', { name: 'Open U Drive AI assistant' }).click()
  const chat = page.locator('.rental-chat-panel')
  await chat
    .getByRole('button', { name: 'Dictate with your browser speech service' })
    .click()
  await expect(chat.getByRole('textbox')).toHaveValue('Atto 3 for five days')
  await expect(chat.getByRole('log')).not.toContainText('You:')
  await chat.getByRole('textbox').fill('Atto 3 for two days')
  await chat.getByRole('button', { name: 'Send message' }).click()
  await expect(chat.getByRole('log')).toContainText('NPR 18,000')
})

test('unknown vehicle and destination links provide a route back to the fleet', async ({
  page,
}) => {
  for (const route of [
    '/fleet/not-in-catalog',
    '/destinations/not-in-roadbook',
    '/not-a-section',
  ]) {
    await page.goto(route)
    await expect(
      page.getByRole('heading', { name: 'A different turn.' }),
    ).toBeVisible()
    await expect(
      page.locator('main').getByRole('link', { name: 'Explore fleet' }),
    ).toHaveAttribute('href', '/fleet')
  }
})

test('floating rental support leaves FAQ expand controls unobstructed', async ({
  page,
}) => {
  await page.goto('/faq')
  await ready(page)
  const overlaps = await page.evaluate(() => {
    const dock = document
      .querySelector('.support-dock')!
      .getBoundingClientRect()
    return Array.from(document.querySelectorAll('.faq-row summary svg')).some(
      (svg) => {
        const r = svg.getBoundingClientRect()
        return (
          r.left < dock.right &&
          r.right > dock.left &&
          r.top < dock.bottom &&
          r.bottom > dock.top
        )
      },
    )
  })
  expect(overlaps).toBe(false)
})

for (const [width, perView] of [
  [390, 1],
  [1440, 3],
]) {
  test(`whole-card carousels, keyboard, arrows and gestures at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await ready(page)
    for (const [kind, total] of [
      ['destination', 8],
      ['review', 12],
    ] as const) {
      const rail = page.locator(`.${kind}-rail`)
      const previous = page.getByRole('button', {
        name: `Previous ${kind}`,
        exact: true,
      })
      const nextButton = page.getByRole('button', {
        name: `Next ${kind}`,
        exact: true,
      })
      await expect(rail.locator(':scope > *')).toHaveCount(total)
      await expect(previous).toBeDisabled()
      await expect(nextButton).toBeEnabled()
      const visible = () =>
        rail.evaluate((el) => {
          const r = el.getBoundingClientRect()
          return Array.from(el.children).filter((c) => {
            const b = c.getBoundingClientRect()
            return b.left >= r.left - 2 && b.right <= r.right + 2
          }).length
        })
      expect(await visible()).toBe(perView)
      await nextButton.click()
      await expect(previous).toBeEnabled()
      await rail.focus()
      await rail.press('End')
      await expect(nextButton).toBeDisabled()
      await expect.poll(visible).toBe(perView)
      await rail.press('ArrowLeft')
      await expect(nextButton).toBeEnabled()
      await rail.press('Home')
      await expect(previous).toBeDisabled()
      await rail.scrollIntoViewIfNeeded()
      const box = (await rail.boundingBox())!
      const x = box.x + box.width * 0.82,
        y = box.y + box.height * 0.5
      if (width === 390) {
        const touch = await page.context().newCDPSession(page)
        await touch.send('Emulation.setTouchEmulationEnabled', {
          enabled: true,
        })
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        })
        for (let i = 1; i <= 8; i++)
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x - (box.width * 0.7 * i) / 8, y }],
          })
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        })
        await touch.detach()
      } else {
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x - box.width * 0.49, y, { steps: 12 })
        await page.mouse.up()
      }
      await expect(previous).toBeEnabled()
      await expect.poll(visible).toBe(perView)
      expect(new URL(page.url()).pathname).toBe('/')
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
  })
}

test('new roadbook route, rental-mode examples and feedback keep their context', async ({
  page,
}) => {
  await page.goto('/destinations')
  await ready(page)
  await page.getByRole('button', { name: 'High mountains' }).click()
  await expect(page.locator('.roadbook-grid .destination-card')).toHaveCount(1)
  await page.locator('.roadbook-grid .destination-card').click()
  await expect(
    page.getByRole('heading', { name: 'Mustang.', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Plan this journey' }).click()
  await expect(page).toHaveURL(/\/booking\?destination=mustang$/)
  await page.goto('/rental-options')
  await page.getByRole('link', { name: 'Plan this chauffeured trip' }).click()
  await expect(page).toHaveURL(/mode=with-driver&destination=pokhara/)
  await page.goto('/reviews')
  await ready(page)
  await page.getByRole('button', { name: 'With Driver', exact: true }).click()
  await expect(page.locator('.review-card')).toHaveCount(6)
  await expect(
    page.locator('.review-card .review-author p').first(),
  ).toContainText('With Driver')
  await page.getByRole('button', { name: 'All stories', exact: true }).click()
  await expect(page.locator('.review-card')).toHaveCount(12)
  await page.getByRole('link', { name: 'Share rental feedback' }).click()
  await expect(page.getByLabel('What is your enquiry about?')).toHaveValue(
    'Traveller feedback',
  )
  await expect(
    page.getByRole('heading', { name: 'Tell us about your rental.' }),
  ).toBeVisible()
})

test('account previews explain their limits and leave guest booking available', async ({
  page,
}) => {
  for (const mode of ['sign-in', 'create-account']) {
    await page.goto(`/${mode}`)
    const form = page.locator('.auth-panel form[data-ready="true"]')
    await expect(form).toBeVisible()
    if (mode === 'create-account')
      await form.getByLabel('Full name').fill('Sample Traveller')
    await form.getByLabel('Email address').fill('traveller@example.com')
    await form.getByLabel('Password', { exact: true }).fill('sample-only-value')
    if (mode === 'create-account') {
      await form
        .getByLabel('Confirm password', { exact: true })
        .fill('sample-only-value')
      await form.getByRole('checkbox').check()
    }
    await form.locator('button[type="submit"]').click()
    await expect(page.locator('.form-response')).toContainText('not connected')
    await page
      .getByRole('link', { name: 'Rent a car without an account' })
      .click()
    await expect(page).toHaveURL(/\/booking$/)
  }
})

test('reviewed contact enquiry routes to the same rental desk', async ({
  page,
}) => {
  await page.goto('/contact?vehicle=byd-atto-3')
  await expect(page.locator('.enquiry-form')).toHaveAttribute(
    'data-ready',
    'true',
  )
  await expect(page.locator('#contact-message')).toHaveValue(/BYD Atto 3/)
  await page.locator('#contact-name').fill('Example Traveller')
  await page.locator('#contact-email').fill('traveller@example.com')
  await page.getByRole('button', { name: 'Prepare enquiry' }).click()
  const href = await page
    .getByRole('link', { name: 'Open WhatsApp', exact: true })
    .getAttribute('href')
  expect(new URL(href!).pathname).toBe('/9779800899505')
  expect(new URL(href!).searchParams.get('text')).toContain('BYD Atto 3')
  await page.getByRole('button', { name: 'Edit enquiry' }).click()
  await expect(page.locator('#contact-name')).toHaveValue('Example Traveller')
})
