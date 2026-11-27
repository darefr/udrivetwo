import type { MetadataRoute } from 'next'
import { indexablePaths, siteOrigin } from '@/lib/site-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  return indexablePaths.map((path) => ({ url: new URL(path, siteOrigin).href }))
}
