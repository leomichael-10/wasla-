'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

const EMPTY_VARIANT = { label: '', price: '', stockQty: '', skuCode: '' }

function VariantRow({ index, variant, onChange, onRemove, canRemove, isNew }) {
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition'
  const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1'
  function field(name) { return e => onChange(index, name, e.target.value) }
  return (
    <div className={`rounded-2xl border p-4 ${isNew ? 'border-brand-200 bg-brand-50' : 'border-gray-200 bg-[#FBF6EF]'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black text-gray-700">
          {isNew ? 'New Variant' : `Variant ${index + 1}`}
          {variant.label ? ` — ${variant.label}` : ''}
        </span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)}
            className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div><label className={labelCls}>Label</label>
          <input type="text" value={variant.label} onChange={field('label')} placeholder="500g" className={inputCls} /></div>
        <div><label className={labelCls}>Price EGP *</label>
          <input type="number" value={variant.price} onChange={field('price')} placeholder="25" min={0} step="0.01" className={inputCls} /></div>
        <div><label className={labelCls}>Stock Qty</label>
          <input type="number" value={variant.stockQty} onChange={field('stockQty')} placeholder="50" min={0} className={inputCls} /></div>
        {!isNew && (
          <div className="col-span-2 sm:col-span-1 flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={variant.isActive === false}
                onChange={e => onChange(index, 'isActive', e.target.checked ? false : true)}
                className="accent-red-400 w-4 h-4" />
              <span className="text-xs text-gray-600 font-semibold">Deactivate variant</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

function ImageManager({ images, setImages }) {
  const [uploading, setUploading] = useState(false)
  const [err,       setErr]       = useState('')

  const onDrop = useCallback(async (files) => {
    if (images.length + files.length > 5) { setErr('Maximum 5 images.'); return }
    setErr('')
    setUploading(true)
    const token = localStorage.getItem('wasla_token')
    const results = await Promise.allSettled(
      files.map(async f => {
        const fd = new FormData(); fd.append('image', f)
        const res  = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data.url
      })
    )
    setImages(prev => [...prev, ...results.filter(r => r.status === 'fulfilled').map(r => r.value)])
    const errs = results.filter(r => r.status === 'rejected').length
    if (errs) setErr(`${errs} image(s) failed.`)
    setUploading(false)
  }, [images.length, setImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 5 * 1024 * 1024, disabled: uploading || images.length >= 5,
  })

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              <button type="button" onClick={() => setImages(prev => prev.filter(u => u !== url))}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity" aria-label="Remove">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length < 5 && (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-brand-600'}`}>
          <input {...getInputProps()} />
          <p className="text-sm text-gray-500">{uploading ? 'Uploading…' : isDragActive ? 'Drop here' : 'Drag & drop or click to add images'}</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP · 5 MB max · {5 - images.length} remaining</p>
        </div>
      )}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  )
}

