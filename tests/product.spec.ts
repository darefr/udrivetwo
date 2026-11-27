import { test, expect, type APIRequestContext } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readdir, readFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { addRentalDays, todayInNepal } from '../lib/trip'
const origin = 'http://127.0.0.1:4317'
const post = (r: APIRequestContext, path: string, data: unknown) =>
  r.post('/api/platform/' + path, { data, headers: { Origin: origin } })
const register = async (r: APIRequestContext, name: string) => {
  const email = randomUUID() + '@example.test',
    password = randomUUID()
  expect(
    (
      await post(r, 'auth/register', { name, email, password, terms: true })
    ).ok(),
  ).toBe(true)
  return { email, password }
}
test.skip(
  !!process.env.TEST_BASE_URL,
  'Product mutations run only against the isolated test server.',
)
test('rental request reaches staff, confirmation reaches the correct customer, and every workspace loads', async ({
  page,
  playwright,
}) => {
  const desk = page.request
  await register(desk, 'Desk Operator')
  expect(
    (
      await post(desk, 'auth/bootstrap', {
        code: process.env.UDRIVE_TEST_OWNER,
      })
    ).ok(),
  ).toBe(true)
  const renter = await playwright.request.newContext({ baseURL: origin })
  const creds = await register(renter, 'Product Traveller')
  expect((await renter.get('/api/platform/admin/bookings')).status()).toBe(403)
  const start = addRentalDays(todayInNepal(), 70),
    end = addRentalDays(start, 2)
  const d = {
    vehicle: 'deepal-s05',
    mode: 'self-drive',
    pickup: 'Kathmandu',
    start,
    end,
    delivery: 'pickup',
    offer: '',
  }
  const q = await (
    await renter.get('/api/platform/quote?' + new URLSearchParams(d))
  ).json()
  expect(q.total).toBe(20000)
  const created = await post(renter, 'bookings', {
    ...d,
    name: 'Product Traveller',
    phone: '+9779800000000',
    email: creds.email,
    requestKey: randomUUID(),
    expectedTotal: q.total,
  })
  expect(created.status()).toBe(201)
  const { id } = await created.json()
  const denied = await renter.post('/api/platform/account/bookings/' + id, {
    data: { status: 'CANCELLED', version: 1 },
    headers: { Origin: 'https://untrusted.example' },
  })
  expect(denied.status()).toBe(403)
  await page.goto(`/admin?tab=bookings&id=${id}`)
  await expect(
    page.getByRole('heading', { name: 'Desk actions' }),
  ).toBeVisible()
  await page
    .getByLabel('Booking status', { exact: true })
    .selectOption('CONFIRMED')
  await page
    .getByLabel('Internal note — not visible to customer')
    .fill('Meet at the agreed desk.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect
    .poll(
      async () =>
        (
          await (
            await renter.get('/api/platform/account/bookings/' + id)
          ).json()
        ).status,
    )
    .toBe('CONFIRMED')
  const detail = await (
    await renter.get('/api/platform/account/bookings/' + id)
  ).json()
  expect(detail.internal_note).toBeUndefined()
  expect(
    (
      await (await renter.get('/api/platform/account/notifications')).json()
    ).some((n: { kind: string }) => n.kind === 'CONFIRMED'),
  ).toBe(true)
  for (const tab of [
    'overview',
    'bookings',
    'vehicles',
    'customers',
    'availability',
    'pricing',
    'payments',
    'reviews',
    'locations',
    'offers',
    'notifications',
    'messages',
    'reports',
    'settings',
    'activity',
    'users',
  ]) {
    const res = await desk.get('/api/platform/admin/' + tab)
    expect(res.status(), tab).toBe(200)
  }
  await page.goto('/admin')
  const consent = page.getByRole('button', { name: 'Essential only' })
  if (await consent.isVisible()) await consent.click()
  await page.getByLabel('Workspace section').selectOption('availability')
  await expect(page.getByRole('combobox', { name: /Vehicle calendar/ })).toBeVisible()
  await page.getByLabel('Workspace section').selectOption('overview')
  await expect(page.getByText('Available today', { exact: true })).toBeVisible()
  await mkdir('/tmp/agent-browser', { recursive: true })
  await page.screenshot({
    path: '/tmp/agent-browser/u-drive-operational-desk.png',
  })
  await renter.dispose()
})
test('password recovery uses private, expiring, single-use development mail', async ({
  request,
}) => {
  const u = await register(request, 'Recovery Traveller')
  expect((await post(request, 'auth/forgot', { email: u.email })).ok()).toBe(
    true,
  )
  const dir = join(
    tmpdir(),
    'udrive-browser-' + process.env.UDRIVE_TEST_RUN,
    'mailbox',
  )
  let key = ''
  await expect
    .poll(async () => {
      for (const name of await readdir(dir).catch(() => [])) {
        const f = JSON.parse(await readFile(join(dir, name), 'utf8'))
        if (f.to === u.email && f.subject === 'Reset your password') {
          key = new URL(f.body.match(/https?:\/\/[^\s]+/)[0]).hash.slice(7)
          return !!key
        }
      }
      return false
    })
    .toBe(true)
  const next = randomUUID()
  expect(
    (
      await post(request, 'auth/reset', { token: key, password: next })
    ).status(),
  ).toBe(200)
  expect(
    (
      await post(request, 'auth/reset', { token: key, password: randomUUID() })
    ).status(),
  ).toBe(400)
  expect((await request.get('/api/platform/account/overview')).status()).toBe(
    401,
  )
  expect(
    (
      await post(request, 'auth/login', { email: u.email, password: next })
    ).status(),
  ).toBe(200)
})
