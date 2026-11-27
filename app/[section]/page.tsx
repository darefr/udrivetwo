import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AboutPage, RentalGuide, ReviewsPage } from '@/components/company-pages'
import { RentalOptionPage, RentalComparison } from '@/components/rental-options'
import { FAQPage } from '@/components/faq-browser'
import { LegalPage } from '@/components/legal-page'

import { isSectionSlug, sectionSlugs } from '@/lib/site-routes'
import { pageMetadata, missingMetadata } from '@/lib/site-metadata'

export const generateStaticParams = () =>
  sectionSlugs.map((section) => ({ section }))
export const dynamicParams = false
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>
}): Promise<Metadata> {
  const { section } = await params
  return isSectionSlug(section) ? pageMetadata(`/${section}`) : missingMetadata
}
export default async function InformationPage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section } = await params
  switch (section) {
    case 'privacy':
    case 'terms':
      return <LegalPage page={section} />
    case 'about':
      return <AboutPage />
    case 'how-it-works':
      return <RentalGuide />
    case 'reviews':
      return <ReviewsPage />
    case 'self-drive':
    case 'with-driver':
      return <RentalOptionPage mode={section} />
    case 'rental-options':
      return <RentalComparison />
    case 'faq':
      return <FAQPage />
    default:
      notFound()
  }
}
