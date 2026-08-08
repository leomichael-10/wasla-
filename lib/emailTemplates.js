import { t } from './i18n'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.app'

// Shared layout for every transactional email — cream background,
// terracotta accent, logo referenced by absolute URL (never inlined as
// base64) so future emails (order confirmation, welcome, etc.) stay
// visually consistent without copy-pasting a header/footer per template.
const BASE = `
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #F3EDE2; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .header { background: #F3EDE2; padding: 24px 32px; text-align: center; }
    .header img { width: 56px; height: 56px; display: inline-block; vertical-align: middle; }
    .header h1 { display: inline-block; vertical-align: middle; margin: 0 0 0 12px; color: #6F4E37; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header h1 span { color: #C1502E; }
    .body { padding: 28px 32px; color: #374151; font-size: 15px; line-height: 1.7; }
    .body h2 { font-size: 18px; color: #2B1B12; margin-top: 0; }
    .badge { display: inline-block; background: #F5EDE6; color: #6F4E37; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 999px; }
    table.items { width: 100%; border-collapse: collapse; margin: 16px 0; }
    table.items th { text-align: right; font-size: 12px; color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    table.items td { padding: 10px 0; border-bottom: 1px solid #f9fafb; font-size: 14px; color: #374151; }
    .total { font-size: 18px; font-weight: 900; color: #2B1B12; }
    .btn { display: inline-block; background: #C1502E; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 20px; font-size: 14px; }
    .divider { border: none; border-top: 1px solid #f3f4f6; margin: 24px 0; }
    .footer { padding: 16px 32px; background: #F3EDE2; font-size: 12px; color: #8a7a6d; text-align: center; }
  </style>
`

function shell(content, dir = 'ltr') {
  return `<!DOCTYPE html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8">${BASE}</head><body>
  <div class="wrap">
    <div class="header">
      <img src="${APP_URL}/icon-192.png" alt="Wasla" />
      <h1>was<span>la</span></h1>
    </div>
    ${content}
    <div class="footer">Wasla &mdash; Sudanese Products, Delivered in Cairo &bull; <a href="${APP_URL}/terms" style="color:#8a7a6d;">Terms</a> &bull; <a href="${APP_URL}/privacy" style="color:#8a7a6d;">Privacy</a></div>
  </div>
  </body></html>`
}

