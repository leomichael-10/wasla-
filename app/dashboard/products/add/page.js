'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'

const EMPTY_VARIANT = {
  flavor: '', nicotineLevel: '', puffCount: '', sizeMl: '',
  priceAed: '', stockQty: '', skuCode: '',
}

function VariantRow({ index, variant, onChange, onRemove, canRemove }) {
  function field(name) { return e => onChange(index, name, e.target.value) }
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition'
  const labelCls = 'block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1'
  return (
    <div className="bg-[#f9f7ff] rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black text-gray-700">Variant {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)}
            className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div><label className={labelCls}>Flavor</label>
          <input type="text" value={variant.flavor} onChange={field('flavor')} placeholder="Watermelon Ice" className={inputCls} /></div>
        <div><label className={labelCls}>Nicotine Level</label>
          <input type="text" value={variant.nicotineLevel} onChange={field('nicotineLevel')} placeholder="5%" className={inputCls} /></div>
        <div><label className={labelCls}>Puff Count</label>
          <input type="number" value={variant.puffCount} onChange={field('puffCount')} placeholder="5000" min={0} className={inputCls} /></div>
        <div><label className={labelCls}>Size (ml)</label>
          <input type="number" value={variant.sizeMl} onChange={field('sizeMl')} placeholder="10" min={0} className={inputCls} /></div>
        <div><label className={labelCls}>Price AED <span className="text-red-400 normal-case font-bold">*</span></label>
          <input type="number" value={variant.priceAed} onChange={field('priceAed')} placeholder="25" min={0} step="0.01" required className={inputCls} /></div>
        <div><label className={labelCls}>Stock Qty</label>
          <input type="number" value={variant.stockQty} onChange={field('stockQty')} placeholder="50" min={0} className={inputCls} /></div>
        <div className="col-span-2 sm:col-span-1"><label className={labelCls}>SKU Code</label>
          <input type="text" value={variant.skuCode} onChange={field('skuCode')} placeholder="ELF-BC5K-WM" className={inputCls} /></div>
      </div>
    </div>
  )
}

