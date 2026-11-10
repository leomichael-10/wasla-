// Security headers and the /account -> /profile redirect used to live here
// as next.config.mjs's headers()/redirects(), but both are incompatible
// with `output: 'export'` (needed for the Capacitor static shell — see
// lib/apiBase.js and PROGRESS.md). Moved to vercel.json, which supports
// both natively and applies them identically for the deployed web app —
// no behavior change there. A locally-bundled native build isn't served
// through Vercel's edge at all, so these don't reach it either way; native
// CSP is a separate, not-yet-built concern (see PROGRESS.md).
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  'res.cloudinary.com',
        pathname:  '/**',
      },
    ],
  },
}

export default nextConfig
