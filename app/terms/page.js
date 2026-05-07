import Link from 'next/link'
import Navbar from '../../components/Navbar'

export const metadata = {
  title:       'Terms of Service — Tobaki',
  description: 'Tobaki terms of service for buyers and sellers on the UAE vape marketplace.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: January 2025</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">1. Age Restriction</h2>
            <p>
              Tobaki is strictly for adults aged 21 years and over. By accessing or using this platform you confirm that you are
              at least 21 years old and legally permitted to purchase tobacco and nicotine products in your jurisdiction.
              We reserve the right to terminate any account found to belong to a minor.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">2. Acceptable Use</h2>
            <p className="mb-2">
              You agree to use Tobaki only for lawful purposes and in accordance with UAE Federal Law No. 15 of 2009
              on tobacco control. You must not:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Purchase products for resale without a valid trade licence</li>
              <li>Provide false information during registration or checkout</li>
              <li>Attempt to circumvent our age-verification procedures</li>
              <li>Post fraudulent reviews or misrepresent products</li>
              <li>Engage in any activity that disrupts or harms the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">3. Seller Responsibilities</h2>
            <p className="mb-2">Sellers on Tobaki must:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Hold a valid UAE trade licence covering the sale of tobacco/vape products</li>
              <li>Ensure all products listed comply with UAE health authority regulations</li>
              <li>Fulfil orders accurately and in a timely manner</li>
              <li>Not list counterfeit, expired, or unauthorised products</li>
              <li>Maintain accurate stock levels and pricing</li>
              <li>Pay the applicable platform commission (10%) on all completed orders</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">4. Customer Responsibilities</h2>
            <p>
              Customers must provide accurate delivery information and ensure someone aged 21+ is present to receive
              orders. Customers are responsible for verifying that products are legal in their emirate before purchasing.
              Cash-on-delivery payments must be ready at the time of delivery.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">5. Refund and Returns Policy</h2>
            <p>
              All sales are final unless a product arrives damaged or is materially different from its description.
              Refund requests must be submitted within 24 hours of delivery by contacting the seller directly through the
              platform. Tobaki acts as an intermediary and does not itself process refunds on behalf of sellers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">6. Platform Commission</h2>
            <p>
              Tobaki charges sellers a commission of 10% on the total value of each completed (delivered) order. This
              fee is automatically calculated and recorded at the time of purchase. Subscription fees are separate and
              cover platform access, not commission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p>
              Tobaki is a marketplace platform and is not the seller of record for any product. We are not liable for
              the quality, safety, legality, or delivery of products sold by third-party sellers. Our total liability
              to you shall not exceed the amount paid by you for the relevant order.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">8. Governing Law</h2>
            <p>
              These terms are governed by the laws of the United Arab Emirates. Any disputes shall be subject to the
              exclusive jurisdiction of the courts of Dubai, UAE.
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
          <Link href="/privacy" className="text-sm font-semibold text-purple-700 hover:underline">
            Read our Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