function ImageUploader({ images, setImages }) {
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  const onDrop = useCallback(async (acceptedFiles) => {
    if (images.length + acceptedFiles.length > 5) {
      setUploadErr('Maximum 5 images allowed.')
      return
    }
    setUploadErr('')
    setUploading(true)
    const token = localStorage.getItem('tobaki_token')

    const results = await Promise.allSettled(
      acceptedFiles.map(async file => {
        const fd = new FormData()
        fd.append('image', file)
        const res  = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
        return data.url
      })
    )

    const urls = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
    const failed = results.filter(r => r.status === 'rejected')

    setImages(prev => [...prev, ...urls])
    if (failed.length > 0) {
      const reasons = failed.map(r => r.reason?.message ?? 'unknown error').join('; ')
      setUploadErr(`${failed.length} image(s) failed: ${reasons}`)
    }
    setUploading(false)
  }, [images.length, setImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading || images.length >= 5,
  })

  function removeImage(url) {
    setImages(prev => prev.filter(u => u !== url))
  }

  return (
    <div className="space-y-3">
      {/* Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
              <img src={url} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                aria-label="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < 5 && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-purple-600 bg-purple-50'
              : uploading
                ? 'border-gray-200 bg-[#f9f7ff] cursor-not-allowed'
                : 'border-gray-200 hover:border-purple-600 hover:bg-purple-50'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-sm text-gray-500 font-medium">Uploading…</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 font-medium">
                {isDragActive ? 'Drop images here' : 'Drag & drop images, or click to select'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Max 5 MB · Up to {5 - images.length} more</p>
            </>
          )}
        </div>
      )}

      {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}
    </div>
  )
}

export default function AddProductPage() {
  const router = useRouter()

  const [name,          setName]          = useState('')
  const [brand,         setBrand]         = useState('')
  const [categoryId,    setCategoryId]    = useState('')
  const [subCategoryId, setSubCategoryId] = useState('')
  const [description,   setDescription]   = useState('')
  const [variants,      setVariants]      = useState([{ ...EMPTY_VARIANT }])
  const [images,        setImages]        = useState([])

  const [categories,    setCategories]    = useState([])
  const [subCategories, setSubCategories] = useState([])

  const [loading,     setLoading]     = useState(false)
  const [catLoading,  setCatLoading]  = useState(true)
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(data.categories ?? []))
      .catch(() => setError('Failed to load categories.'))
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => {
    const cat = categories.find(c => String(c.id) === String(categoryId))
    setSubCategories(cat?.subCategories ?? [])
    setSubCategoryId('')
  }, [categoryId, categories])

  function updateVariant(index, field, value) {
    setVariants(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next })
  }
  function addVariant()        { setVariants(prev => [...prev, { ...EMPTY_VARIANT }]) }
  function removeVariant(i)    { setVariants(prev => prev.filter((_, idx) => idx !== i)) }

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name       = 'Product name is required.'
    if (!categoryId)  errs.categoryId = 'Please select a category.'
    variants.forEach((v, i) => {
      if (!v.priceAed || Number(v.priceAed) <= 0)
        errs[`variant_${i}_price`] = `Variant ${i + 1}: price is required.`
    })
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    const token = localStorage.getItem('tobaki_token')
    const body  = {
      name:          name.trim(),
      brand:         brand.trim()       || undefined,
      categoryId:    parseInt(categoryId, 10),
      subCategoryId: subCategoryId      ? parseInt(subCategoryId, 10) : undefined,
      description:   description.trim() || undefined,
      images,
      variants: variants.map(v => ({
        flavor:        v.flavor.trim()        || undefined,
        nicotineLevel: v.nicotineLevel.trim() || undefined,
        puffCount:     v.puffCount            ? parseInt(v.puffCount, 10)  : undefined,
        sizeMl:        v.sizeMl               ? parseInt(v.sizeMl, 10)     : undefined,
        priceAed:      parseFloat(v.priceAed),
        stockQty:      v.stockQty             ? parseInt(v.stockQty, 10)   : 0,
        skuCode:       v.skuCode.trim()       || undefined,
      })),
    }
    try {
      const res  = await fetch('/api/products', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:   JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/dashboard/products')
    } catch (err) {
      setError(err.message || 'Failed to create product. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition bg-white'
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Add Product</h1>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Product details */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-black text-gray-900">Product Details</h2>
          <div>
            <label className={labelCls}>Product Name <span className="text-red-400">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Elf Bar BC5000"
              className={`${inputCls} ${fieldErrors.name ? 'border-red-300 ring-red-200' : ''}`} />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>Brand</label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Elf Bar" className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category <span className="text-red-400">*</span></label>
              {catLoading ? (
                <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
              ) : (
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className={`${inputCls} ${fieldErrors.categoryId ? 'border-red-300' : ''}`}>
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {fieldErrors.categoryId && <p className="text-xs text-red-500 mt-1">{fieldErrors.categoryId}</p>}
            </div>
            <div>
              <label className={labelCls}>Sub-category</label>
              <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}
                disabled={subCategories.length === 0}
                className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
                <option value="">{subCategories.length === 0 ? 'No sub-categories' : 'Select sub-category…'}</option>
                {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the product…" rows={3} className={`${inputCls} resize-none`} />
          </div>
        </section>

        {/* Images */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <div>
            <h2 className="font-black text-gray-900">Product Images</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload up to 5 images. First image is the main display image.</p>
          </div>
          <ImageUploader images={images} setImages={setImages} />
        </section>

        {/* Variants */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900">Variants</h2>
              <p className="text-xs text-gray-400 mt-0.5">Add one row per flavor / option. Price is required.</p>
            </div>
            <button type="button" onClick={addVariant}
              className="text-sm font-bold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
              + Add Variant
            </button>
          </div>
          {Object.entries(fieldErrors).filter(([k]) => k.startsWith('variant_')).map(([k, msg]) => (
            <p key={k} className="text-xs text-red-500">{msg}</p>
          ))}
          <div className="space-y-3">
            {variants.map((v, i) => (
              <VariantRow key={i} index={i} variant={v} onChange={updateVariant} onRemove={removeVariant} canRemove={variants.length > 1} />
            ))}
          </div>
          <button type="button" onClick={addVariant}
            className="w-full border-2 border-dashed border-gray-200 hover:border-purple-600 text-gray-400 hover:text-purple-700 font-semibold text-sm py-3 rounded-2xl transition-colors">
            + Add another variant
          </button>
        </section>

        {/* Submit */}
        <div className="flex items-center gap-4 pb-6">
          <button type="submit" disabled={loading}
            className="bg-purple-700 hover:bg-purple-800 active:bg-purple-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors">
            {loading ? 'Creating product…' : 'Create Product'}
          </button>
          <a href="/dashboard/products" className="text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</a>
        </div>

      </form>
    </div>
  )
}
