import Link from 'next/link'
import Navbar from '../../components/Navbar'

export const metadata = {
  title:       'Terms of Service — Wasla',
  description: 'Wasla terms of service for buyers and Sudanese shops selling on the platform in Cairo and Giza.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EF]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: July 2026</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">1. Acceptable Use</h2>
            <p className="mb-2">
              You agree to use Wasla only for lawful purposes and in accordance with the laws of the Arab Republic of Egypt.
              You must not:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Purchase products for resale without a valid trade licence</li>
              <li>Provide false information during registration or checkout</li>
              <li>Post fraudulent reviews or misrepresent products</li>
              <li>Engage in any activity that disrupts or harms the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">2. Shop Responsibilities</h2>
            <p className="mb-2">Shops on Wasla must:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Hold any trade licence or permit required to sell food and consumer goods in Egypt</li>
              <li>Ensure all products listed comply with Egyptian food-safety and consumer-protection regulations</li>
              <li>Fulfil orders accurately and within their stated delivery window</li>
              <li>Not list counterfeit, expired, or unauthorised products</li>
              <li>Maintain accurate stock levels, pricing, and shelf-life information for perishable goods</li>
              <li>Pay the applicable platform commission on all completed orders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">3. Customer Responsibilities</h2>
            <p>
              Customers must provide accurate delivery information within a covered delivery zone and ensure someone is
              present to receive orders. Cash-on-delivery payments must be ready at the time of delivery.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">4. Refund and Returns Policy</h2>
            <p>
              Perishable goods cannot be returned once delivered unless the item arrives damaged, spoiled, or materially
              different from its description. Refund requests must be submitted within 24 hours of delivery by contacting
              the shop directly through the platform. Wasla acts as an intermediary and does not itself process refunds
              on behalf of shops.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">5. Food Safety Disclaimer</h2>
            <p>
              Wasla does not prepare, inspect, or store any food product sold on the platform. Each shop is solely
              responsible for the sourcing, handling, storage temperature, and shelf life of the products it lists,
              including compliance with Egyptian food-safety law. Customers with food allergies or sensitivities
              should contact the shop directly before ordering to confirm ingredients. Report any food-safety concern
              to us immediately so we can investigate the shop involved.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">6. Platform Commission</h2>
            <p>
              Wasla charges shops a commission on the total value of each completed (delivered) order. This fee is
              automatically calculated and recorded at the time of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>
              Wasla is a marketplace platform and is not the seller of record for any product. We are not liable for
              the quality, safety, legality, or delivery of products sold by third-party shops. Our total liability
              to you shall not exceed the amount paid by you for the relevant order.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">8. Governing Law</h2>
            <p>
              These terms are governed by the laws of the Arab Republic of Egypt. Any disputes shall be subject to the
              exclusive jurisdiction of the courts of Cairo, Egypt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">9. Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the platform after changes are posted
              constitutes acceptance of the revised terms.
            </p>
          </section>

        </div>

        <div className="mt-8 text-center">
          <Link href="/privacy" className="text-sm font-semibold text-brand-700 hover:underline">
            Read our Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
