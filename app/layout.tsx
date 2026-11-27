import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Navbar } from '@/components/navbar'
import { Footer, FloatingContact } from '@/components/footer'
import { business } from '@/lib/rental-data'
import { siteOrigin } from '@/lib/site-routes'
import { PrivacyControls } from '@/components/privacy-controls'
import { PlatformProvider } from '@/components/platform-provider'
import { catalog } from '@/lib/platform/catalog'
import { session } from '@/lib/platform/security'
import { settings } from '@/lib/platform/database'
import { oauthFlags } from '@/lib/platform/oauth'
import './globals.css'
export const dynamic = 'force-dynamic'

const manrope = localFont({
  src: '../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
  variable: '--font-manrope',
  display: 'swap',
  weight: '200 800',
})
const devanagari = localFont({
  src: '../node_modules/@fontsource-variable/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-wght-normal.woff2',
  variable: '--font-devanagari',
  display: 'swap',
  weight: '100 900',
  preload: false,
  adjustFontFallback: false,
})
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: business.name,
  description: business.description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#172127',
}
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [data, user, cfg] = await Promise.all([
    catalog(),
    session(),
    settings(),
  ])
  return (
    <html
      lang="en"
      className={`bg-background ${manrope.variable} ${devanagari.variable}`}
    >
      <body className="font-sans antialiased">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <PlatformProvider
          value={{
            ...data,
            user,
            whatsapp: cfg.whatsapp,
            currency: cfg.currency,
            policies: cfg.policies,
            cancellation: cfg.cancellation,
            social: oauthFlags(),
          }}
        >
          <PrivacyControls />
          <Navbar />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <FloatingContact />
        </PlatformProvider>
      </body>
    </html>
  )
}
