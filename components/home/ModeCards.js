import Link from 'next/link'
import { t } from '../../lib/i18n'

function ModeCard({ href, icon, title, subtitle }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-3xl bg-wasla-orange text-white p-4"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-wasla-orange-deep shrink-0">
          {icon}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 rtl:-scale-x-100">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
      <div>
        <p className="font-black text-sm leading-snug"><bdi>{title}</bdi></p>
        <p className="text-xs text-white/85 leading-snug mt-0.5">{subtitle}</p>
      </div>
    </Link>
  )
}

const forkKnifeIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 3v6.75a2.25 2.25 0 0 0 4.5 0V3M7.5 9.75V21M9.75 3v18M15.75 3v7.5a2.25 2.25 0 0 0 4.5 0V3m-2.25 7.5V21" />
  </svg>
)

const storefrontIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-16.14 0V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72L4.318 3.44A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.873 1.873a3.004 3.004 0 0 1-.621 4.72" />
  </svg>
)

export default function ModeCards({ locale }) {
  return (
    <div className="px-4 pb-4 grid grid-cols-2 gap-3">
      <ModeCard
        href="/restaurants"
        icon={forkKnifeIcon}
        title={t('home.modeRestaurantTitle', locale)}
        subtitle={t('home.modeRestaurantSubtitle', locale)}
      />
      <ModeCard
        href="/shops"
        icon={storefrontIcon}
        title={t('home.modeShopTitle', locale)}
        subtitle={t('home.modeShopSubtitle', locale)}
      />
    </div>
  )
}
