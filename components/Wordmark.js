// Single source of truth for the "wasla" text logo's color split — only
// the W is accented, "asla" inherits whatever color the caller's wrapper
// already sets (white on the dark brand-700 bars, brand-600 in the
// footer). Was previously copy-pasted per render site with the split
// backwards in most places and one stray text-yellow-300 instead of
// text-accent-300 — this is what "everywhere the wordmark renders" stays
// consistent going forward.
export default function Wordmark({ accentClassName = 'text-accent-300' }) {
  return (
    <>
      <span className={accentClassName}>W</span>asla
    </>
  )
}
