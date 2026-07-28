import { PaymentProvider } from './PaymentProvider'

/** Cash on Delivery — the default and only provider that works fully end to end at launch. */
export class CodProvider extends PaymentProvider {
  get name() { return 'cod' }

  async initiate() {
    // Nothing to collect up front — the shop collects cash at the door and
    // marks the order paid manually, same as today's flow.
    return { paymentStatus: 'unpaid', redirectUrl: null, providerRef: null }
  }

  async verify() {
    return { paymentStatus: 'unpaid' }
  }
}
