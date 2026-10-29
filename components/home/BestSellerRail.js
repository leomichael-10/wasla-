import { t } from '../../lib/i18n'
import BestSellerCard from './BestSellerCard'

export default function BestSellerRail({ products, locale }) {
  if (products.length === 0) return null

  return (
    <section className="pt-2 pb-4">
      <h2 className="px-4 pb-3 text-lg font-black text-brand-900">
        🔥 {t('home.bestSellersHeading', locale)}
      </h2>
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
