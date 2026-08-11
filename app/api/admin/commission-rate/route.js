import { NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/auth'
import { getCurrentCommissionRate, setCommissionRate } from '../../../../lib/wallet'

// GET /api/admin/commission-rate — admin only. Current rate plus recent
// change history (CommissionSetting is append-only, so this table already
// is the audit log — see prisma/schema.prisma).
export async function GET(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rate = await getCurrentCommissionRate()
    const history = await prisma.commissionSetting.findMany({
      orderBy: { id: 'desc' },
      take:    20,
      select:  {
        id: true, rate: true, createdAt: true,
        updatedByUser: { select: { email: true } },
      },
    })

    return NextResponse.json({
      rate,
      history: JSON.parse(JSON.stringify(history)),
    })
  } catch (error) {
    console.error('GET /api/admin/commission-rate error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// POST /api/admin/commission-rate — admin only. Body: { ratePercent }
// (0-100, e.g. 5.5 for 5.5%). Inserts a new CommissionSetting row; never
// updates one in place, and never touches any past WalletTransaction —
// see lib/wallet.js's setCommissionRate() and deductCommission().
export async function POST(request) {
  const auth = getUser(request)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const ratePercent = Number(body.ratePercent)
    if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      return NextResponse.json({ error: 'Rate must be a number between 0 and 100.' }, { status: 400 })
    }

    const setting = await setCommissionRate({ rate: ratePercent / 100, adminId: auth.userId })

    return NextResponse.json({ rate: Number(setting.rate) }, { status: 201 })
  } catch (error) {
    if (error?.code === 'INVALID_RATE') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('POST /api/admin/commission-rate error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
