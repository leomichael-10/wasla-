import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../../../lib/prisma'

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map()
function isRateLimited(ip) {
  const now  = Date.now()
  const entry = rateLimitMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000 }
  entry.count++
  rateLimitMap.set(ip, entry)
  return entry.count > 10
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact support.' },
        { status: 403 }
      )
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token — include isBanned so middleware can gate requests without a DB call
    const token = jwt.sign(
      {
        userId:   user.id,
        email:    user.email,
        role:     user.role,
        isBanned: user.isBanned,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const userData = { id: user.id, email: user.email, role: user.role, city: user.city }
    const response = NextResponse.json({ message: 'Login successful', token, user: userData })
    response.cookies.set('tobaki_user_info', JSON.stringify(userData), {
      path:     '/',
      maxAge:   7 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: true,
    })
    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}