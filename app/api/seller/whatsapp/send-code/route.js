import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getUser } from '../../../../../lib/auth'
import { getVerificationProvider } from '../../../../../lib/verification'
import { toWaId } from '../../../../../lib/phone'

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

    // target is E.164-without-'+' (what Twilio's WhatsApp `to:` param and
    // wa.me both expect — see lib/phone.js's toWaId and
    // lib/notifications/waMeLink.js). profile.whatsappNumber is already
    // full E.164 (with '+') once saved, so toWaId handles both that and a
    // freshly-typed candidate number the same way.
    const rawCandidate = body.whatsappNumber || profile.whatsappNumber
    const target = toWaId(rawCandidate)
    if (!target) {
      return NextResponse.json({ error: 'A valid WhatsApp number is required (e.g. 01012345678 or +249…)' }, { status: 400 })
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
