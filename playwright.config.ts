import { defineConfig } from '@playwright/test'

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
        reuseExistingServer: true,
        timeout: 60000,
      },
})
