import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

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

// Route prefixes where GET requests are public (token optional, verified if present)
const OPTIONAL_AUTH_PREFIXES = [
  '/api/products',
  '/api/reviews',
  '/api/shops',
  '/api/restaurants',
  '/api/categories',
  '/api/zones',
  '/api/delivery',
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
      return NextResponse.next()
    }
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  let payload
  try {
    const { payload: verified } = await jwtVerify(token, getSecret())
    payload = verified
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  // Check if account is banned
  if (payload.isBanned) {
    return NextResponse.json(
      { error: 'Your account has been suspended. Please contact support.' },
      { status: 403 }
    )
  }

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
