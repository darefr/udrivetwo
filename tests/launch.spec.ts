import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { accountPaths, indexablePaths, siteOrigin } from '../lib/site-routes'
import { addRentalDays, todayInNepal } from '../lib/trip'

const allPages = [...indexablePaths, ...accountPaths]

test('crawl canonical pages, link targets, icons, social metadata and crawler files', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000)
  const xml = await request.get('/sitemap.xml')
  expect(xml.status()).toBe(200)
  const listed = [...(await xml.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (v) => v[1],
  )
  expect(listed.sort()).toEqual(
    indexablePaths.map((p) => new URL(p, siteOrigin).href).sort(),
  )
  const rules = await request.get('/robots.txt')
  expect(rules.status()).toBe(200)
  expect(await rules.text()).toContain(`Sitemap: ${siteOrigin}/sitemap.xml`)
  const titles = new Set<string>(),
    descriptions = new Set<string>(),
    targets = new Set<string>(),
    anchors = new Set<string>()
  for (const path of allPages) {
    expect(
      (
        await page.goto(path + '?campaign=qa', {
          waitUntil: 'domcontentloaded',
        })
      )?.status(),
      path,
    ).toBe(200)
    const url = new URL(path, siteOrigin).href
    await expect(page.locator('link[rel="canonical"]')).toHaveJSProperty(
      'href',
      url,
    )
    const contents = await page.evaluate(() => {
      const tag = (selector: string) =>
        document.querySelector(selector)?.getAttribute('content') ?? ''
      return {
        title: document.title,
        desc: tag('meta[name="description"]'),
        ogTitle: tag('meta[property="og:title"]'),
        ogDesc: tag('meta[property="og:description"]'),
        ogURL: tag('meta[property="og:url"]'),
        ogImage: tag('meta[property="og:image"]'),
        card: tag('meta[name="twitter:card"]'),
        robots: tag('meta[name="robots"]'),
        links: Array.from(document.links)
          .filter((a) => a.origin === location.origin)
          .map((a) => a.pathname + a.hash),
        ids: [...document.querySelectorAll('[id]')].map(
          (n) => location.pathname + '#' + n.id,
        ),
      }
    })
    expect(contents.title.length, path).toBeLessThan(60)
    expect(contents.desc.length, path).toBeGreaterThanOrEqual(150)
    expect(contents.desc.length, path).toBeLessThanOrEqual(160)
    expect(contents.ogTitle).toBe(contents.title)
    expect(contents.ogDesc).toBe(contents.desc)
    expect(new URL(contents.ogURL).href).toBe(url)
    expect(contents.ogImage).toBe(`${siteOrigin}/images/u-drive-share.jpg`)
    expect(contents.card).toBe('summary_large_image')
    if (accountPaths.some((p) => p === path))
      expect(contents.robots).toContain('noindex')
    titles.add(contents.title)
    descriptions.add(contents.desc)
    contents.links.forEach((link) => targets.add(link))
    contents.ids.forEach((id) => anchors.add(id))
  }
  expect(titles.size).toBe(allPages.length)
  expect(descriptions.size).toBe(allPages.length)
  for (const target of targets) {
    expect(allPages, target).toContain(target.split('#')[0])
    if (target.includes('#')) expect(anchors.has(target), target).toBe(true)
  }
  for (const path of [
    '/favicon.ico',
    '/favicon.png',
    '/apple-touch-icon.png',
    '/images/u-drive-share.jpg',
  ]) {
    const asset = await request.get(path)
    expect(asset.status(), path).toBe(200)
    expect(asset.headers()['content-type']).toMatch(/^image\//)
  }
  expect(
    await page.evaluate(async () => {
      const img = new Image()
      img.src = '/images/u-drive-share.jpg'
      await img.decode()
      return [img.naturalWidth, img.naturalHeight]
    }),
  ).toEqual([1200, 630])
  for (const path of [
    '/missing-section',
    '/fleet/missing-vehicle',
    '/destinations/missing-route',
    '/not/a/path',
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(404)
    await expect(
      page.getByRole('heading', { name: 'A different turn.' }),
    ).toBeVisible()
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached()
  }
})

test('consent gates the SDK, fixed conversion names and clean paths; withdrawal persists', async ({
  page,
  context,
}) => {
  const emissions: { type: string; url: string; name?: string }[] = []
  let scriptRequests = 0
  // Exercise the installed SDK against a local collector without polluting real visitor statistics.
  await page.route('**/_vercel/insights/script.js', (route) => {
    scriptRequests++
    return route.fulfill({
      contentType: 'application/javascript',
      body: `(() => {
      let filter = e => e;
      window.va = (type, data) => {
        if (type === 'beforeSend') { filter = data; return }
        const event = filter({type, url: location.href}); if (!event) return;
        fetch('/_vercel/insights/' + type, {method:'POST', body:JSON.stringify({...event, name:data?.name})});
      };
      (window.vaq || []).forEach(args => window.va(...args));
    })()`,
    })
  })
  await page.route(/\/_vercel\/insights\/(event|pageview)$/, (route) => {
    emissions.push(route.request().postDataJSON())
    return route.fulfill({ status: 204, body: '' })
  })
  await context.route('https://wa.me/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'Test handoff. No message sent.',
    }),
  )
  await page.goto('/?campaign=private#private')
  await expect(
    page.getByRole('region', { name: 'Your privacy choices' }),
  ).toBeVisible()
  expect(scriptRequests).toBe(0)
  const deny = page.getByRole('button', { name: 'Essential only' })
  await deny.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.reload()
  await expect(page.locator('.support-dock[data-ready="true"]')).toBeVisible()
  await expect(deny).toHaveCount(0)
  expect(scriptRequests).toBe(0)
  const settings = page
    .locator('footer')
    .getByRole('link', { name: 'Cookie settings' })
  await settings.click()
  await expect(page.locator('#privacy-choice-title')).toBeFocused()
  await page.getByRole('button', { name: 'Allow analytics' }).click()
  await expect(settings).toBeFocused()
  await expect
    .poll(() => emissions.filter((e) => e.type === 'pageview').length)
    .toBe(1)
  await page.locator('.hero-copy .primary').click()
  await expect
    .poll(() => emissions.map((e) => e.name))
    .toContain('Booking CTA clicked')
  const start = addRentalDays(todayInNepal(), 12)
  await page.goto(
    `/booking?vehicle=byd-atto-1&start=${start}&end=${addRentalDays(start, 2)}`,
  )
  await expect(page.locator('.rental-planner[data-ready="true"]')).toBeVisible()
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.locator('#booking-name').fill('QA Traveller')
  await page.locator('#booking-phone').fill('+977 9810000000')
  await page.getByRole('button', { name: 'Review rental', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to contact' }).click()
  await expect
    .poll(() => emissions.map((e) => e.name))
    .toContain('Rental enquiry prepared')
  await page.goto('/contact?vehicle=byd-atto-3&campaign=private')
  await expect(page.locator('.enquiry-form[data-ready="true"]')).toBeVisible()
  await page.getByRole('button', { name: 'Prepare enquiry' }).click()
  await expect(page.locator('#contact-name')).toBeFocused()
  await page.locator('#contact-name').fill('QA Traveller')
  await page.locator('#contact-email').fill('invalid')
  await page.getByRole('button', { name: 'Prepare enquiry' }).click()
  await expect(page.locator('#contact-email')).toBeFocused()
  expect(emissions.map((e) => e.name)).not.toContain('Contact enquiry prepared')
  await page.locator('#contact-email').fill('private@example.com')
  await page.getByRole('button', { name: 'Prepare enquiry' }).click()
  await expect
    .poll(() => emissions.map((e) => e.name))
    .toContain('Contact enquiry prepared')
  await page.getByRole('link', { name: 'Open WhatsApp', exact: true }).click()
  await expect
    .poll(() => emissions.map((e) => e.name))
    .toContain('WhatsApp handoff opened')
  expect(
    emissions.every((e) => !new URL(e.url).search && !new URL(e.url).hash),
  ).toBe(true)
  expect(JSON.stringify(emissions)).not.toMatch(
    /private|9810000000|QA Traveller|wa\.me/,
  )
  await settings.click()
  await deny.click()
  const count = emissions.length,
    scripts = scriptRequests
  await page.goto('/fleet')
  await expect(page.locator('.support-dock[data-ready="true"]')).toBeVisible()
  expect(scriptRequests).toBe(scripts)
  expect(emissions).toHaveLength(count)
  expect(
    (await context.cookies()).find((c) => c.name === 'udrive_privacy_v1')
      ?.value,
  ).toBe('essential')
})

test('keyboard FAQ, narrow-screen CTA and password reset preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await expect(page.locator('.hero-copy .primary')).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  )
  await page.getByRole('button', { name: 'Essential only' }).click()
  await page.goto('/faq')
  const question = page.locator('summary').filter({ hasText: 'When do I pay' })
  await question.focus()
  await page.keyboard.press('Enter')
  await expect(question.locator('..')).toHaveAttribute('open', '')
  await page.goto('/forgot-password')
  const form = page.locator('.auth-panel form[data-ready="true"]')
  await form.getByRole('button', { name: 'Request password reset' }).click()
  await expect(form.getByLabel('Email address')).toBeFocused()
  await form.getByLabel('Email address').fill('sample@example.com')
  await form.getByRole('button', { name: 'Request password reset' }).click()
  await expect(page.getByRole('status')).toContainText(
    'No reset email was sent',
  )
})

test('accessible public page templates and consent controls', async ({
  page,
}) => {
  test.setTimeout(150_000)
  const issues: string[] = []
  for (const path of [...allPages, '/page-not-found']) {
    await page.goto(path)
    await expect(page.locator('.support-dock[data-ready="true"]')).toBeVisible()
    const result = await new AxeBuilder({ page })
      .withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
        'best-practice',
      ])
      .analyze()
    for (const v of result.violations)
      issues.push(
        `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`,
      )
    if (path === '/')
      await page.getByRole('button', { name: 'Essential only' }).click()
  }
  expect(issues).toEqual([])
})