function itemsTable(items) {
  return `
    <table class="items">
      <thead><tr>
        <th>Product</th><th>Variant</th><th>Qty</th><th>Price</th>
      </tr></thead>
      <tbody>
        ${items.map(it => {
          const variant = it.productVariant
          const product = variant?.product
          return `<tr>
            <td>${product?.name ?? 'Product'}</td>
            <td>${variant?.label ?? '—'}</td>
            <td>${it.quantity}</td>
            <td>EGP ${Number(it.priceAtPurchase).toFixed(2)}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  `
}

function itemsTableAr(items) {
  return `
    <table class="items">
      <thead><tr>
        <th>المنتج</th><th>الخيار</th><th>الكمية</th><th>السعر</th>
      </tr></thead>
      <tbody>
        ${items.map(it => {
          const variant = it.productVariant
          const product = variant?.product
          return `<tr>
            <td>${product?.name ?? 'منتج'}</td>
            <td>${variant?.label ?? '—'}</td>
            <td>${it.quantity}</td>
            <td>${Number(it.priceAtPurchase).toFixed(2)} جنيه</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  `
}

function formatEta(promisedEta) {
  if (!promisedEta) return null
  try {
    return new Date(promisedEta).toLocaleString('ar-EG', {
      weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    })
  } catch { return null }
}

// Arabic-first customer order confirmation — the one email every customer
// gets, so it's the one worth translating fully rather than leaving English.
export function orderConfirmation(order, items) {
  const eta = formatEta(order.promisedEta)
  const shopName = order.seller?.businessName ?? 'المتجر'
  return shell(`
    <div class="body">
      <h2>تم استلام طلبك!</h2>
      <p>شكرًا لطلبك من وصلة. طلبك من <strong>${shopName}</strong>، وده ملخصه:</p>
      <p><span class="badge">طلب رقم ${order.id}</span></p>
      ${itemsTableAr(items)}
      <p>عنوان التوصيل: <strong>${order.deliveryAddress}</strong></p>
      ${eta ? `<p>موعد التوصيل المتوقع: <strong>${eta}</strong></p>` : ''}
      <p class="total">الإجمالي: ${Number(order.total).toFixed(2)} جنيه مصري</p>
      <p>المتجر هيأكد طلبك قريب. هتوصلك رسالة تانية أول ما يتم قبول الطلب.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.app'}/orders" class="btn">تتبع طلبي</a>
    </div>
  `, 'rtl')
}

export function orderAccepted(order) {
  return shell(`
    <div class="body">
      <h2>Your order has been accepted!</h2>
      <p>Great news! Your Wasla order <span class="badge">#${order.id}</span> has been accepted and is being prepared.</p>
      <p>Estimated delivery: <strong>2–4 hours</strong></p>
      <p>Delivery address: <strong>${order.deliveryAddress}</strong></p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.ae'}/orders" class="btn">View Order</a>
    </div>
  `)
}

export function orderDelivered(order) {
  return shell(`
    <div class="body">
      <h2>Order delivered!</h2>
      <p>Your Wasla order <span class="badge">#${order.id}</span> has been delivered. We hope you enjoy your products!</p>
      <p>Thank you for shopping with Wasla.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.ae'}/products" class="btn">Shop Again</a>
    </div>
  `)
}

export function newOrderAlert(order, items) {
  return shell(`
    <div class="body">
      <h2>New order received!</h2>
      <p>You have a new order on Wasla:</p>
      <p><span class="badge">Order #${order.id}</span></p>
      ${itemsTable(items)}
      <p>Delivery address: <strong>${order.deliveryAddress}</strong></p>
      <p class="total">Total: EGP ${Number(order.total).toFixed(2)}</p>
      <p>Please log in to your dashboard to accept or cancel the order.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.ae'}/dashboard/orders" class="btn">Go to Dashboard</a>
    </div>
  `)
}

export function subscriptionConfirmation(sellerName, plan) {
  return shell(`
    <div class="body">
      <h2>Subscription received!</h2>
      <p>Hi <strong>${sellerName}</strong>, we&rsquo;ve received your subscription request for Wasla.</p>
      <p><strong>Plan:</strong> EGP ${plan} / month</p>
      <p>Our team will verify your payment within <strong>24 hours</strong> and activate your account. You&rsquo;ll receive a confirmation email once activated.</p>
    </div>
  `)
}

export function subscriptionActivated(sellerName) {
  return shell(`
    <div class="body">
      <h2>Your subscription is now active!</h2>
      <p>Hi <strong>${sellerName}</strong>, your Wasla seller subscription has been activated. Your shop is now live on the platform.</p>
      <p>Start adding products and reach thousands of customers across Cairo and Giza.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.ae'}/dashboard" class="btn">Go to Dashboard</a>
    </div>
  `)
}

// ─── Welcome emails ──────────────────────────────────────────────────────────
// Sent once, at account creation (see lib/sendWelcomeEmail.js) — never on
// login or profile update. Arabic-first (Wasla's default locale) with an
// English block underneath rather than two separate emails, since the app
// doesn't persist a per-user language preference to pick just one. Copy
// lives in lib/i18n.js's 'email.*' keys, same single-source-of-truth
// pattern every other piece of app copy already goes through — these
// template functions only handle layout/composition, not the strings
// themselves.

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

// Plain-text fallback — required alongside the HTML body: some mail
// clients block HTML outright, and HTML-only mail scores worse for spam.
function plainText(lines) {
  return lines.filter(Boolean).join('\n\n')
}

export function welcomeCustomerEmail() {
  const subject = t('email.welcome.subject', 'ar')
  const html = shell(`
    <div class="body">
      <h2>${t('email.welcome.heading', 'ar')}</h2>
      <p>${t('email.welcome.body1', 'ar')}</p>
      <p>${t('email.welcome.body2', 'ar')}</p>
      <a href="${APP_URL}" class="btn">${t('email.welcome.cta', 'ar')}</a>
      <hr class="divider" />
      <div dir="ltr" style="text-align:left">
        <h2>${t('email.welcome.heading', 'en')}</h2>
        <p>${t('email.welcome.body1', 'en')}</p>
        <p>${t('email.welcome.body2', 'en')}</p>
        <a href="${APP_URL}" class="btn">${t('email.welcome.cta', 'en')}</a>
      </div>
    </div>
  `, 'rtl')
  const text = plainText([
    t('email.welcome.heading', 'ar'),
    t('email.welcome.body1', 'ar'),
    t('email.welcome.body2', 'ar'),
    `${t('email.welcome.cta', 'ar')}: ${APP_URL}`,
    '---',
    t('email.welcome.heading', 'en'),
    t('email.welcome.body1', 'en'),
    t('email.welcome.body2', 'en'),
    `${t('email.welcome.cta', 'en')}: ${APP_URL}`,
  ])
  return { subject, html, text }
}

// Seller signup — confirms the registration was received and is pending
// admin approval. Deliberately does NOT say "start shopping"/"you're
// live" — sellers aren't visible to customers until an admin approves
// them (SellerProfile.approvedByAdmin, see app/api/admin/sellers/[id]/approve).
export function welcomeSellerEmail({ businessName }) {
  const subject = t('email.sellerWelcome.subject', 'ar')
  const dashboardUrl = `${APP_URL}/dashboard/settings`
  const html = shell(`
    <div class="body">
      <h2>${t('email.sellerWelcome.heading', 'ar')}</h2>
      <p>${interpolate(t('email.sellerWelcome.body1', 'ar'), { businessName })}</p>
      <p><span class="badge">قيد المراجعة</span></p>
      <p>${t('email.sellerWelcome.pending', 'ar')}</p>
      <p>${t('email.sellerWelcome.body2', 'ar')}</p>
      <a href="${dashboardUrl}" class="btn">${t('email.sellerWelcome.cta', 'ar')}</a>
      <hr class="divider" />
      <div dir="ltr" style="text-align:left">
        <h2>${t('email.sellerWelcome.heading', 'en')}</h2>
        <p>${interpolate(t('email.sellerWelcome.body1', 'en'), { businessName })}</p>
        <p><span class="badge">Pending review</span></p>
        <p>${t('email.sellerWelcome.pending', 'en')}</p>
        <p>${t('email.sellerWelcome.body2', 'en')}</p>
        <a href="${dashboardUrl}" class="btn">${t('email.sellerWelcome.cta', 'en')}</a>
      </div>
    </div>
  `, 'rtl')
  const text = plainText([
    t('email.sellerWelcome.heading', 'ar'),
    interpolate(t('email.sellerWelcome.body1', 'ar'), { businessName }).replace(/<\/?strong>/g, ''),
    t('email.sellerWelcome.pending', 'ar'),
    t('email.sellerWelcome.body2', 'ar'),
    `${t('email.sellerWelcome.cta', 'ar')}: ${dashboardUrl}`,
    '---',
    t('email.sellerWelcome.heading', 'en'),
    interpolate(t('email.sellerWelcome.body1', 'en'), { businessName }).replace(/<\/?strong>/g, ''),
    t('email.sellerWelcome.pending', 'en'),
    t('email.sellerWelcome.body2', 'en'),
    `${t('email.sellerWelcome.cta', 'en')}: ${dashboardUrl}`,
  ])
  return { subject, html, text }
}
