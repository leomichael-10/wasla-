'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { useUser } from '../lib/UserContext'

// Syncs a NextAuth Google session into localStorage + UserContext so the rest
// of the app (which uses the custom JWT flow) works transparently.
export default function AuthSync() {
  const { data: session, status } = useSession()
  const { login } = useUser()
  const synced = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated' || synced.current) return

    async function sync() {
      let customToken = session?.customToken
      let userData = session?.user?.userId
        ? {
            id:    session.user.userId,
            email: session.user.email,
            role:  session.user.role ?? 'customer',
          }
        : null

      if (!customToken) {
        try {
          const res  = await fetch('/api/auth/token')
          const data = await res.json()
          if (res.ok) {
            customToken = data.customToken
            userData    = data.user
          }
        } catch {
          return
        }
      }

      if (!customToken || !userData) return

      localStorage.setItem('wasla_token', customToken)
      localStorage.setItem('wasla_user',  JSON.stringify(userData))
      document.cookie = `wasla_user_info=${encodeURIComponent(JSON.stringify(userData))}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`

      login(userData)
      synced.current = true
    }

    sync()
  }, [status, session, login])

  return null
}
