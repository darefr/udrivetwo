/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value:
              'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:icon(favicon\\.ico|favicon\\.png|apple-touch-icon\\.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
    ]
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1600, 1920],
  },
}

export default nextConfig
