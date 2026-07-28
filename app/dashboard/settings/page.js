'use client'
import { useState, useEffect, useCallback } from 'react'

function ZoneRow({ entry, onSave }) {
  const { zone, coverage } = entry
  const [isActive,      setIsActive]      = useState(Boolean(coverage?.isActive))
  const [feeOverride,   setFeeOverride]   = useState(coverage?.feeOverride != null ? String(coverage.feeOverride) : '')
  const [minOrderValue, setMinOrderValue] = useState(coverage?.minOrderValue != null ? String(coverage.minOrderValue) : '0')
  const [cutoffTime,    setCutoffTime]    = useState(coverage?.cutoffTime ?? '')
  const [saving,        setSaving]        = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(zone.id, {
        isActive,
        feeOverride:   feeOverride ? parseFloat(feeOverride) : null,
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : 0,
        cutoffTime:    cutoffTime || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`border rounded-2xl p-4 transition-colors ${isActive ? 'border-purple-200 bg-[#f9f7ff]' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-gray-900 text-sm">{zone.nameEn}</p>
          <p className="text-xs text-gray-400">{zone.nameAr} · base fee EGP {Number(zone.baseFee).toFixed(0)} · ~{zone.etaMinutes}m</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
          <div className="w-10 h-5.5 bg-gray-200 peer-checked:bg-purple-600 rounded-full transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4.5" />
        </label>
      </div>

      {isActive && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Fee override (EGP)</label>
            <input type="number" min="0" value={feeOverride} onChange={e => setFeeOverride(e.target.value)}
              placeholder={`${Number(zone.baseFee).toFixed(0)}`}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Min order (EGP)</label>
            <input type="number" min="0" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Cutoff time</label>
            <input type="time" value={cutoffTime} onChange={e => setCutoffTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-bold bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl transition-colors"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

export default function DashboardSettingsPage() {
  const [profile,  setProfile]  = useState(null)
  const [zones,    setZones]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error,    setError]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const [profRes, zoneRes] = await Promise.all([
        fetch('/api/seller/profile',       { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/seller/zone-coverage', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const profData = await profRes.json()
      const zoneData = await zoneRes.json()
      if (!profRes.ok) throw new Error(profData.error)
      setProfile(profData.profile)
      setZones(zoneData.zones ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggleOpen() {
    setToggling(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/seller/profile', {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isOpen: !profile.isOpen }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(data.profile)
    } catch (err) {
      setError(err.message || 'Failed to update shop status.')
    } finally {
      setToggling(false)
    }
  }

  async function handleSaveZone(zoneId, values) {
    const token = localStorage.getItem('wasla_token')
    const res  = await fetch('/api/seller/zone-coverage', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ zoneId, ...values }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save zone.'); return }
    setZones(prev => prev.map(z => z.zone.id === zoneId ? { ...z, coverage: data.coverage } : z))
  }

  if (loading) {
    return <div className="bg-white rounded-2xl border border-gray-100 animate-pulse h-64" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Delivery Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Choose which areas you deliver to, and open or close your shop.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
        <div>
          <p className="font-black text-gray-900">Shop status</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.isOpen
              ? 'Open — your products are visible and available for order.'
              : 'Closed — your products show as unavailable, but stay in your catalog.'}
          </p>
        </div>
        <button
          onClick={handleToggleOpen}
          disabled={toggling}
          className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
            profile?.isOpen
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          {toggling ? '…' : profile?.isOpen ? 'Close Shop' : 'Open Shop'}
        </button>
      </div>

      <div>
        <h2 className="font-black text-gray-900 mb-3">Delivery Zones</h2>
        <div className="space-y-3">
          {zones.map(entry => (
            <ZoneRow key={entry.zone.id} entry={entry} onSave={handleSaveZone} />
          ))}
        </div>
      </div>
    </div>
  )
}
