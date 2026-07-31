import Link from 'next/link'
import CategoryIcon from './CategoryIcon'
import { categoryName } from '../lib/i18n'

export default function CategoryCard({ name, icon, count, locale }) {
  return (
    <Link
      href={`/products?category=${encodeURIComponent(name)}`}
      className="flex flex-col items-center gap-3 bg-linear-to-br from-brand-50 to-brand-100 border border-brand-200 hover:border-accent-300 rounded-2xl p-5 hover:shadow-md transition-all duration-200"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FBF6EF] flex items-center justify-center overflow-hidden">
        <CategoryIcon slug={icon} name={name} locale={locale} className="w-11 h-11" />
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-800 text-sm leading-tight">{categoryName(name, locale)}</p>
        {count != null && (
          <p className="text-xs text-gray-500 mt-0.5">{count} product{count !== 1 ? 's' : ''}</p>
        )}
      </div>
    </Link>
  )
}
