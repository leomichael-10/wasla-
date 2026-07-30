import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getVerificationProvider } from '../../../../lib/verification'

// POST /api/auth/verify-email
// Public (the code itself is the proof of ownership). Body: { email, code }
export async function POST(request) {
  try {
    const { email, code } = await request.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'email and code are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } })
    if (!user) {
      // Codes are per-target, not per-user-existence, so this still
      // doesn't reveal much beyond "wrong code" — but there's genuinely
      // nothing to verify.
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }
    if (user.emailVerified) {
      return NextResponse.json({ message: 'Email already verified' })
    }

    const result = await getVerificationProvider('email').checkCode({ target: email, code, purpose: 'signup' })
    if (!result.valid) {
      const messages = {
        expired:        'الكود منتهي الصلاحية. اطلب كود جديد.',
        locked:         'محاولات كتير غلط. اطلب كود جديد.',
        wrong_code:      'الكود غلط. حاول تاني.',
        no_active_code: 'مفيش كود نشط. اطلب كود جديد.',
      }
      return NextResponse.json(
        { error: messages[result.reason] ?? 'الكود غلط أو منتهي الصلاحية.', attemptsLeft: result.attemptsLeft },
        { status: 400 }
      )
    }

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
    return NextResponse.json({ message: 'تم تفعيل بريدك الإلكتروني بنجاح.' })
  } catch (error) {
    console.error('POST /api/auth/verify-email error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
