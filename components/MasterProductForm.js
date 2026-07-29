'use client'
import { useState, useRef } from 'react'

const PRODUCT_TYPES = ['Packaged Food', 'Fresh / Perishable', 'Beverage', 'Spice & Seasoning', 'Heritage Good', 'Other']
const WEIGHT_TYPES = new Set(['Packaged Food', 'Fresh / Perishable', 'Spice & Seasoning'])

function getDefaultVariants(productType) {
  const base = {}
  if (!productType) return base
  if (['Heritage Good'].includes(productType)) base.Size = []
  if (WEIGHT_TYPES.has(productType)) base.Weight = []
  return base
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-brand-100 text-brand-800 text-xs font-semibold px-2.5 py-1 rounded-full">
      {label}
      <button type="button" onClick={onRemove} className="text-brand-400 hover:text-brand-700 leading-none">×</button>
    </span>
  )
}

export default function MasterProductForm({ categories, initial, onSave, onCancel }) {
  const [name,        setName]        = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [productType, setProductType] = useState(initial?.productType ?? '')
  const [categoryId,  setCategoryId]  = useState(initial?.categoryId ? String(initial.categoryId) : '')
  const [brand,       setBrand]       = useState(initial?.brand ?? '')
  const [priceMin,    setPriceMin]    = useState(initial?.priceMin != null ? String(Number(initial.priceMin)) : '')
  const [priceMax,    setPriceMax]    = useState(initial?.priceMax != null ? String(Number(initial.priceMax)) : '')
  const [sku,         setSku]         = useState(initial?.sku ?? '')
  const [tags,        setTags]        = useState(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '')
  const [images,      setImages]      = useState(Array.isArray(initial?.images) ? initial.images : [])
  const [variants,    setVariants]    = useState(() => {
    if (initial?.variants && typeof initial.variants === 'object') return { ...initial.variants }
    return getDefaultVariants(initial?.productType ?? '')
  })
  const [variantInputs, setVariantInputs] = useState({})
  const [newAttrName,   setNewAttrName]   = useState('')
  const [uploading,     setUploading]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  const fileRef = useRef(null)

  function handleTypeChange(type) {
    setProductType(type)
    const defaults = getDefaultVariants(type)
    setVariants(prev => {
      const merged = { ...prev }
      for (const k of Object.keys(defaults)) {
        if (!(k in merged)) merged[k] = []
      }
      return merged
    })
  }

  function addVariantValue(attr, raw) {
    const v = raw.trim()
    if (!v) return
    setVariants(prev => ({
      ...prev,
      [attr]: prev[attr].includes(v) ? prev[attr] : [...prev[attr], v],
    }))
    setVariantInputs(prev => ({ ...prev, [attr]: '' }))
  }

  function addAttr() {
    const k = newAttrName.trim()
    if (!k || k in variants) return
    setVariants(prev => ({ ...prev, [k]: [] }))
    setNewAttrName('')
  }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true); setError('')
    const token = localStorage.getItem('wasla_token')
    try {
      const urls = await Promise.all(files.map(async file => {
        const fd = new FormData()
        fd.append('image', file)
        const res  = await fetch('/api/upload', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    fd,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data.url
      }))
      setImages(prev => [...prev, ...urls])
    } catch (err) {
      setError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function moveImage(idx, dir) {
    setImages(prev => {
      const a   = [...prev]
      const to  = idx + dir
      if (to < 0 || to >= a.length) return a
      ;[a[idx], a[to]] = [a[to], a[idx]]
      return a
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    if (!categoryId)  { setError('Category is required.'); return }
    setSaving(true); setError('')
    const token = localStorage.getItem('wasla_token')
    const body = {
      name:        name.trim(),
      description: description.trim() || null,
      productType: productType || null,
      categoryId,
      brand:       brand.trim() || null,
      priceMin:    priceMin ? parseFloat(priceMin) : null,
      priceMax:    priceMax ? parseFloat(priceMax) : null,
      sku:         sku.trim() || null,
      tags:        tags.split(',').map(t => t.trim()).filter(Boolean),
      images,
      variants:    Object.keys(variants).length > 0 ? variants : null,
    }
    const url    = initial ? `/api/admin/master-products/${initial.id}` : '/api/admin/master-products'
    const method = initial ? 'PATCH' : 'POST'
    try {
      const res  = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.product)
    } catch (err) {
      setError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-black text-gray-900">{initial ? 'Edit Product' : 'Add to Catalog'}</h2>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">
          Cancel
        </button>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* ── Basic info ── */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Name *</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Bun Kassala 500g"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Short product description…"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Product Type</label>
            <select
              value={productType} onChange={e => handleTypeChange(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">— Select type —</option>
              {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category *</label>
            <select
              required value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Brand</label>
            <input
              type="text" value={brand} onChange={e => setBrand(e.target.value)}
              placeholder="e.g. Kassala"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">SKU (optional)</label>
            <input
              type="text" value={sku} onChange={e => setSku(e.target.value)}
              placeholder="e.g. BUN-KSL-500G"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price Min (EGP)</label>
            <input
              type="number" step="0.01" min="0" value={priceMin} onChange={e => setPriceMin(e.target.value)}
              placeholder="0.00"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price Max (EGP)</label>
            <input
              type="number" step="0.01" min="0" value={priceMax} onChange={e => setPriceMax(e.target.value)}
              placeholder="0.00"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>

          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tags (comma-separated)</label>
            <input
              type="text" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. coffee, kassala, bestseller"
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </section>

        {/* ── Images ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Images</p>
              <p className="text-xs text-gray-400 mt-0.5">First image is the cover. Use arrows to reorder.</p>
            </div>
            <label className={`cursor-pointer bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploading ? 'Uploading…' : '+ Upload Images'}
              <input
                ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                multiple className="hidden" onChange={handleImageUpload}
              />
            </label>
          </div>

          {images.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {images.map((url, i) => (
                <div key={url + i} className="relative group">
                  <img
                    src={url} alt={`Product image ${i + 1}`}
                    className={`w-24 h-24 object-cover rounded-xl border-2 ${i === 0 ? 'border-brand-500' : 'border-gray-200'}`}
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-brand-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      COVER
                    </span>
                  )}
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow"
                    >×</button>
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {i > 0 && (
                      <button type="button" onClick={() => moveImage(i, -1)}
                        className="w-5 h-5 bg-white text-gray-700 rounded-full text-xs flex items-center justify-center shadow border border-gray-200">
                        ‹
                      </button>
                    )}
                    {i < images.length - 1 && (
                      <button type="button" onClick={() => moveImage(i, 1)}
                        className="w-5 h-5 bg-white text-gray-700 rounded-full text-xs flex items-center justify-center shadow border border-gray-200">
                        ›
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
              <p className="text-sm text-gray-400">No images yet — upload some above</p>
            </div>
          )}
        </section>

        {/* ── Variants builder ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Variant Attributes</p>
          </div>

          <div className="space-y-4">
            {Object.entries(variants).map(([attr, values]) => (
              <div key={attr} className="bg-[#FBF6EF] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    {attr}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVariants(prev => { const n = { ...prev }; delete n[attr]; return n })}
                    className="ml-auto text-xs text-red-400 hover:text-red-600 font-semibold"
                  >
                    Remove
                  </button>
                </div>

                {/* Weight suggestions */}
                {attr === 'Weight' && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['100g', '250g', '500g', '1kg', '2kg'].map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => addVariantValue('Weight', s)}
                        disabled={values.includes(s)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                          values.includes(s)
                            ? 'bg-brand-100 text-brand-700 border-brand-200 opacity-50'
                            : 'border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Colour suggestions */}
                {attr === 'Colour' && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['Black', 'White', 'Beige', 'Hunter Green', 'Navy', 'Red', 'Blue', 'Pink'].map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => addVariantValue('Colour', s)}
                        disabled={values.includes(s)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                          values.includes(s)
                            ? 'bg-brand-100 text-brand-700 border-brand-200 opacity-50'
                            : 'border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Size suggestions */}
                {attr === 'Size' && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => addVariantValue('Size', s)}
                        disabled={values.includes(s)}
                        className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
                          values.includes(s)
                            ? 'bg-brand-100 text-brand-700 border-brand-200 opacity-50'
                            : 'border-gray-300 text-gray-600 hover:border-brand-400 hover:text-brand-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Chips */}
                {values.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {values.map(v => (
                      <Chip
                        key={v} label={v}
                        onRemove={() => setVariants(prev => ({ ...prev, [attr]: prev[attr].filter(x => x !== v) }))}
                      />
                    ))}
                  </div>
                )}

                {/* Add option input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={variantInputs[attr] ?? ''}
                    onChange={e => setVariantInputs(prev => ({ ...prev, [attr]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantValue(attr, variantInputs[attr] ?? ''))}
                    placeholder={`Add ${attr} option…`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button
                    type="button"
                    onClick={() => addVariantValue(attr, variantInputs[attr] ?? '')}
                    className="bg-white border border-gray-200 hover:border-brand-400 hover:text-brand-700 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Add option
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom attribute */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newAttrName}
              onChange={e => setNewAttrName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttr())}
              placeholder="New attribute name (e.g. Volume, Battery Size)…"
              className="flex-1 border border-dashed border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder-gray-400"
            />
            <button
              type="button" onClick={addAttr}
              disabled={!newAttrName.trim()}
              className="bg-gray-100 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40 text-gray-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              + Add Attribute
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
        <button type="button" onClick={onCancel}
          className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
        <button
          type="submit" disabled={saving}
          className="bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add to Catalog'}
        </button>
      </div>
    </form>
  )
}
