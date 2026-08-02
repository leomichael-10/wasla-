'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { getLocaleCookie, t } from '../../../../lib/i18n'

function ImageUploader({ images, setImages, locale }) {
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  const onDrop = useCallback(async (acceptedFiles) => {
    if (images.length + acceptedFiles.length > 5) {
      setUploadErr(t('seller.maxImages', locale))
      return
    }
    setUploadErr('')
    setUploading(true)
    const token = localStorage.getItem('wasla_token')

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
  }, [images.length, setImages, locale])

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
              ? 'border-brand-600 bg-brand-50'
              : uploading
                ? 'border-gray-200 bg-[#FBF6EF] cursor-not-allowed'
                : 'border-gray-200 hover:border-brand-600 hover:bg-brand-50'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-sm text-gray-500 font-medium">{t('seller.uploading', locale)}</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 font-medium">
                {isDragActive ? t('seller.dropHere', locale) : t('seller.dragDrop', locale)}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Max 5 MB · {5 - images.length}</p>
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
  const [price,         setPrice]         = useState('')
  const [images,        setImages]        = useState([])
  const [menuSection,   setMenuSection]   = useState('')

  const [categories,    setCategories]    = useState([])
  const [subCategories, setSubCategories] = useState([])

  const [loading,     setLoading]     = useState(false)
  const [catLoading,  setCatLoading]  = useState(true)
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [locale,      setLocale]      = useState('ar')
  const [sellerType,  setSellerType]  = useState('SHOP')

  // Phase 1 foundation: only the wording branches on sellerType for now.
  // Phase 2 (shop stock fields) and Phase 3 (dish fields) plug into the
  // SHOP-SPECIFIC FIELDS SEAM / RESTAURANT-SPECIFIC FIELDS SEAM below —
  // do not add real fields here yet.
  const isRestaurant = sellerType === 'RESTAURANT'

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    const token = localStorage.getItem('wasla_token')
    fetch('/api/seller/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setSellerType(data.profile?.sellerType ?? 'SHOP'))
      .catch(() => {})
  }, [])

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

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name       = t('seller.errorName', locale)
    if (!isRestaurant && !categoryId) errs.categoryId = t('seller.errorCategory', locale)
    if (!price || Number(price) <= 0) errs.price = t('seller.errorPrice', locale)
    if (isRestaurant && !menuSection.trim()) errs.menuSection = t('seller.errorMenuSection', locale)
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    const token = localStorage.getItem('wasla_token')
    const body  = {
      name:          name.trim(),
      brand:         brand.trim()       || undefined,
      categoryId:    isRestaurant ? undefined : parseInt(categoryId, 10),
      subCategoryId: isRestaurant || !subCategoryId ? undefined : parseInt(subCategoryId, 10),
      description:   description.trim() || undefined,
      images,
      price:         parseFloat(price),
      menuSection:   isRestaurant ? menuSection.trim() : undefined,
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
      setError(err.message || t('seller.errorGeneric', locale))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 transition bg-white'
  const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div className="max-w-3xl space-y-6" dir={dir}>
      <h1 className="text-2xl font-black text-gray-900">
        {t(isRestaurant ? 'seller.addDish' : 'seller.addProduct', locale)}
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Product/dish details */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-black text-gray-900">
            {t(isRestaurant ? 'seller.dishDetails' : 'seller.productDetails', locale)}
          </h2>
          <div>
            <label className={labelCls}>
              {t(isRestaurant ? 'seller.dishName' : 'seller.productName', locale)} <span className="text-red-400">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={t(isRestaurant ? 'seller.dishNamePlaceholder' : 'seller.productNamePlaceholder', locale)}
              className={`${inputCls} ${fieldErrors.name ? 'border-red-300 ring-red-200' : ''}`} />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className={labelCls}>{t('seller.brand', locale)}</label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Kassala" className={inputCls} />
          </div>
          {/* Restaurant sellers never choose a category — the server
              auto-files every dish into a single internal category (see
              app/api/products/route.js), so the shop category picker
              (and the 11 Sudanese shop categories in it) never renders
              for them at all. */}
          {!isRestaurant && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t('seller.category', locale)} <span className="text-red-400">*</span></label>
                {catLoading ? (
                  <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
                ) : (
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                    className={`${inputCls} ${fieldErrors.categoryId ? 'border-red-300' : ''}`}>
                    <option value="">{t('seller.selectCategory', locale)}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {fieldErrors.categoryId && <p className="text-xs text-red-500 mt-1">{fieldErrors.categoryId}</p>}
              </div>
              <div>
                <label className={labelCls}>{t('seller.subCategory', locale)}</label>
                <select value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}
                  disabled={subCategories.length === 0}
                  className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <option value="">{subCategories.length === 0 ? t('seller.noSubCategories', locale) : t('seller.selectSubCategory', locale)}</option>
                  {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>{t('seller.price', locale)} <span className="text-red-400">*</span></label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="180" min={0} step="0.01"
              className={`${inputCls} ${fieldErrors.price ? 'border-red-300 ring-red-200' : ''}`} />
            {fieldErrors.price && <p className="text-xs text-red-500 mt-1">{fieldErrors.price}</p>}
          </div>
          <div>
            <label className={labelCls}>{t('seller.description', locale)}</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t('seller.descriptionPlaceholder', locale)} rows={3} className={`${inputCls} resize-none`} />
          </div>

          {/*
            === SHOP-SPECIFIC FIELDS SEAM (Phase 2) ===
            When sellerType === 'SHOP', Phase 2 adds real stock-management
            fields here (e.g. quantity on hand, low-stock threshold).
            Today SHOP sellers get no extra fields — price above already
            covers Phase 1, and stock defaults server-side (DEFAULT_STOCK_QTY
            in app/api/products/route.js), never shown in this UI.
          */}
          {!isRestaurant && null}

          {/*
            === RESTAURANT-SPECIFIC FIELDS SEAM (Phase 3b) ===
            Menu section groups this dish on the restaurant's public page
            (see app/restaurant/[id]/page.js) — free text, owner-defined,
            so a new restaurant isn't locked into another shop's taxonomy.
            Future dish-specific fields (spice level, prep time, dietary
            tags) can plug in alongside it.
          */}
          {isRestaurant && (
            <div>
              <label className={labelCls}>
                {t('seller.menuSection', locale)} <span className="text-red-400">*</span>
              </label>
              <input type="text" value={menuSection} onChange={e => setMenuSection(e.target.value)}
                placeholder={t('seller.menuSectionPlaceholder', locale)}
                className={`${inputCls} ${fieldErrors.menuSection ? 'border-red-300 ring-red-200' : ''}`} />
              <p className="text-xs text-gray-400 mt-1">{t('seller.menuSectionHint', locale)}</p>
              {fieldErrors.menuSection && <p className="text-xs text-red-500 mt-1">{fieldErrors.menuSection}</p>}
            </div>
          )}
        </section>

        {/* Images */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <div>
            <h2 className="font-black text-gray-900">{t('seller.productImages', locale)}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('seller.imagesHint', locale)}</p>
          </div>
          <ImageUploader images={images} setImages={setImages} locale={locale} />
        </section>

        {/* Submit */}
        <div className="flex items-center gap-4 pb-6">
          <button type="submit" disabled={loading}
            className="bg-brand-700 hover:bg-brand-800 active:bg-brand-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl transition-colors">
            {loading
              ? t('seller.creating', locale)
              : t(isRestaurant ? 'seller.createDish' : 'seller.createProduct', locale)}
          </button>
          <a href="/dashboard/products" className="text-sm font-semibold text-gray-500 hover:text-gray-700">{t('seller.cancel', locale)}</a>
        </div>

      </form>
    </div>
  )
}
