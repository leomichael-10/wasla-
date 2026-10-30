import { t } from '../../lib/i18n'

function PlaceholderTile({ icon, title, subtitle }) {
  return (
    <a href="#" className="flex flex-col gap-2 rounded-2xl bg-wasla-card border border-brand-100 p-4">
      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-sand-50 text-wasla-orange-deep shrink-0">
        {icon}
      </span>
      <div>
        <p className="font-bold text-sm text-brand-900 leading-snug"><bdi>{title}</bdi></p>
        <p className="text-xs text-brand-500 leading-snug mt-0.5">{subtitle}</p>
      </div>
    </a>
  )
}

const chatIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75h7.5m-7.5 3h4.5m6-7.5H5.25A2.25 2.25 0 0 0 3 7.5v7.5a2.25 2.25 0 0 0 2.25 2.25h3v3l4.179-3h5.071A2.25 2.25 0 0 0 21 15V7.5a2.25 2.25 0 0 0-2.25-2.25Z" />
  </svg>
)

const reorderIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

export default function PlaceholderTiles({ locale }) {
  return (
    <div className="px-4 pb-4 grid grid-cols-2 gap-3">
      <PlaceholderTile
        icon={chatIcon}
        title={t('home.reviewsTileTitle', locale)}
        subtitle={t('home.reviewsTileSubtitle', locale)}
      />
      <PlaceholderTile
        icon={reorderIcon}
        title={t('home.reorderTileTitle', locale)}
        subtitle={t('home.reorderTileSubtitle', locale)}
      />
    </div>
  )
}
