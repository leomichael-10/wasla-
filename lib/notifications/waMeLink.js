import { NotificationProvider } from './NotificationProvider'
import { toWaId } from '../phone'

/** Pure, isomorphic (server + client) — builds the Arabic order-alert message for a shop. */
export function buildOrderMessage(order, shop) {
  const itemLines = (order.items ?? [])
    .map(it => {
      const name  = it.productVariant?.product?.name ?? 'منتج'
      const label = it.productVariant?.label ? ` (${it.productVariant.label})` : ''
      return `- ${name}${label} × ${it.quantity}`
    })
    .join('\n')

  const lines = [
    `طلب جديد على وصلة — لازم يتنفذ`,
    `رقم الطلب: #${order.id}`,
    itemLines || null,
    `الإجمالي: ${Number(order.total).toFixed(2)} جنيه`,
    order.deliveryAddress ? `منطقة العميل: ${order.deliveryAddress}` : null,
    `المتجر: ${shop?.businessName ?? ''}`,
    `من فضلك أكّد الطلب من لوحة تحكم وصلة في أقرب وقت.`,
  ].filter(Boolean)

  return lines.join('\n')
}

/** Pure — the wa.me deep link itself. Returns null if the shop has no (valid) number on file. */
export function buildWaMeUrl(order, shop) {
  const phone = toWaId(shop?.whatsappNumber)
  if (!phone) return null
  const message = buildOrderMessage(order, shop)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

/**
 * wa.me has no server-side send API — a human has to open the link and
 * tap send. This provider surfaces the link for the UI rather than
 * pretending to have sent anything.
 */
export class WaMeProvider extends NotificationProvider {
  get name() { return 'wa_me' }

  async notifyShop({ order, shop }) {
    const url = buildWaMeUrl(order, shop)
    if (!url) return { sent: false, reason: 'Shop has no WhatsApp number on file' }
    return { sent: false, url }
  }
}
