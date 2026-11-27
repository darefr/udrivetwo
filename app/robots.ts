import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/site-routes'

export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      process.env.VERCEL_ENV === 'preview'
        ? { userAgent: '*', disallow: '/' }
        : {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/admin/', '/_vercel/'],
          },
    sitemap: `${siteOrigin}/sitemap.xml`,
  }
}
