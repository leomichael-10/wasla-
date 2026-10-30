import WaslaLogo from './WaslaLogo'

// Centered loading state for in-app data/page fetches (not the OS/PWA
// splash screen, which iOS only ever renders as a static image anyway).
// Shares WaslaLogo with SplashScreen; here it loops to signal ongoing
// work instead of drawing once. Reduced motion is handled inside
// WaslaLogo itself (no animation classes at all, not just a fast one).
export default function Loader({ className = '' }) {
  return (
    <div className={`flex items-center justify-center bg-sand-50 ${className}`}>
      <WaslaLogo variant="loader" />
    </div>
  )
}
