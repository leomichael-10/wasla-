'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { addToCart } from '../../../lib/cart'
import { getLocaleCookie, productName, categoryName, placeName, t, interpolate, formatPrice } from '../../../lib/i18n'

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-48 mb-8" />
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-3 bg-gray-100 rounded w-20" />
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="flex gap-2 mt-4">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-full w-24" />)}
            </div>
            <div className="h-12 bg-gray-100 rounded-full mt-6 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StarSelector({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>
          &#9733;
        </button>
      ))}
    </div>
  )
}

export default function ProductDetailPage() {
  const { id } = useParams()

  const [product,         setProduct]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [cartFeedback,    setCartFeedback]    = useState(false)
  const [mainImageIdx,    setMainImageIdx]    = useState(0)

  const [user,            setUser]            = useState(null)
  const [reviews,         setReviews]         = useState([])
  const [avgRating,       setAvgRating]       = useState(0)
  const [reviewRating,    setReviewRating]    = useState(5)
  const [reviewComment,   setReviewComment]   = useState('')
  const [reviewLoading,   setReviewLoading]   = useState(false)
  const [reviewError,     setReviewError]     = useState('')
  const [reviewSuccess,   setReviewSuccess]   = useState(false)
  const [canReview,       setCanReview]       = useState(false)
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [locale,          setLocale]          = useState('ar')

  useEffect(() => { setLocale(getLocaleCookie()) }, [])

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.product) {
          const sorted = {
            ...data.product,
            variants: [...(data.product.variants ?? [])].sort((a, b) =>
              (a.label ?? '').localeCompare(b.label ?? '')
            ),
          }
          setProduct(sorted)
          setSelectedVariant(sorted.variants?.[0] ?? null)
          const r = data.product.reviews ?? []
          setReviews(r)
          setAvgRating(r.length ? r.reduce((s, rv) => s + rv.rating, 0) / r.length : 0)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('wasla_user')
      if (raw) setUser(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'customer' || !product) return
    const token = localStorage.getItem('wasla_token')
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const delivered    = (data.orders ?? []).filter(o => o.status === 'DELIVERED')
        const hasPurchased = delivered.some(o =>
          o.items?.some(item => item.productVariant?.product?.id === product.id)
        )
        setCanReview(hasPurchased)
        setAlreadyReviewed(reviews.some(r => r.customerId === user.id))
      })
      .catch(() => {})
  }, [user, product, reviews])

  function handleAddToCart() {
    if (!selectedVariant || selectedVariant.stockQty === 0) return
    addToCart({
      productVariantId: selectedVariant.id,
      productId:        product.id,
      productName:      product.name,
      productNameEn:    product.nameEn ?? '',
      brand:            product.brand ?? '',
      label:            selectedVariant.label ?? '',
      price:         Number(selectedVariant.price),
      quantity:         1,
      sellerId:         product.seller?.id ?? 0,
      sellerName:       product.seller?.businessName ?? '',
    })
    setCartFeedback(true)
    setTimeout(() => setCartFeedback(false), 2000)
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    setReviewError('')
    setReviewLoading(true)
    const token = localStorage.getItem('wasla_token')
    try {
      const res  = await fetch('/api/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sellerId:  product.seller?.id,
          productId: product.id,
          rating:    reviewRating,
          comment:   reviewComment.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const newReviews = [data.review, ...reviews]
      setReviews(newReviews)
      setAvgRating(newReviews.reduce((s, r) => s + r.rating, 0) / newReviews.length)
      setReviewSuccess(true)
      setAlreadyReviewed(true)
      setReviewComment('')
    } catch (err) {
      setReviewError(err.message || t('product.reviewSubmitError', locale))
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) return <Skeleton />

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FBF6EF]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-500 font-semibold text-lg">{t('product.notFound', locale)}</p>
          <Link href="/products" className="mt-4 inline-block text-brand-600 font-bold hover:underline text-sm">
            {t('product.backToProducts', locale)}
          </Link>
        </div>
      </div>
    )
  }

  const outOfStock = selectedVariant?.stockQty === 0
  const images     = product.images ?? []
  const displayName = productName(product, locale)

  const jsonLd = {
    '@context':    'https://schema.org',
    '@type':       'Product',
    name:          displayName,
    description:   product.description ?? undefined,
    image:         product.images?.[0] ?? undefined,
    brand:         product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: product.variants?.length ? {
      '@type':         'AggregateOffer',
      priceCurrency:   'EGP',
      lowPrice:        Math.min(...product.variants.map(v => Number(v.price))),
      highPrice:       Math.max(...product.variants.map(v => Number(v.price))),
      availability:    product.variants.some(v => v.stockQty > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    } : undefined,
  }

  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-7 flex-wrap">
          <Link href="/"         className="hover:text-brand-600 transition-colors">{t('tab.home', locale)}</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-600 transition-colors">{t('nav.products', locale)}</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/products?category=${encodeURIComponent(product.category.name)}`}
                className="hover:text-brand-600 transition-colors">{categoryName(product.category.name, locale)}</Link>
            </>
          )}
          <span>/</span>
          {/* dir="auto" isolates this from the surrounding rtl context (fixes
              punctuation jumping to the wrong side) and resolves this span's
              own direction from its content, so `truncate`'s ellipsis lands
              at the real end of the string instead of the start — both are
              the same underlying bidi issue, since displayName is often an
              English fallback (see lib/i18n.js productName()) rendered
              inside an rtl-direction page. */}
          <span dir="auto" className="text-gray-700 font-medium truncate max-w-45">{displayName}</span>
        </nav>

        {/* Main grid */}
        <div className="grid sm:grid-cols-2 gap-8 items-start">

          {/* Image gallery */}
          <div className="space-y-3">
            {images.length > 0 ? (
              <>
                <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-brand-100 shadow-sm">
                  <img src={images[mainImageIdx]} alt={displayName} className="w-full h-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((url, i) => (
                      <button key={url} onClick={() => setMainImageIdx(i)}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === mainImageIdx ? 'border-brand-500' : 'border-transparent hover:border-gray-300'}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-linear-to-br from-brand-700 to-brand-500 rounded-3xl aspect-square flex items-center justify-center shadow-sm">
                <span className="text-6xl font-black text-white/30 select-none tracking-tighter">
                  {(product.brand ?? 'V')[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-black text-brand-600 uppercase tracking-widest">{product.brand}</span>
              {/* dir="auto" — displayName/description are seller-entered text of
                  unknown language (often an untranslated English fallback, see
                  lib/i18n.js productName()); isolating it keeps trailing Latin
                  punctuation from jumping to the wrong side inside this rtl page. */}
              <h1 dir="auto" className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 leading-tight">{displayName}</h1>
              {product.category && (
                <Link href={`/products?category=${encodeURIComponent(product.category.name)}`}
                  className="inline-block mt-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-brand-100 transition-colors">
                  {categoryName(product.category.name, locale)}
                </Link>
              )}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-sm ${i < Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}>&#9733;</span>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
                    {avgRating.toFixed(1)} ({reviews.length} {t('product.reviewsLabel', locale)})
                  </span>
                </div>
              )}
            </div>

            {product.description && <p dir="auto" className="text-sm text-gray-600 leading-relaxed">{product.description}</p>}

            {/* Variant selector */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2.5">
                {t('product.option', locale)}{selectedVariant?.label && <span className="ms-2 font-normal text-brand-700">{selectedVariant.label}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(variant => {
                  const isSelected   = selectedVariant?.id === variant.id
                  const isOutOfStock = variant.stockQty === 0
                  return (
                    <button key={variant.id} onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                      disabled={isOutOfStock}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150
                        ${isSelected ? 'bg-brand-700 border-brand-700 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:text-brand-600'}
                        ${isOutOfStock ? 'opacity-35 cursor-not-allowed line-through' : 'cursor-pointer'}`}>
                      {variant.label ?? `${t('product.option', locale)} ${variant.id}`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Stock badge */}
            {selectedVariant && (
              <div className="flex flex-wrap gap-2">
                {outOfStock ? (
                  <span className="bg-red-50 text-red-500 text-xs font-semibold px-3 py-1 rounded-full">{t('browse.outOfStock', locale)}</span>
                ) : (
                  <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {interpolate(t('product.inStock', locale), { count: selectedVariant.stockQty })}
                  </span>
                )}
              </div>
            )}

            {/* Price + cart */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl font-black text-gray-900 tabular-nums">
                {selectedVariant ? formatPrice(selectedVariant.price, locale) : '—'}
              </span>
              <button onClick={handleAddToCart} disabled={!selectedVariant || outOfStock}
                className={`flex-1 py-3.5 rounded-full font-black text-sm transition-all duration-200
                  ${cartFeedback ? 'bg-green-500 text-white scale-95' : 'bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white'}
                  disabled:opacity-40 disabled:cursor-not-allowed`}>
                {cartFeedback ? t('product.addedToCart', locale) : outOfStock ? t('browse.outOfStock', locale) : t('product.addToCart', locale)}
              </button>
            </div>
          </div>
        </div>

        {/* Seller info */}
        {product.seller && (
          <div className="mt-10 bg-white rounded-3xl border border-brand-50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-gray-900 text-base">{t('product.sellerInfo', locale)}</h2>
              <Link href={`/shops/${product.seller.id}`} className="text-sm font-bold text-brand-600 hover:underline">
                {t('product.viewShop', locale)}
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('checkout.shopFallbackName', locale)}</p>
                <p dir="auto" className="font-bold text-gray-800 text-sm">{product.seller.businessName}</p>
              </div>
              {product.seller.city && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('product.locationLabel', locale)}</p>
                  <p dir="auto" className="font-bold text-gray-800 text-sm">
                    {placeName(product.seller.city, locale)}{product.seller.area ? `${locale === 'ar' ? '، ' : ', '}${placeName(product.seller.area, locale)}` : ''}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('product.deliveryLabel', locale)}</p>
                <p className={`font-bold text-sm ${product.seller.deliveryAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                  {product.seller.deliveryAvailable ? t('product.deliveryAvailable', locale) : t('product.deliveryNotAvailable', locale)}
                </p>
              </div>
              {product.seller.workingHours && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('product.hoursLabel', locale)}</p>
                  <p dir="auto" className="font-bold text-gray-800 text-sm">{product.seller.workingHours}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews section */}
        <div className="mt-6 space-y-5">

          {/* Write a review */}
          {user?.role === 'customer' && canReview && !alreadyReviewed && (
            <div className="bg-white rounded-3xl border border-brand-50 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-base mb-4">{t('product.writeReview', locale)}</h2>
              {reviewSuccess ? (
                <p className="text-green-600 font-semibold text-sm">{t('product.reviewSubmitted', locale)}</p>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{t('product.yourRating', locale)}</p>
                    <StarSelector value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('product.commentOptional', locale)}</label>
                    <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                      placeholder={t('product.commentPlaceholder', locale)} rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
                  </div>
                  {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
                  <button type="submit" disabled={reviewLoading}
                    className="bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-black px-6 py-2.5 rounded-xl text-sm transition-colors">
                    {reviewLoading ? t('product.submittingReview', locale) : t('product.submitReview', locale)}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Reviews list */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-3xl border border-brand-50 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-base mb-5">
                {t('product.customerReviews', locale)}
                <span className="ms-2 text-gray-400 font-normal">({reviews.length})</span>
                <span className="ms-2 text-sm font-semibold text-yellow-500">{avgRating.toFixed(1)} / 5</span>
              </h2>
              <div className="space-y-4">
                {reviews.map(review => {
                  const reviewerName = review.customer?.customerProfile?.fullName ?? t('product.customerFallback', locale)
                  return (
                  <div key={review.id} className="flex gap-3 border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-black text-xs shrink-0">
                      {reviewerName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span dir="auto" className="text-xs font-semibold text-gray-700">
                          {reviewerName}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>&#9733;</span>
                        ))}
                      </div>
                      {review.comment && <p dir="auto" className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
