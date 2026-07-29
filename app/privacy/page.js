import Link from 'next/link'
import Navbar from '../../components/Navbar'

export const metadata = {
  title:       'Privacy Policy — Wasla',
  description: 'How Wasla collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f7ff]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: January 2025</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-2">When you use Wasla we may collect:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Account information: email address, password (hashed), and role</li>
              <li>Profile information: full name, phone number, WhatsApp number, city, gender</li>
              <li>Delivery information: delivery address provided at checkout</li>
              <li>Transaction data: orders placed, products purchased, payment method</li>
              <li>Usage data: pages visited, search queries, cart activity</li>
              <li>For sellers: business name, trade licence details, working hours, subscription records</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">2. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>To create and manage your account</li>
              <li>To process orders and coordinate delivery between buyers and sellers</li>
              <li>To send order confirmations and status updates</li>
              <li>To communicate platform updates and policy changes</li>
              <li>To detect fraud and enforce our Terms of Service</li>
              <li>To generate anonymised analytics that improve the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">3. WhatsApp Communications</h2>
            <p>
              By providing a WhatsApp number on your profile, you consent to receiving order-related notifications via
              WhatsApp. These messages are transactional (order confirmation, status updates) and are not used for
              unsolicited marketing. You can withdraw consent at any time by removing your WhatsApp number from your
              profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">4. Sharing of Data</h2>
            <p className="mb-2">We do not sell your personal data. We share data only as necessary:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>With sellers: your delivery address and order details are shared with the seller fulfilling your order</li>
              <li>With service providers: Twilio (WhatsApp), email SMTP providers, Cloudinary (image hosting)</li>
              <li>With authorities: if required by Egyptian law or court order</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Order records are retained for a
              minimum of 5 years to comply with Egyptian commercial regulations. You may request deletion of your account
              by contacting us; however, order records required for legal compliance will be retained regardless.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">6. Security</h2>
            <p>
              Passwords are stored as bcrypt hashes and are never stored in plain text. All API communications use
              HTTPS. We use JWT tokens for session management, which expire after 7 days. We take reasonable technical
              and organisational measures to protect your data against unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-2">Under Egyptian data protection principles, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate information via your profile settings</li>
              <li>Request deletion of your account and associated data</li>
              <li>Withdraw consent for WhatsApp notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">8. Contact</h2>
            <p>
              For any privacy-related queries, please contact us at{' '}
              <span className="font-semibold text-purple-700">privacy@wasla.app</span>.
              We will respond within 10 business days.
            </p>
          </section>

        </div>

        <div className="mt-8 text-center">
          <Link href="/terms" className="text-sm font-semibold text-purple-700 hover:underline">
            Read our Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}
