import { t } from '../../lib/i18n'

export default function HomeSearchBar({ locale }) {
  return (
    <form action="/products" method="get" className="px-4 pb-3">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          className="absolute inset-s-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wasla-orange-deep pointer-events-none">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          name="search"
          placeholder={t('home.searchPlaceholder', locale)}
          className="w-full bg-wasla-cream rounded-full ps-10 pe-4 py-3 text-sm text-brand-900 placeholder:text-brand-400 shadow-sm border border-wasla-orange/10 focus:outline-none focus:ring-2 focus:ring-wasla-orange"
        />
      </div>
    </form>
  )
}
