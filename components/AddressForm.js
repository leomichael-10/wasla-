'use client'
import { useState } from 'react'
import { t } from '../lib/i18n'

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

// Shared create/edit form for a saved delivery address. Used by both the
// Account page's address manager and the checkout "add new address" flow.
export default function AddressForm({ initial, zones, locale, onSaved, onCancel }) {
  const [label,        setLabel]        = useState(initial?.label ?? '')
  const [zoneId,       setZoneId]       = useState(initial?.zoneId ?? '')
  const [area,         setArea]         = useState(initial?.area ?? '')
  const [street,       setStreet]       = useState(initial?.street ?? '')
  const [building,     setBuilding]     = useState(initial?.building ?? '')
  const [floor,        setFloor]        = useState(initial?.floor ?? '')
  const [apartment,    setApartment]    = useState(initial?.apartment ?? '')
  const [landmark,     setLandmark]     = useState(initial?.landmark ?? '')
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '')
  const [notes,        setNotes]        = useState(initial?.notes ?? '')
  const [isDefault,    setIsDefault]    = useState(initial?.isDefault ?? false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!zoneId) { setError(t('address.errorZone', locale)); return }
    if (!building.trim() || !floor.trim() || !apartment.trim() || !landmark.trim()) {
      setError(t('address.errorRequired', locale))
      return
    }
    if (!contactPhone.trim()) { setError(t('address.errorPhone', locale)); return }

    setSaving(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res = await fetch(initial ? `/api/addresses/${initial.id}` : '/api/addresses', {
        method:  initial ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          label:        label.trim() || null,
          zoneId:       parseInt(zoneId, 10),
          area:         area.trim() || null,
          street:       street.trim() || null,
          building:     building.trim(),
          floor:        floor.trim(),
          apartment:    apartment.trim(),
          landmark:     landmark.trim(),
          contactPhone: contactPhone.trim(),
          notes:        notes.trim() || null,
          isDefault,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('address.errorSave', locale))
      onSaved(data.address)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div>
        <label className={labelCls}>{t('address.label', locale)}</label>
        <input
          type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder={t('address.labelPlaceholder', locale)} className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          {t('address.zone', locale)} <span className="text-red-400">*</span>
        </label>
        <select value={zoneId} onChange={e => setZoneId(e.target.value)} className={inputCls} required>
          <option value="">{t('address.zonePlaceholder', locale)}</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{locale === 'ar' ? z.nameAr : z.nameEn}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>{t('address.area', locale)}</label>
        <input type="text" value={area} onChange={e => setArea(e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>{t('address.street', locale)}</label>
        <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>{t('address.building', locale)} *</label>
          <input type="text" value={building} onChange={e => setBuilding(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>{t('address.floor', locale)} *</label>
          <input type="text" value={floor} onChange={e => setFloor(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>{t('address.apartment', locale)} *</label>
          <input type="text" value={apartment} onChange={e => setApartment(e.target.value)} className={inputCls} required />
        </div>
      </div>

      <div>
        <label className={labelCls}>{t('address.landmark', locale)} *</label>
        <input
          type="text" value={landmark} onChange={e => setLandmark(e.target.value)}
          placeholder={t('address.landmarkPlaceholder', locale)} className={inputCls} required
        />
      </div>

      <div>
        <label className={labelCls}>{t('address.contactPhone', locale)} *</label>
        <input
          type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
          placeholder="01xxxxxxxxx" className={inputCls} required
        />
      </div>

      <div>
        <label className={labelCls}>{t('address.notes', locale)}</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
          className="accent-brand-600"
        />
        <span className="text-sm text-gray-700">{t('address.setDefault', locale)}</span>
      </label>

      <div className="flex gap-2 pt-1">
        <button
          type="submit" disabled={saving}
          className="flex-1 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl text-sm transition-colors"
        >
          {saving ? t('address.saving', locale) : t('address.save', locale)}
        </button>
        {onCancel && (
          <button
            type="button" onClick={onCancel}
            className="px-5 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            {t('address.cancel', locale)}
          </button>
        )}
      </div>
    </form>
  )
}