export default function EditProductPage() {
  const router = useRouter()
  const { id } = useParams()

  const [name,          setName]          = useState('')
  const [brand,         setBrand]         = useState('')
  const [description,   setDescription]   = useState('')
  const [categoryId,    setCategoryId]    = useState('')
  const [subCategoryId, setSubCategoryId] = useState('')
  const [images,        setImages]        = useState([])
  const [variants,      setVariants]      = useState([])
  const [newVariants,   setNewVariants]   = useState([])
  const [categories,    setCategories]    = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [menuSection,   setMenuSection]   = useState('')
  const [isRestaurant,  setIsRestaurant]  = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('wasla_token')
    Promise.all([
      fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/seller/profile', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([pData, cData, sData]) => {
      const p = pData.product
      if (!p) { setError('Product not found'); return }
      setName(p.name ?? '')
      setBrand(p.brand ?? '')
      setDescription(p.description ?? '')
      setCategoryId(String(p.categoryId ?? ''))
      setSubCategoryId(String(p.subCategoryId ?? ''))
      setImages(p.images ?? [])
      setMenuSection(p.menuSection ?? '')
      setIsRestaurant(sData.profile?.sellerType === 'RESTAURANT')
      setVariants(p.variants.map(v => ({
        id:            v.id,
        label:         v.label         ?? '',
        price:      String(Number(v.price)),
        stockQty:      String(v.stockQty),
        skuCode:       v.skuCode       ?? '',
        isActive:      true,
      })))
      setCategories(cData.categories ?? [])
    }).catch(() => setError('Failed to load product.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const cat = categories.find(c => String(c.id) === String(categoryId))
    setSubCategories(cat?.subCategories ?? [])
  }, [categoryId, categories])

  function updateVariant(index, field, value) {
    setVariants(prev => { const n = [...prev]; n[index] = { ...n[index], [field]: value }; return n })
  }
  function updateNew(index, field, value) {
    setNewVariants(prev => { const n = [...prev]; n[index] = { ...n[index], [field]: value }; return n })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const token = localStorage.getItem('wasla_token')
    const body  = {
      name:          name.trim(),
      brand:         brand.trim()       || null,
      description:   description.trim() || null,
      categoryId:    parseInt(categoryId, 10),
      subCategoryId: subCategoryId ? parseInt(subCategoryId, 10) : null,
      images,
      menuSection:   isRestaurant ? menuSection.trim() : undefined,
      variants: [
        ...variants.map(v => ({
          id:            v.id,
          label:         v.label         || null,
          price:      parseFloat(v.price),
          stockQty:      parseInt(v.stockQty, 10) || 0,
          isActive:      v.isActive,
        })),
        ...newVariants.filter(v => v.price).map(v => ({
          label:         v.label         || null,
          price:      parseFloat(v.price),
          stockQty:      parseInt(v.stockQty, 10) || 0,
        })),
      ],
    }
    try {
      const res  = await fetch(`/api/products/${id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:   JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/dashboard/products')
    } catch (err) {
      setError(err.message || 'Failed to update product.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white'
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100" />)}
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Edit Product</h1>
      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-black text-gray-900">Product Details</h2>
          <div><label className={labelCls}>Product Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} /></div>
          <div><label className={labelCls}>Brand</label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className={inputCls} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={labelCls}>Category *</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className={labelCls}>Sub-category</label>
              <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}
                disabled={subCategories.length === 0} className={`${inputCls} disabled:opacity-50`}>
                <option value="">{subCategories.length === 0 ? 'None' : 'Select…'}</option>
                {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
          </div>
          <div><label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-none`} /></div>
          {isRestaurant && (
            <div><label className={labelCls}>Menu section *</label>
              <input type="text" value={menuSection} onChange={e => setMenuSection(e.target.value)}
                placeholder="e.g. برجر" className={inputCls} /></div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="font-black text-gray-900">Images</h2>
          <ImageManager images={images} setImages={setImages} />
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-black text-gray-900">Existing Variants</h2>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <VariantRow key={v.id} index={i} variant={v} onChange={updateVariant}
                onRemove={() => {}} canRemove={false} isNew={false} />
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900">Add New Variants</h2>
            <button type="button" onClick={() => setNewVariants(prev => [...prev, { ...EMPTY_VARIANT }])}
              className="text-sm font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">
              + Add Variant
            </button>
          </div>
          {newVariants.length === 0 && (
            <p className="text-sm text-gray-400">No new variants. Click above to add.</p>
          )}
          <div className="space-y-3">
            {newVariants.map((v, i) => (
              <VariantRow key={i} index={i} variant={v} onChange={updateNew}
                onRemove={idx => setNewVariants(prev => prev.filter((_, ii) => ii !== idx))}
                canRemove isNew />
            ))}
          </div>
        </section>

        <div className="flex items-center gap-4 pb-6">
          <button type="submit" disabled={saving}
            className="bg-brand-700 hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <a href="/dashboard/products" className="text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</a>
        </div>

      </form>
    </div>
  )
}
