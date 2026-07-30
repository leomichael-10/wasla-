import { WaMeProvider } from './waMeLink'

// Only one provider today. When an approved WhatsApp Business API account
// exists (Twilio/Meta — needs credentials + business approval, see
// DECISIONS.md), add a class here and switch the default — call sites
// (getNotificationProvider().notifyShop(...)) don't change.
const PROVIDERS = {
  wa_me: new WaMeProvider(),
}

export function getNotificationProvider(name = 'wa_me') {
  return PROVIDERS[name] ?? PROVIDERS.wa_me
}

export { buildOrderMessage, buildWaMeUrl } from './waMeLink'
