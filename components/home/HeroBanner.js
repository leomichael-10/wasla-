import Link from 'next/link'
import { t } from '../../lib/i18n'
import WaslaMark from '../WaslaMark'

export default function HeroBanner({ locale }) {
  return (
    <div className="px-4 pb-3">
      <Link
        href="/products"
        className="relative block rounded-[28px] p-5 pt-6 bg-linear-to-br from-wasla-orange to-wasla-orange-deep text-white overflow-hidden"
      >
        {/* Signature mark as a quiet watermark, not a literal illustration —
            the hand-drawn identity without competing with the headline. */}
        <WaslaMark
          strokeWidth={4}
          className="absolute -top-4 -end-6 w-32 h-32 text-white/15 pointer-events-none"
        />

        <span className="relative inline-flex items-center gap-1.5 bg-white text-wasla-orange-deep text-xs font-bold px-3 py-1 rounded-full">
          {t('home.heroChip', locale)}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 rtl:-scale-x-100">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </span>

        <h2 className="relative mt-3 max-w-[15rem] text-2xl font-black leading-tight tracking-tight">
          {t('home.heroHeadline', locale)}
        </h2>

        <span className="relative mt-5 inline-flex items-center gap-2 bg-white text-wasla-orange-deep text-sm font-bold px-4 py-2 rounded-full">
          {t('home.heroCta', locale)}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 rtl:-scale-x-100">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5m0 0-3-3m3 3-3 3M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0Z" />
          </svg>
        </span>
      </Link>

      {/* Nile blue — reserved for delivery/trust signals, unused until now. */}
      <div className="mt-3 flex items-center gap-1.5 text-nile-500 text-xs font-bold">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25h-6a1.5 1.5 0 0 0-1.5 1.5v6" />
        </svg>
        <bdi>{t('home.sameDay', locale)}</bdi>
      </div>
    </div>
  )
}
