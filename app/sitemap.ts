import type { MetadataRoute } from 'next'
import { indexablePaths, siteOrigin } from '@/lib/site-routes'

import { catalog } from '@/lib/platform/catalog'
export const dynamic = 'force-dynamic'
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { fleet, destinations } = await catalog()
  const paths = [
    ...indexablePaths.filter(
      (p) => !p.startsWith('/fleet/') && !p.startsWith('/destinations/'),
    ),
    ...fleet.map((v) => `/fleet/${v.slug}`),
    ...destinations.map((d) => `/destinations/${d.slug}`),
  ]
  return paths.map((path) => ({ url: new URL(path, siteOrigin).href }))
}
