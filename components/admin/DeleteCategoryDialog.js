'use client'
import { useState, useEffect } from 'react'
import { useLocale } from '../../lib/LocaleContext'
import { t, interpolate } from '../../lib/i18n'

// Opens from the Categories tab. What a delete would touch comes from the
// server (GET /api/admin/categories/[id]) so the numbers are never guessed
// here. Moving products is the default. Deleting them is a second, separate
// step that names the count.
export default function DeleteCategoryDialog({ category, onClose, onDeleted }) {
  const { locale } = useLocale()
  const tr = (key, vars) => interpolate(t(key, locale), vars ?? {})

  const [preview,         setPreview]         = useState(null)
  const [loadError,       setLoadError]       = useState('')
  const [mode,            setMode]            = useState('move')    // 'move' | 'delete'
  const [step,            setStep]            = useState('choose')  // 'choose' | 'confirmDelete'
  const [destinationId,   setDestinationId]   = useState('')
  const [busy,            setBusy]            = useState(false)
  const [error,           setError]           = useState('')

  // Server error codes → text. Unknown codes fall back to the generic message.
  function errorText(code) {
    const key = `admin.cat.err.${code}`
    const text = t(key, locale)
    return text === key ? t('admin.cat.err.FAILED', locale) : text
  }

  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem('wasla_token')
    fetch(`/api/admin/categories/${category.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'FAILED')
        return data
      })
      .then(data => {
        if (cancelled) return
        setPreview(data)
        setDestinationId(data.destinations[0] ? String(data.destinations[0].id) : '')
      })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'FAILED') })
    return () => { cancelled = true }
  }, [category.id])

  // Escape closes, unless a delete is in flight.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const isProtected = preview?.category.isInternal === true
  const n           = preview?.productCount ?? 0
  const m           = preview?.historyProducts.length ?? 0
  // Of the n products, m have order history and are hidden, not deleted.
  const deletable   = n - m
  const masters     = preview?.masterProductCount ?? 0
  const hasDest     = (preview?.destinations.length ?? 0) > 0
  // Mirrors the server: products that must go somewhere (all of them when
  // moving; only the ones with order history when deleting) plus retired rows.
  const movedCount  = mode === 'move' ? n : m
  const destRequired = movedCount > 0 || masters > 0
  const blocked     = destRequired && !hasDest
  const destMissing = destRequired && !destinationId
  const canSubmit   = !busy && !blocked && !destMissing && !isProtected && !!preview

  const destName = preview?.destinations.find(d => String(d.id) === destinationId)?.name ?? ''

  async function submit() {
    setBusy(true)
    setError('')
    const token = localStorage.getItem('wasla_token')
    const destination = destRequired ? Number(destinationId) : undefined
    const body = n === 0
      ? { action: 'delete', destinationId: destination }
      : mode === 'move'
        ? { action: 'move', destinationId: destination }
        : { action: 'delete', confirmCount: n, destinationId: destination }
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'FAILED')
      onDeleted(data)
    } catch (err) {
      setError(errorText(err.message))
      // The count changed underneath us: send the admin back to the numbers.
      if (err.message === 'COUNT_MISMATCH') setStep('choose')
    } finally {
      setBusy(false)
    }
  }

  const btnCancel = (
    <button type="button" onClick={onClose} disabled={busy}
      className="text-gray-600 hover:text-gray-900 text-sm font-bold px-4 py-2 rounded-full border border-gray-200 disabled:opacity-50 transition-colors">
      {t('admin.cat.delete.btnCancel', locale)}
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 id="delete-category-title" className="text-lg font-black text-gray-900">
          {tr('admin.cat.delete.title', { name: category.name })}
        </h2>

        {loadError && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{errorText(loadError)}</div>
        )}

        {!preview && !loadError && (
          <p className="text-sm text-gray-500">{t('admin.cat.delete.loading', locale)}</p>
        )}

        {/* Protected: the Food bucket behind restaurant menus. No delete at all. */}
        {isProtected && (
          <>
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {t('admin.cat.protectedNote', locale)}
            </p>
            <div className="flex justify-end">{btnCancel}</div>
          </>
        )}

        {/* Empty category: a simple confirm. */}
        {preview && !isProtected && n === 0 && step === 'choose' && (
          <>
            <p className="text-sm text-gray-700">{t('admin.cat.delete.empty', locale)}</p>
            {masters > 0 && <DestinationSelect value={destinationId} onChange={setDestinationId} options={preview.destinations} locale={locale} />}
            {blocked && <p className="text-sm text-red-600">{t('admin.cat.delete.noDest', locale)}</p>}
            <div className="flex justify-end gap-2">
              {btnCancel}
              <button type="button" onClick={submit} disabled={!canSubmit}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
                {busy ? t('admin.cat.delete.btnWorking', locale) : t('admin.cat.delete.btnEmpty', locale)}
              </button>
            </div>
          </>
        )}

        {/* Products exist: choose what happens to them. */}
        {preview && !isProtected && n > 0 && step === 'choose' && (
          <>
            <p className="text-sm text-gray-700">{tr('admin.cat.delete.count', { n })}</p>
            <p className="text-sm font-bold text-gray-900">{t('admin.cat.delete.choose', locale)}</p>

            <div className="space-y-2" role="radiogroup">
              <label className={`flex gap-3 items-start rounded-xl border px-4 py-3 cursor-pointer ${mode === 'move' ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}>
                <input type="radio" name="cat-delete-mode" value="move" checked={mode === 'move'} onChange={() => setMode('move')} className="mt-1" />
                <span>
                  <span className="block text-sm font-bold text-gray-900">{t('admin.cat.delete.optMove', locale)}</span>
                  <span className="block text-xs text-gray-500">{t('admin.cat.delete.optMoveHint', locale)}</span>
                </span>
              </label>
              <label className={`flex gap-3 items-start rounded-xl border px-4 py-3 cursor-pointer ${mode === 'delete' ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                <input type="radio" name="cat-delete-mode" value="delete" checked={mode === 'delete'} onChange={() => setMode('delete')} className="mt-1" />
                <span>
                  <span className="block text-sm font-bold text-gray-900">{t('admin.cat.delete.optDelete', locale)}</span>
                  <span className="block text-xs text-gray-500">{t('admin.cat.delete.optDeleteHint', locale)}</span>
                </span>
              </label>
            </div>

            {destRequired && (
              <DestinationSelect value={destinationId} onChange={setDestinationId} options={preview.destinations} locale={locale} />
            )}

            {mode === 'delete' && m > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
                <p className="text-sm text-amber-900">{tr('admin.cat.delete.history', { n: m })}</p>
                <p className="text-xs font-bold text-amber-900">{t('admin.cat.delete.historyList', locale)}</p>
                <ul className="text-xs text-amber-900 list-disc ps-5">
                  {preview.historyProducts.map(p => <li key={p.id}>{p.name}</li>)}
                </ul>
              </div>
            )}

            {blocked && <p className="text-sm text-red-600">{t('admin.cat.delete.noDest', locale)}</p>}

            <div className="flex justify-end gap-2">
              {btnCancel}
              {mode === 'move' ? (
                <button type="button" onClick={submit} disabled={!canSubmit}
                  className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
                  {busy ? t('admin.cat.delete.btnWorking', locale) : tr('admin.cat.delete.btnMove', { n })}
                </button>
              ) : (
                <button type="button" onClick={() => setStep('confirmDelete')} disabled={!canSubmit}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
                  {t('admin.cat.delete.btnContinue', locale)}
                </button>
              )}
            </div>
          </>
        )}

        {/* Second, separate confirmation for deleting products. Names the count. */}
        {preview && !isProtected && n > 0 && step === 'confirmDelete' && (
          <>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-1">
              <p className="text-sm font-black text-red-700">{t('admin.cat.delete.confirmTitle', locale)}</p>
              <p className="text-sm text-red-700">
                {deletable > 0 ? tr('admin.cat.delete.confirmText', { n: deletable }) : tr('admin.cat.delete.confirmNone', { m })}
              </p>
              {deletable > 0 && m > 0 && <p className="text-sm text-red-700">{tr('admin.cat.delete.confirmHide', { m })}</p>}
              {destRequired && destName && <p className="text-xs text-red-700">{t('admin.cat.delete.dest', locale)}: {destName}</p>}
            </div>
            <div className="flex justify-between gap-2">
              <button type="button" onClick={() => setStep('choose')} disabled={busy}
                className="text-gray-600 hover:text-gray-900 text-sm font-bold px-4 py-2 rounded-full border border-gray-200 disabled:opacity-50 transition-colors">
                {t('admin.cat.delete.btnBack', locale)}
              </button>
              <button type="button" onClick={submit} disabled={!canSubmit}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full transition-colors">
                {busy
                  ? t('admin.cat.delete.btnWorking', locale)
                  : deletable > 0 ? tr('admin.cat.delete.btnDelete', { n: deletable }) : tr('admin.cat.delete.btnHide', { m })}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}
      </div>
    </div>
  )
}

function DestinationSelect({ value, onChange, options, locale }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-gray-600">{t('admin.cat.delete.dest', locale)}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
      >
        {options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </label>
  )
}
