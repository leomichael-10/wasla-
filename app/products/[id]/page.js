'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { addToCart } from '../../../lib/cart'

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#f9f7ff]">
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

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.product) {
          const sorted = {
            ...data.product,
            variants: [...(data.product.variants ?? [])].sort((a, b) =>
              (a.flavor ?? '').localeCompare(b.flavor ?? '')
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
      const raw = localStorage.getItem('tobaki_user')
      if (raw) setUser(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'customer' || !product) return
    const token = localStorage.getItem('tobaki_token')
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const delivered    = (data.orders ?? []).filter(o => o.status === 'delivered')
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
      brand:            product.brand ?? '',
      flavor:           selectedVariant.flavor ?? '',
      nicotineLevel:    selectedVariant.nicotineLevel ?? '',
      puffCount:        selectedVariant.puffCount ?? 0,
      priceAed:         Number(selectedVariant.priceAed),
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
    const token = localStorage.getItem('tobaki_token')
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
      setReviewError(err.message || 'Failed to submit review.')
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) return <Skeleton />

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-500 font-semibold text-lg">Product not found</p>
          <Link href="/products" className="mt-4 inline-block text-purple-600 font-bold hover:underline text-sm">
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  const outOfStock = selectedVariant?.stockQty === 0
  const images     = product.images ?? []

  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-7 flex-wrap">
          <Link href="/"         className="hover:text-purple-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-purple-600 transition-colors">Products</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/products?category=${encodeURIComponent(product.category.name)}`}
                className="hover:text-purple-600 transition-colors">{product.category.name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-700 font-medium truncate max-w-45">{product.name}</span>
        </nav>

        {/* Main grid */}
        <div className="grid sm:grid-cols-2 gap-8 items-start">

          {/* Image gallery */}
          <div className="space-y-3">
            {images.length > 0 ? (
              <>
                <div className="aspect-square rounded-3xl overflow-hidden bg-white border border-purple-100 shadow-sm">
                  <img src={images[mainImageIdx]} alt={product.name} className="w-full h-full object-cover" />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((url, i) => (
                      <button key={url} onClick={() => setMainImageIdx(i)}
                        className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === mainImageIdx ? 'border-purple-500' : 'border-transparent hover:border-gray-300'}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-linear-to-br from-purple-700 to-violet-500 rounded-3xl aspect-square flex items-center justify-center shadow-sm">
                <span className="text-6xl font-black text-white/30 select-none tracking-tighter">
                  {(product.brand ?? 'V')[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-black text-purple-600 uppercase tracking-widest">{product.brand}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 leading-tight">{product.name}</h1>
              {product.category && (
                <Link href={`/products?category=${encodeURIComponent(product.category.name)}`}
                  className="inline-block mt-2 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-purple-100 transition-colors">
                  {product.category.name}
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
                    {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>

            {product.description && <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>}

            {/* Flavor selector */}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-2.5">
                Flavor{selectedVariant?.flavor && <span className="ml-2 font-normal text-teal-600">{selectedVariant.flavor}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(variant => {
                  const isSelected   = selectedVariant?.id === variant.id
                  const isOutOfStock = variant.stockQty === 0
                  return (
                    <button key={variant.id} onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                      disabled={isOutOfStock}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150
                        ${isSelected ? 'bg-purple-700 border-purple-700 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-purple-400 hover:text-purple-600'}
                        ${isOutOfStock ? 'opacity-35 cursor-not-allowed line-through' : 'cursor-pointer'}`}>
                      {variant.flavor ?? `Option ${variant.id}`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Spec badges */}
            {selectedVariant && (
              <div className="flex flex-wrap gap-2">
                {selectedVariant.puffCount && (
                  <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {selectedVariant.puffCount.toLocaleString()} puffs
                  </span>
                )}
                {selectedVariant.nicotineLevel && (
                  <span className="bg-yellow-50 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {selectedVariant.nicotineLevel} nic
                  </span>
                )}
                {selectedVariant.sizeMl && (
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {selectedVariant.sizeMl} ml
                  </span>
                )}
                {outOfStock ? (
                  <span className="bg-red-50 text-red-500 text-xs font-semibold px-3 py-1 rounded-full">Out of stock</span>
                ) : (
                  <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    In stock · {selectedVariant.stockQty} left
                  </span>
                )}
              </div>
            )}

            {/* Price + cart */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-3xl font-black text-gray-900 tabular-nums">
                {selectedVariant ? `AED ${Number(selectedVariant.priceAed)}` : '—'}
              </span>
              <button onClick={handleAddToCart} disabled={!selectedVariant || outOfStock}
                className={`flex-1 py-3.5 rounded-full font-black text-sm transition-all duration-200
                  ${cartFeedback ? 'bg-green-500 text-white scale-95' : 'bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white'}
                  disabled:opacity-40 disabled:cursor-not-allowed`}>
                {cartFeedback ? 'Added to cart!' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>

        {/* Seller info */}
        {product.seller && (
          <div className="mt-10 bg-white rounded-3xl border border-purple-50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-gray-900 text-base">Seller Information</h2>
              <Link href={`/shops/${product.seller.id}`} className="text-sm font-bold text-purple-600 hover:underline">
                View Shop
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Shop</p>
                <p className="font-bold text-gray-800 text-sm">{product.seller.businessName}</p>
              </div>
              {product.seller.city && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Location</p>
                  <p className="font-bold text-gray-800 text-sm">
                    {product.seller.city}{product.seller.area ? `, ${product.seller.area}` : ''}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Delivery</p>
                <p className={`font-bold text-sm ${product.seller.deliveryAvailable ? 'text-green-600' : 'text-gray-400'}`}>
                  {product.seller.deliveryAvailable ? 'Available' : 'Not available'}
                </p>
              </div>
              {product.seller.workingHours && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Hours</p>
                  <p className="font-bold text-gray-800 text-sm">{product.seller.workingHours}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews section */}
        <div className="mt-6 space-y-5">

          {/* Write a review */}
          {user?.role === 'customer' && canReview && !alreadyReviewed && (
            <div className="bg-white rounded-3xl border border-purple-50 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-base mb-4">Write a Review</h2>
              {reviewSuccess ? (
                <p className="text-green-600 font-semibold text-sm">Thank you! Your review has been submitted.</p>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Your Rating</p>
                    <StarSelector value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Comment (optional)</label>
                    <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                      placeholder="Tell others about your experience…" rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                  </div>
                  {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
                  <button type="submit" disabled={reviewLoading}
                    className="bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white font-black px-6 py-2.5 rounded-xl text-sm transition-colors">
                    {reviewLoading ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Reviews list */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-3xl border border-purple-50 shadow-sm p-6">
              <h2 className="font-black text-gray-900 text-base mb-5">
                Customer Reviews
                <span className="ml-2 text-gray-400 font-normal">({reviews.length})</span>
                <span className="ml-2 text-sm font-semibold text-yellow-500">{avgRating.toFixed(1)} / 5</span>
              </h2>
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="flex gap-3 border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
                      {(review.customer?.customerProfile?.fullName ?? 'C')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-700">
                          {review.customer?.customerProfile?.fullName ?? 'Customer'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>&#9733;</span>
                        ))}
                      </div>
                      {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
