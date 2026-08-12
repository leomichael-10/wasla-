import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { getVerificationProvider } from '../../../../../lib/verification'
import { toE164, toWaId } from '../../../../../lib/phone'

// POST /api/seller/whatsapp/verify-code
// Seller only. Body: { whatsappNumber, code } — on success, saves the
// number (if it changed) and marks it verified. This is the only place
// SellerProfile.whatsappVerified flips to true.
export async function POST(request) {
  const auth = getUser(request)
  if (!auth || (auth.role !== 'retailer' && auth.role !== 'wholesaler')) {
    return NextResponse.json({ error: 'Sellers only' }, { status: 403 })
  }

  try {
    const { whatsappNumber, code } = await request.json()
    if (!whatsappNumber || !code) {
      return NextResponse.json({ error: 'whatsappNumber and code are required' }, { status: 400 })
    }
    // target (no '+') is what send-code issued the OTP under; e164 (with
    // '+') is the canonical form stored on the profile — see lib/phone.js.
    const target = toWaId(whatsappNumber)
    const e164   = toE164(whatsappNumber)
    if (!target || !e164) {
      return NextResponse.json({ error: 'A valid WhatsApp number is required' }, { status: 400 })
    }

    const result = await getVerificationProvider('whatsapp').checkCode({ target, code, purpose: 'shop_onboarding' })
    if (!result.valid) {
      const messages = {
        expired:        'الكود منتهي الصلاحية. اطلب كود جديد.',
        locked:         'محاولات كتير غلط. اطلب كود جديد.',
        wrong_code:      'الكود غلط. حاول تاني.',
        no_active_code: 'مفيش كود نشط. اطلب كود جديد.',
        provider_error: 'تعذر التحقق من الكود. حاول تاني.',
      }
      return NextResponse.json(
        { error: messages[result.reason] ?? 'الكود غلط أو منتهي الصلاحية.', attemptsLeft: result.attemptsLeft },
        { status: 400 }
      )
    }

    const profile = await prisma.sellerProfile.update({
      where: { userId: auth.userId },
      data:  { whatsappNumber: e164, whatsappVerified: true },
    })
    return NextResponse.json({ profile: JSON.parse(JSON.stringify(profile)) })
  } catch (error) {
    console.error('POST /api/seller/whatsapp/verify-code error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
