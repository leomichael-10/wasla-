// One shared image box for every product/shop/restaurant photo in the
// app (grid tiles, the detail-page gallery, cart lines, search
// suggestions, the restaurant rail, shop/restaurant headers). A real
// photo and the "no photo yet" state always render in the exact same
// box — same size, same corners, same background — so a missing photo
// never changes a tile's size or shape, and the fallback mark is
// always small and quiet, never louder than a real photo would be.
// Callers control the box's own size/shape via `className` (e.g.
// "aspect-square rounded-3xl"); this never invents its own sizing.
export default function MediaThumb({ src, alt = '', className = '', imgClassName = '' }) {
  return (
    <div className={`bg-[#FBF6EF] flex items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt={alt} className={`w-full h-full object-cover ${imgClassName}`} />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
          className="w-2/5 h-2/5 max-w-12 max-h-12 text-brand-200"
        >
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-5.5-5.5a1 1 0 0 0-1.4 0L6 19" />
        </svg>
      )}
    </div>
  )
}
