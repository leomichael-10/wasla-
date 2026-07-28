// Cart is scoped per user: key = wasla_cart_<userId> or wasla_cart_guest
// Every exported function accepts a userId (string | number | null).
// Callers should pass the logged-in user's id, or nothing for guests.

function cartKey(userId) {
  if (!userId) return 'wasla_cart_guest'
  return `wasla_cart_${userId}`
}

export function getCart(userId) {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(cartKey(userId)) ?? '[]')
  } catch {
    return []
  }
}

function saveCart(cart, userId) {
  if (typeof window === 'undefined') return
  localStorage.setItem(cartKey(userId), JSON.stringify(cart))
  window.dispatchEvent(new Event('cartUpdated'))
}

/**
 * item shape:
 * {
 *   productVariantId, productId, productName, brand,
 *   label, priceAed,
 *   quantity, sellerId, sellerName
 * }
 */
export function addToCart(item, userId) {
  const cart = getCart(userId)
  const idx  = cart.findIndex(c => c.productVariantId === item.productVariantId)
  if (idx >= 0) {
    cart[idx].quantity = Math.min(cart[idx].quantity + (item.quantity ?? 1), 10)
  } else {
    cart.push({ ...item, quantity: item.quantity ?? 1 })
  }
  saveCart(cart, userId)
}

export function removeFromCart(productVariantId, userId) {
  saveCart(
    getCart(userId).filter(c => c.productVariantId !== productVariantId),
    userId
  )
}

export function updateQuantity(productVariantId, quantity, userId) {
  if (quantity <= 0) { removeFromCart(productVariantId, userId); return }
  saveCart(
    getCart(userId).map(c =>
      c.productVariantId === productVariantId
        ? { ...c, quantity: Math.min(quantity, 10) }
        : c
    ),
    userId
  )
}

export function clearCart(userId) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(cartKey(userId))
  window.dispatchEvent(new Event('cartUpdated'))
}

export function getCartCount(userId) {
  return getCart(userId).reduce((sum, c) => sum + c.quantity, 0)
}

export function getCartTotal(userId) {
  return getCart(userId).reduce((sum, c) => sum + c.priceAed * c.quantity, 0)
}
