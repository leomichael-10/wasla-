import Wordmark from '../Wordmark'
import LocationPicker from './LocationPicker'
import LocaleToggle from '../LocaleToggle'

// No notification bell here on purpose: there is no notifications route,
// no user-facing notification system anywhere in the app (lib/notifications/
// is seller-side WhatsApp order alerts, unrelated), and the bell that used
// to render here had no onClick and a permanently-on unread dot — a dead
// button with a fake badge, worse than no button. The slot it used to share
// with LocaleToggle is now the toggle's alone.
export default function HomeHeader({ locale }) {
  return (
    <header className="lg:hidden flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <LocaleToggle locale={locale} />

      <span className="font-black text-lg tracking-tight text-wasla-orange-deep font-(family-name:--font-reem-kufi)">
        <bdi><Wordmark accentClassName="text-wasla-orange" /></bdi>
      </span>

      <LocationPicker locale={locale} />
    </header>
  )
}
