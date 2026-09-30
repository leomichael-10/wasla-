import { cookies } from 'next/headers'
import Navbar from '../../components/Navbar'
import { DEFAULT_LOCALE, LOCALE_COOKIE, t } from '../../lib/i18n'

// Public, unauthenticated page — Google Play's account-deletion policy
// requires a web-reachable page describing how to delete an account,
// separate from (and reachable without) the in-app flow itself (see
// components/DeleteAccountSection.js). Server component reading the
// locale cookie the same way app/layout.js and app/page.js do, so it
// renders in the visitor's locale on first paint with no client-side
// flash.
export const metadata = {
  title:       'Delete Account — Wasla',
  description: 'How to delete your Wasla account and what happens to your data.',
}

export default async function DeleteAccountPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <div className="min-h-screen bg-[#FBF6EF]" dir={dir}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">{t('deleteAccountPage.title', locale)}</h1>
        <p className="text-sm text-gray-500 mb-10">{t('deleteAccountPage.intro', locale)}</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">{t('deleteAccountPage.stepsHeading', locale)}</h2>
            <ol className="list-decimal ps-5 space-y-1.5 text-gray-600">
              <li>{t('deleteAccountPage.step1', locale)}</li>
              <li>{t('deleteAccountPage.step2', locale)}</li>
              <li>{t('deleteAccountPage.step3', locale)}</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-black text-gray-900 mb-3">{t('deleteAccountPage.whatHeading', locale)}</h2>
            <p className="text-gray-600">{t('deleteAccountPage.whatBody', locale)}</p>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-base font-black text-gray-900 mb-2">{t('deleteAccountPage.contactHeading', locale)}</h2>
            <p className="text-gray-600">
              {t('deleteAccountPage.contactBody', locale)}{' '}
              <a href="mailto:privacy@wasla.app" className="font-semibold text-brand-700 hover:underline">privacy@wasla.app</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
