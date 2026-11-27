import { defineConfig } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.UDRIVE_TEST_RUN ||= randomBytes(12).toString('hex')
process.env.UDRIVE_TEST_OWNER ||= randomBytes(32).toString('hex')

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:4317'
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 7000 },
  reporter: 'list',
  use: { baseURL, colorScheme: 'light', trace: 'retain-on-failure' },
  projects: [
    { name: 'rental-logic', testMatch: 'rental-core.spec.ts' },
    {
      name: 'product',
      testMatch: 'product.spec.ts',
      use: { viewport: { width: 482, height: 773 } },
    },
    {
      name: 'launch',
      testMatch: 'launch.spec.ts',
      use: { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
    },
    {
      name: 'journeys',
      testMatch: 'rental-journeys.spec.ts',
      use: { viewport: { width: 482, height: 773 } },
    },
    ...[
      ['mobile', 390, 844],
      ['tablet', 820, 1180],
      ['desktop', 1280, 900],
      ['large-desktop', 1920, 1080],
    ].map(([name, width, height]) => ({
      name: String(name),
      testMatch: 'routes.spec.ts',
      use: {
        viewport: { width: Number(width), height: Number(height) },
        reducedMotion: 'reduce' as const,
      },
    })),
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: 'pnpm exec next start --hostname 127.0.0.1 --port 4317',
        url: baseURL,
        reuseExistingServer: false,
        env: {
          UDRIVE_MODE: 'test',
          UDRIVE_DATA_DIR: join(
            tmpdir(),
            'udrive-browser-' + process.env.UDRIVE_TEST_RUN,
          ),
          APP_ORIGIN: baseURL,
          ADMIN_SETUP_TOKEN: process.env.UDRIVE_TEST_OWNER!,
          DATABASE_URL: '',
          SMTP_URL: '',
          WHATSAPP_ACCESS_TOKEN: '',
          PAYMENT_PROVIDER: 'disabled',
          AI_MODE: 'catalog',
          VERCEL_ENV: '',
        },
        timeout: 60000,
      },
})
