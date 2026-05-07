import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../../../lib/authOptions'
import { prisma } from '../../../lib/prisma'

export default async function AuthRedirectPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { isOnboarded: true, role: true },
  })

  if (!user) {
    redirect('/login')
  }

  if (!user.isOnboarded) {
    redirect('/onboarding')
  }

  if (user.role === 'retailer' || user.role === 'wholesaler') {
    redirect('/dashboard')
  }

  redirect('/')
}
