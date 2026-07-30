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
    <div className={`border rounded-2xl p-4 transition-colors ${isActive ? 'border-brand-200 bg-[#FBF6EF]' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-gray-900 text-sm">{zone.nameEn}</p>
          <p className="text-xs text-gray-400">{zone.nameAr} · base fee EGP {Number(zone.baseFee).toFixed(0)} · ~{zone.etaMinutes}m</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
          <div className="w-10 h-5.5 bg-gray-200 peer-checked:bg-brand-600 rounded-full transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4.5" />
        </label>
      </div>

      {isActive && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Fee override (EGP)</label>
            <input type="number" min="0" value={feeOverride} onChange={e => setFeeOverride(e.target.value)}
              placeholder={`${Number(zone.baseFee).toFixed(0)}`}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Min order (EGP)</label>
            <input type="number" min="0" value={minOrderValue} onChange={e => setMinOrderValue(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase">Cutoff time</label>
            <input type="time" value={cutoffTime} onChange={e => setCutoffTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-bold bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl transition-colors"
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
  const [whatsapp,   setWhatsapp]   = useState('')
  const [codeStep,   setCodeStep]   = useState(false)
  const [code,       setCode]       = useState('')
  const [sendingWa,  setSendingWa]  = useState(false)
  const [verifyingWa, setVerifyingWa] = useState(false)
  const [waMsg,      setWaMsg]      = useState('')
  const [devCode,    setDevCode]    = useState('')

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
      setWhatsapp(profData.profile?.whatsappNumber ?? '')
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

  async function handleSendCode() {
    setSendingWa(true)
    setWaMsg('')
    setDevCode('')
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/seller/whatsapp/send-code', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ whatsappNumber: whatsapp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setWaMsg(data.message)
      if (data.devCode) setDevCode(data.devCode) // only ever present in the no-Twilio-Verify dev stub
      setCodeStep(true)
    } catch (err) {
      setError(err.message || 'Failed to send verification code.')
    } finally {
      setSendingWa(false)
    }
  }

  async function handleVerifyCode() {
    setVerifyingWa(true)
    setWaMsg('')
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/seller/whatsapp/verify-code', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ whatsappNumber: whatsapp, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfile(data.profile)
      setCodeStep(false)
      setCode('')
      setWaMsg('تم توثيق رقم الواتساب بنجاح!')
    } catch (err) {
      setError(err.message || 'Failed to verify code.')
    } finally {
      setVerifyingWa(false)
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-black text-gray-900">WhatsApp number</p>
          {profile?.whatsappVerified && (
            <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Verified</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Required and verified before you can receive orders — new orders are sent here so you can confirm them fast.
        </p>

        <div className="flex gap-2">
          <input
            type="tel"
            value={whatsapp}
            onChange={e => { setWhatsapp(e.target.value); setCodeStep(false); setWaMsg('') }}
            placeholder="01012345678"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={handleSendCode}
            disabled={sendingWa || !whatsapp}
            className="text-sm font-bold bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {sendingWa ? '…' : profile?.whatsappVerified && whatsapp === profile.whatsappNumber ? 'Re-verify' : 'Send Code'}
          </button>
        </div>

        {waMsg && <p className="text-xs text-gray-500 mt-2">{waMsg}</p>}
        {devCode && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2 font-mono">
            Dev-only stub code (no Twilio Verify configured): <strong>{devCode}</strong>
          </p>
        )}

        {codeStep && (
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-center tracking-[0.3em] font-bold focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              onClick={handleVerifyCode}
              disabled={verifyingWa || code.length !== 6}
              className="text-sm font-bold bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
            >
              {verifyingWa ? '…' : 'Verify'}
            </button>
          </div>
        )}

        {!profile?.whatsappVerified && (
          <p className="text-xs text-red-500 font-semibold mt-2">Not verified yet — you can't receive orders until this is confirmed.</p>
        )}
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
