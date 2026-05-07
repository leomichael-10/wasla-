'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AgeVerificationPage() {
  const router = useRouter()

  useEffect(() => {
    try {
      const verified = localStorage.getItem('age_verified')
      if (verified === 'true') {
        router.replace('/')
      }
    } catch { /* ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleYes() {
    try { localStorage.setItem('age_verified', 'true') } catch { /* ignore */ }
    router.replace('/')
  }

  function handleNo() {
    window.location.href = 'https://www.google.com'
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-8">

        {/* Brand */}
        <div>
          <div className="w-20 h-20 rounded-3xl bg-teal-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-black text-white select-none">T</span>
          </div>
          <h1 className="text-3xl font-black text-white">Tobaki</h1>
          <p className="text-teal-400 font-semibold mt-1">UAE Vape Marketplace</p>
        </div>

        {/* Gate */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
          <div>
            <p className="text-white font-black text-xl leading-snug">
              You must be 21 or older to enter this site
            </p>
            <p className="text-gray-400 text-sm mt-2">
              This website sells tobacco and nicotine products which are restricted to adults only.
            </p>
          </div>

          <p className="text-white font-semibold text-sm">Are you 21 years of age or older?</p>

          <div className="flex gap-3">
            <button
              onClick={handleYes}
              className="flex-1 bg-teal-400 hover:bg-teal-500 text-white font-black py-3.5 rounded-2xl text-sm transition-colors"
            >
              Yes, I am 21+
            </button>
            <button
              onClick={handleNo}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors"
            >
              No, exit
            </button>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed">
            By clicking "Yes, I am 21+" you confirm you are of legal age to purchase tobacco and
            nicotine products in the United Arab Emirates.
          </p>
        </div>

        <p className="text-gray-600 text-xs">
          Nicotine is an addictive substance. Keep out of reach of children.
        </p>
      </div>
    </div>
  )
}
