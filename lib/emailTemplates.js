const BASE = `
  <style>
    body { font-family: sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .header { background: #2dd4bf; padding: 24px 32px; }
    .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .header h1 span { color: #fde047; }
    .body { padding: 28px 32px; color: #374151; font-size: 15px; line-height: 1.6; }
    .body h2 { font-size: 18px; color: #111827; margin-top: 0; }
    .badge { display: inline-block; background: #f0fdfa; color: #0f766e; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 999px; }
    table.items { width: 100%; border-collapse: collapse; margin: 16px 0; }
    table.items th { text-align: left; font-size: 12px; color: #9ca3af; text-transform: uppercase; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    table.items td { padding: 10px 0; border-bottom: 1px solid #f9fafb; font-size: 14px; color: #374151; }
    .total { font-size: 18px; font-weight: 900; color: #111827; }
    .btn { display: inline-block; background: #2dd4bf; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 20px; font-size: 14px; }
    .footer { padding: 16px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; }
  </style>
`

function shell(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${BASE}</head><body>
  <div class="wrap">
    <div class="header"><h1>toba<span>ki</span></h1></div>
    ${content}
    <div class="footer">Wasla &mdash; Sudanese Products, Delivered in Cairo &bull; <a href="https://wasla.app/terms" style="color:#9ca3af;">Terms</a> &bull; <a href="https://wasla.app/privacy" style="color:#9ca3af;">Privacy</a></div>
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

export function orderConfirmation(order, items) {
  return shell(`
    <div class="body">
      <h2>Your order has been placed!</h2>
      <p>Thank you for your order on Wasla. Here&rsquo;s your summary:</p>
      <p><span class="badge">Order #${order.id}</span></p>
      ${itemsTable(items)}
      <p>Delivery address: <strong>${order.deliveryAddress}</strong></p>
      <p class="total">Total: EGP ${Number(order.total).toFixed(2)}</p>
      <p>Your seller will confirm the order shortly. You&rsquo;ll receive a notification when it&rsquo;s accepted.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://wasla.ae'}/orders" class="btn">Track My Order</a>
    </div>
  `)
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
