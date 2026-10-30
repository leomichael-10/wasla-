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
          🔥 {locale === 'ar' ? 'رائج' : 'Hot'}
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
