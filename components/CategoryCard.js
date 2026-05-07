import Link from 'next/link'

// Short text labels rendered inside a colored circle as the category icon
const ABBR = {
  'Devices':                'DEV',
  'Disposables':            'DIS',
  'Juices & E-Liquids':     'JCE',
  'Spareparts':             'SPA',
  'Other Smoking Products': 'OTH',
}

// Per-category gradient + border colour
const GRADIENT = {
  'Devices':                'from-purple-50 to-purple-100 border-purple-200 hover:border-purple-300',
  'Disposables':            'from-purple-50   to-purple-100   border-purple-200   hover:border-purple-300',
  'Juices & E-Liquids':     'from-blue-50   to-blue-100   border-blue-200   hover:border-blue-300',
  'Spareparts':             'from-yellow-50 to-yellow-100 border-yellow-200 hover:border-yellow-300',
  'Other Smoking Products': 'from-gray-50   to-gray-100   border-gray-200   hover:border-gray-300',
}

// Badge colour for the abbreviation circle
const BADGE = {
  'Devices':                'bg-purple-200 text-purple-700',
  'Disposables':            'bg-purple-200   text-purple-700',
  'Juices & E-Liquids':     'bg-blue-200   text-blue-700',
  'Spareparts':             'bg-yellow-200 text-yellow-700',
  'Other Smoking Products': 'bg-gray-200   text-gray-600',
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
