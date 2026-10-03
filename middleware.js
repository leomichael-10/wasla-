import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from './lib/prisma'

// Password-reset session invalidation (see prisma/schema.prisma's
// User.passwordChangedAt and app/api/auth/reset-password/route.js) needs
// a real DB read per authenticated request, which Edge middleware can't
// do without extra infrastructure this project doesn't have (no
// edge/Neon-HTTP Prisma driver adapter configured). Node.js middleware
// (stable since Next 15.5) is the deliberate tradeoff: one indexed
// point-lookup added to every authenticated API request, in exchange for
// a stolen token actually dying the moment its owner resets their
// password, instead of surviving up to its full 7-day expiry.

// Routes that never require a token
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
]

// Route prefixes that are always public (next-auth internals, etc.)
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/track/pixel/',
  '/api/track/global',
  '/api/waitlist',
]

// Route prefixes where GET requests are public. A token is verified if
// present, but a missing, stale, banned or unverifiable token never blocks
// the read — the request simply proceeds as anonymous. The catalogue is the
// same for everyone, so an auth problem must not blank it (it used to: a
// returning browser with an expired token got 401 on /api/products and the
// page rendered empty).
const OPTIONAL_AUTH_PREFIXES = [
  '/api/products',
  '/api/reviews',
  '/api/shops',
  '/api/restaurants',
  '/api/categories',
  '/api/zones',
  '/api/delivery',
  '/api/search',
]

// Routes restricted by role
const ROLE_RESTRICTED = {
  '/api/seller':   ['retailer', 'wholesaler'],
  '/api/admin':    ['admin'],
  '/api/customer': ['customer'],
}

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

// Anonymous pass-through. Drops any x-user-* header the client sent itself,
// so nothing downstream can mistake a spoofed header for a verified identity.
function passAnonymous(request) {
  const headers = new Headers(request.headers)
  headers.delete('x-user-id')
  headers.delete('x-user-email')
  headers.delete('x-user-role')
  return NextResponse.next({ request: { headers } })
}

// Resolves a token to { payload } when it's usable, or { status, error } when
// it must be refused. Throws only if the DB lookup itself fails.
async function checkToken(token) {
  let payload
  try {
    ({ payload } = await jwtVerify(token, getSecret()))
  } catch {
    return { status: 401, error: 'Invalid or expired token' }
  }

  // Reject tokens issued before the account's last password reset — same
  // "Invalid or expired token" response as a bad signature, so a stolen
  // token doesn't get a distinguishable error telling an attacker *why*
  // it stopped working.
  const dbUser = await prisma.user.findUnique({
    where:  { id: payload.userId },
    select: { passwordChangedAt: true, deletedAt: true },
  })
  if (dbUser?.passwordChangedAt && payload.iat * 1000 < dbUser.passwordChangedAt.getTime()) {
    return { status: 401, error: 'Invalid or expired token' }
  }

  // Deleted accounts (see lib/accountDeletion.js) also bump
  // passwordChangedAt, so this is already covered above for every token
  // issued before the deletion — this catches the edge case of a token
  // minted in the same second, and reads the same either way.
  if (dbUser?.deletedAt) {
    return { status: 401, error: 'Invalid or expired token' }
  }

  // Check if account is banned
  if (payload.isBanned) {
    return { status: 403, error: 'Your account has been suspended. Please contact support.' }
  }

  return { payload }
}

export const runtime = 'nodejs'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Extract token from Authorization header or cookie
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.cookies.get('token')?.value

  // GET requests on optional-auth prefixes are public — pass through without a token
  const isOptionalAuth =
    request.method === 'GET' &&
    OPTIONAL_AUTH_PREFIXES.some(p => pathname.startsWith(p))

  if (!token) {
    if (isOptionalAuth) {
      return passAnonymous(request)
    }
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  let result
  try {
    result = await checkToken(token)
  } catch (error) {
    if (isOptionalAuth) return passAnonymous(request)
    throw error
  }

  if (result.error) {
    if (isOptionalAuth) return passAnonymous(request)
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }
  const { payload } = result

  // Check role-based access
  for (const [prefix, allowedRoles] of Object.entries(ROLE_RESTRICTED)) {
    if (pathname.startsWith(prefix) && !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
  }

  // Forward user info to API route handlers via headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id',    String(payload.userId))
  requestHeaders.set('x-user-email', payload.email)
  requestHeaders.set('x-user-role',  payload.role)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/api/:path*'],
}
