import { t } from '../../lib/i18n'
import BestSellerCard from './BestSellerCard'

export default function BestSellerRail({ products, locale }) {
  if (products.length === 0) return null

  return (
    <section className="pt-2 pb-4">
      <div className="px-4 pb-3 flex items-center gap-2">
        <h2 className="text-lg font-black text-brand-900">
          {t('home.bestSellersHeading', locale)}
        </h2>
        {/* Karkade red — reserved for alerts/sale badges, unused until now. */}
        <span className="inline-flex items-center gap-1 bg-hibiscus-50 text-hibiscus-500 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
          {locale === 'ar' ? 'رائج' : 'Hot'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-1">
        {products.map(product => (
          <div key={product.id} className="snap-start w-40 shrink-0">
            <BestSellerCard product={product} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  )
}
