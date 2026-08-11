const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wasla-249.com'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow:     '/',
      disallow:  ['/dashboard', '/admin', '/api'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
