import Wordmark from '../Wordmark'
import { placeName } from '../../lib/i18n'

export default function HomeHeader({ locale }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
      <button
        type="button"
        aria-label="notifications"
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-wasla-card shadow-sm shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-5 h-5 text-wasla-orange-deep">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-wasla-orange" />
      </button>

      <span className="font-black text-lg tracking-tight text-wasla-orange-deep font-(family-name:--font-reem-kufi)">
        <bdi><Wordmark accentClassName="text-wasla-orange" /></bdi>
      </span>

      <button
        type="button"
        className="flex items-center gap-1 px-3 py-2 rounded-full bg-wasla-card shadow-sm shrink-0 text-xs font-bold text-wasla-orange-deep"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <bdi>{placeName('Cairo', locale)}</bdi>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 rtl:-scale-x-100">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </header>
  )
}
