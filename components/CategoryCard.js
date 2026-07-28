import Link from 'next/link'

// Short text labels rendered inside a colored circle as the category icon
const ABBR = {
  'Coffee & Jabana':        'COF',
  'Tea & Drinks':           'TEA',
  'Spices & Seasonings':    'SPC',
  'Heritage Clothing':      'CLO',
  'Homeware & Handicrafts': 'HOM',
}

// Per-category gradient + border colour
const GRADIENT = {
  'Coffee & Jabana':        'from-purple-50 to-purple-100 border-purple-200 hover:border-purple-300',
  'Tea & Drinks':           'from-blue-50   to-blue-100   border-blue-200   hover:border-blue-300',
  'Spices & Seasonings':    'from-yellow-50 to-yellow-100 border-yellow-200 hover:border-yellow-300',
  'Heritage Clothing':      'from-amber-50  to-amber-100  border-amber-200  hover:border-amber-300',
  'Homeware & Handicrafts': 'from-gray-50   to-gray-100   border-gray-200   hover:border-gray-300',
}

// Badge colour for the abbreviation circle
const BADGE = {
  'Coffee & Jabana':        'bg-purple-200 text-purple-700',
  'Tea & Drinks':           'bg-blue-200   text-blue-700',
  'Spices & Seasonings':    'bg-yellow-200 text-yellow-700',
  'Heritage Clothing':      'bg-amber-200  text-amber-700',
  'Homeware & Handicrafts': 'bg-gray-200   text-gray-600',
}

export default function CategoryCard({ name, count }) {
  const gradient = GRADIENT[name] ?? 'from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300'
  const badge    = BADGE[name]    ?? 'bg-gray-200 text-gray-600'
  const abbr     = ABBR[name]     ?? name.slice(0, 3).toUpperCase()

  return (
    <Link
      href={`/products?category=${encodeURIComponent(name)}`}
      className={`flex flex-col items-center gap-3 bg-linear-to-br ${gradient} border rounded-2xl p-5 hover:shadow-md transition-all duration-200`}
    >
      <div className={`w-14 h-14 rounded-2xl ${badge} flex items-center justify-center`}>
        <span className="text-xs font-black tracking-wider select-none">{abbr}</span>
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-800 text-sm leading-tight">{name}</p>
        {count != null && (
          <p className="text-xs text-gray-500 mt-0.5">{count} product{count !== 1 ? 's' : ''}</p>
        )}
      </div>
    </Link>
  )
}
