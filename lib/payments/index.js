import { CodProvider } from './cod'
import { PaymobProvider } from './paymob'
import { ManualTransferProvider } from './manualTransfer'

const PROVIDERS = {
  cod:             new CodProvider(),
  paymob:          new PaymobProvider(),
  manual_transfer: new ManualTransferProvider(),
}

export function getPaymentProvider(method) {
  return PROVIDERS[method] ?? PROVIDERS.cod
}

export const PAYMENT_METHODS = Object.keys(PROVIDERS)
