import Wordmark from '../Wordmark'
import LocationPicker from './LocationPicker'
import LocaleToggle from '../LocaleToggle'

export default function HomeHeader({ locale }) {
  return (
    <header className="lg:hidden flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
          className="relative flex items-center justify-center w-11 h-11 rounded-full bg-wasla-card shadow-sm shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-wasla-orange-deep">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-wasla-orange" />
        </button>
        <LocaleToggle locale={locale} />
      </div>

      <span className="font-black text-lg tracking-tight text-wasla-orange-deep font-(family-name:--font-reem-kufi)">
        <bdi><Wordmark accentClassName="text-wasla-orange" /></bdi>
      </span>

      <LocationPicker locale={locale} />
    </header>
  )
}
