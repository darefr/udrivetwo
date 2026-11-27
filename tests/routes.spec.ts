import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { destinations, fleet } from '../lib/rental-data'

const routes = [
  '/',
  '/fleet',
  ...fleet.map((v) => `/fleet/${v.slug}`),
  '/booking',
  '/rental-options',
  '/self-drive',
  '/with-driver',
  '/destinations',
  ...destinations.map((d) => `/destinations/${d.slug}`),
  '/how-it-works',
  '/about',
  '/reviews',
  '/faq',
  '/contact',
  '/sign-in',
  '/create-account',
  '/forgot-password',
  '/privacy',
  '/terms',
]
for (const route of routes)
  test(`layout ${route}`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    expect((await page.goto(route))?.status()).toBe(200)
    await expect(page.locator('.support-dock[data-ready="true"]')).toBeVisible()
    await expect(page.locator('main h1')).toHaveCount(1)
    const audit = await page.evaluate(async () => {
      await document.fonts.ready
      for (
        let top = 0;
        top < document.documentElement.scrollHeight;
        top += Math.max(250, innerHeight - 90)
      ) {
        scrollTo(0, top)
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        )
      }
      const images = Array.from(document.images).filter(
        (img) => img.getClientRects().length,
      )
      // Include lazy images beyond the visible carousel window in the asset audit.
      images.forEach((img) => {
        img.loading = 'eager'
      })
      await Promise.all(images.map((img) => img.decode().catch(() => {})))
      const dock = document
        .querySelector('.support-dock')!
        .getBoundingClientRect()
      const result = {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        internalPaths: Array.from(
          new Set(
            Array.from(document.links)
              .filter((link) => link.origin === location.origin)
              .map((link) => link.pathname),
          ),
        ),
        broken: images
          .filter((img) => !img.naturalWidth || !img.hasAttribute('alt'))
          .map((img) => img.src),
        visibleDock: dock.top >= 0 && dock.bottom <= innerHeight + 1,
        footer:
          document.querySelector('footer')!.getBoundingClientRect().bottom <=
          innerHeight + 1,
      }
      scrollTo(0, 0)
      return result
    })
    expect(audit.scrollWidth).toBeLessThanOrEqual(audit.width + 1)
    expect(audit.broken).toEqual([])
    expect(
      audit.internalPaths.filter((path) => !routes.includes(path)),
    ).toEqual([])
    expect(audit.visibleDock).toBe(true)
    expect(audit.footer).toBe(true)
    expect(errors).toEqual([])
    if (process.env.QA_SCREENSHOTS) {
      const folder = join('/tmp/agent-browser/u-drive-qa', info.project.name)
      await mkdir(folder, { recursive: true })
      await page.screenshot({
        path: join(
          folder,
          `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}.png`,
        ),
        fullPage: true,
        animations: 'disabled',
      })
    }
  })
