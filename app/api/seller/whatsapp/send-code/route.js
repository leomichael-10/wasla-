import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { getVerificationProvider } from '../../../../../lib/verification'
import { isEgyptianPhone, normalizeDigits } from '../../../../../lib/phone'

// POST /api/seller/whatsapp/send-code
// Seller only. Sends an OTP to the WhatsApp number the shop wants to
// verify — either the number already on file, or a new candidate number
// supplied here (not saved to the profile until it's actually verified).
// Body: { whatsappNumber? }
export async function POST(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler')) {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: auth.userId } })
    if (!profile) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 })

    const target = body.whatsappNumber ? normalizeDigits(body.whatsappNumber) : profile.whatsappNumber
    if (!target || !isEgyptianPhone(target)) {
      return NextResponse.json({ error: 'A valid Egyptian WhatsApp number is required' }, { status: 400 })
    }

    const result = await getVerificationProvider('whatsapp').requestCode({ target, purpose: 'shop_onboarding' })

    if (result.reason === 'rate_limited') {
      return NextResponse.json({ error: 'طلبت أكواد كتير. حاول تاني بعد شوية.' }, { status: 429 })
    }
    if (result.reason === 'provider_error') {
      return NextResponse.json({ error: 'تعذر إرسال الكود. حاول تاني.' }, { status: 502 })
    }

    return NextResponse.json({
      message: result.stubbed
        ? 'الوضع تجريبي — مفيش حساب واتساب بزنس متصل. شوف الكود في الـ server console.'
        : 'تم إرسال كود التحقق على واتساب.',
      target,
      // Only ever present in the stubbed dev path (no Twilio Verify
      // configured) — never leaked when a real provider is wired up.
      devCode: result.devCode,
    })
  } catch (error) {
    console.error('POST /api/seller/whatsapp/send-code error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
