'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useUser } from '../../lib/UserContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useUser()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!ageConfirmed) {
      setError('You must be 18 or older to use Tobaki.')
      return
    }

    setLoading(true)

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Login failed. Please try again.')
        return
      }

      localStorage.setItem('tobaki_token', data.token)
      localStorage.setItem('tobaki_user',  JSON.stringify(data.user))
      login(data.user)

      fetch('/api/auth/verify-age', {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${data.token}` },
      }).catch(() => {})

      const { role } = data.user
      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'retailer' || role === 'wholesaler') {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
    } catch {
      setError('Unable to connect. Check your internet connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f7ff] flex flex-col">

      <div className="bg-purple-700 px-6 py-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight">
          toba<span className="text-amber-300">ki</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-3xl shadow-lg border border-purple-50 w-full max-w-md p-8">

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Tobaki account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={e => setAgeConfirmed(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  ageConfirmed
                    ? 'bg-purple-700 border-purple-700'
                    : 'border-gray-300 group-hover:border-purple-400'
                }`}>
                  {ageConfirmed && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-600 leading-snug select-none">
                I confirm that I am <span className="font-semibold">18 years of age or older</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !ageConfirmed}
              className="w-full bg-purple-700 hover:bg-purple-800 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-2xl text-sm transition-all duration-200 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

          </form>

          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/auth/redirect' })}
            className="mt-3 w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-[#f9f7ff] active:bg-gray-100 active:scale-95 transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-purple-600 font-semibold hover:underline">
              Register
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
