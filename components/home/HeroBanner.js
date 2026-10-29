import Link from 'next/link'
import { t } from '../../lib/i18n'

export default function HeroBanner({ locale }) {
  return (
    <div className="px-4 pb-4">
      <Link
        href="/products"
        className="block rounded-[24px] p-5 bg-linear-to-br from-wasla-orange to-wasla-orange-deep text-white overflow-hidden"
      >
        <span className="inline-flex items-center gap-1.5 bg-white text-wasla-orange-deep text-xs font-bold px-3 py-1 rounded-full">
          {t('home.heroChip', locale)}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 rtl:-scale-x-100">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </span>

        <h2 className="mt-3 max-w-[14rem] text-xl font-black leading-snug">
          {t('home.heroHeadline', locale)}
        </h2>

        <span className="mt-4 inline-flex items-center gap-2 bg-white text-wasla-orange-deep text-sm font-bold px-4 py-2 rounded-full">
          {t('home.heroCta', locale)}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 rtl:-scale-x-100">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5m0 0-3-3m3 3-3 3M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0Z" />
          </svg>
        </span>
      </Link>
    </div>
  )
}
