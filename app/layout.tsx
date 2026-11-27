import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Navbar } from '@/components/navbar'
import { Footer, FloatingContact } from '@/components/footer'
import { business, fleet, money } from '@/lib/rental-data'
import './globals.css'

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
  title: {
    default:
      'U Drive Car Rental Kathmandu | Your Journey. Your Car. Your Nepal.',
    template: '%s | U Drive Kathmandu',
  },
  description: `Compare ${fleet.length} rental cars from ${money(Math.min(...fleet.map((car) => car.dailyRate)))} per day. Plan self-drive or chauffeur rentals across Nepal and request a confirmed quote from our Kathmandu team on WhatsApp.`,
  icons: { icon: '/icon.svg' },
  openGraph: {
    siteName: business.name,
    title: business.name,
    description: business.description,
    type: 'website',
    locale: 'en_NP',
  },
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#172127',
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`bg-background ${manrope.variable} ${devanagari.variable}`}
    >
      <body className="font-sans antialiased">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Navbar />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <FloatingContact />
      </body>
    </html>
  )
}
