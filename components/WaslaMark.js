// Shared monoline brand mark — a jabana (Sudanese coffee pot), the same
// cultural motif DECISIONS.md names for the brand's primary color
// ("jabana coffee brown") and the signature element this redesign leans
// into. One path per pot feature (base, body, neck/lid, lid knob, spout,
// handle) so a caller can animate them as a stroke-draw sequence (see
// components/WaslaLogo.js) or just render the whole mark statically, e.g.
// as a quiet background watermark.
//
// viewBox is a fixed 200x200 regardless of render size — scale via the
// wrapping element's width/height, not by changing these coordinates.
export const JABANA_PATHS = [
  'M72 178 Q100 186 128 178', // base
  'M72 178 C58 160 52 135 58 112 C64 88 80 72 100 70 C120 72 136 88 142 112 C148 135 142 160 128 178', // body
  'M86 71 C86 60 90 52 100 50 C110 52 114 60 114 71', // neck
  'M82 52 Q100 44 118 52', // lid
  'M138 108 C156 100 169 86 176 66', // spout
  'M60 100 C40 96 32 82 40 68 C46 58 58 56 64 64', // handle
]

export default function WaslaMark({ className = 'w-full h-full', strokeWidth = 5 }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {JABANA_PATHS.map((d, i) => <path key={i} d={d} />)}
      <circle cx="100" cy="44" r="5" fill="currentColor" stroke="none" />
    </svg>
  )
}
