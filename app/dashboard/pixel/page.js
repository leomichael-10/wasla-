'use client'
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../../../lib/UserContext'

function StatCard({ label, value, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-50 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      {loading ? (
        <div className="h-8 w-20 bg-purple-50 rounded animate-pulse mt-1" />
      ) : (
        <p className="text-3xl font-black text-gray-900">{value ?? 0}</p>
      )}
    </div>
  )
}

function BarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-sm text-gray-400">
        No data yet — pixel hits will appear here
      </div>
    )
  }

  const max   = Math.max(...data.map(d => d.count), 1)
  const W     = 500
  const H     = 80
  const gap   = 2
  const barW  = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = Math.max(2, Math.round((d.count / max) * H))
        return (
          <rect
            key={d.date}
            x={i * (barW + gap)}
            y={H - barH}
            width={barW}
            height={barH}
            rx={1}
            className="fill-purple-500"
            opacity={0.8}
          >
            <title>{d.date}: {d.count} hit{d.count !== 1 ? 's' : ''}</title>
          </rect>
        )
      })}
    </svg>
  )
}

export default function TrackingPixelPage() {
  const { user } = useUser()

  const [pixel,    setPixel]    = useState(null)   // { pixelId, embedCode }
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [copied,   setCopied]   = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const token = localStorage.getItem('tobaki_token')
    const h     = { Authorization: `Bearer ${token}` }
    try {
      const [pRes, sRes] = await Promise.all([
        fetch('/api/seller/pixel',       { headers: h }),
        fetch('/api/seller/pixel/stats', { headers: h }),
      ])
      const [pData, sData] = await Promise.all([pRes.json(), sRes.json()])
      if (pRes.ok) setPixel(pData)
      if (sRes.ok) setStats(sData)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [user])

  useEffect(() => { load() }, [load])

  async function handleCopy() {
    if (!pixel?.embedCode) return
    try {
      await navigator.clipboard.writeText(pixel.embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback: select text */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Tracking Pixel</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Embed this pixel on any page to track visitor activity back to your shop.
        </p>
      </div>

      {/* Embed code */}
      <div className="bg-white rounded-2xl border border-purple-50 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900 text-sm">Your Embed Code</h2>
          <button
            onClick={handleCopy}
            disabled={!pixel}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-purple-700 hover:bg-purple-800 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        {loading ? (
          <div className="h-10 bg-purple-50 rounded-xl animate-pulse" />
        ) : pixel ? (
          <pre className="bg-[#f9f7ff] border border-purple-100 rounded-xl px-4 py-3 text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap break-all select-all">
            {pixel.embedCode}
          </pre>
        ) : (
          <p className="text-sm text-red-500">Failed to load pixel. Refresh the page.</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Paste this tag into the <code className="bg-gray-100 px-1 rounded">&lt;body&gt;</code> of any external page — it renders invisibly and fires silently on every page load.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Views"      value={stats?.totalHits} loading={loading} />
        <StatCard label="Unique Visitors"  value={stats?.uniqueIps} loading={loading} />
        <StatCard label="Days Tracked"     value={stats?.dailyHits?.length ?? 0} loading={loading} />
      </div>

      {/* Daily chart */}
      <div className="bg-white rounded-2xl border border-purple-50 shadow-sm p-5">
        <h2 className="font-black text-gray-900 text-sm mb-4">Hits — Last 30 Days</h2>
        {loading ? (
          <div className="h-24 bg-purple-50 rounded-xl animate-pulse" />
        ) : (
          <BarChart data={stats?.dailyHits} />
        )}
      </div>

      {/* Top referrers */}
      <div className="bg-white rounded-2xl border border-purple-50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="font-black text-gray-900 text-sm">Top Referrers</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-5 bg-purple-50 rounded animate-pulse" />)}
          </div>
        ) : !stats?.topReferrers?.length ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No referrer data yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9f7ff] border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Referrer</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Hits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.topReferrers.map((r, i) => (
                <tr key={i} className="hover:bg-[#f9f7ff] transition-colors">
                  <td className="px-5 py-3 text-gray-700 font-medium max-w-xs truncate">
                    {r.referrer ?? '(direct)'}
                  </td>
                  <td className="px-5 py-3 text-right font-black text-purple-700 tabular-nums">
                    {r.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
